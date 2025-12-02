import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db, players } from '@mctrack/db';
import { query, insert } from '@mctrack/db/clickhouse';
import { Platform, BedrockDevice } from '@mctrack/shared';
import { apiKeyAuth, AuthenticatedRequest } from '../middleware/api-key-auth.js';
import { ApiError } from '../middleware/error-handler.js';
import { addSession } from '../buffer/index.js';
import { redis } from '../lib/redis.js';

const router: IRouter = Router();

// Validation schemas
const sessionStartSchema = z.object({
  playerUuid: z.string().min(32).max(36),
  playerName: z.string().min(1).max(16),
  domain: z.string().min(1).max(255),
  ipAddress: z.string().ip(),
  platform: z.enum([Platform.JAVA, Platform.BEDROCK]),
  bedrockDevice: z.enum([
    BedrockDevice.ANDROID,
    BedrockDevice.IOS,
    BedrockDevice.WINDOWS,
    BedrockDevice.PLAYSTATION,
    BedrockDevice.XBOX,
    BedrockDevice.SWITCH,
  ]).optional(),
});

const sessionEndSchema = z.object({
  sessionUuid: z.string().uuid(),
});

const gamemodeSessionSchema = z.object({
  sessionUuid: z.string().uuid(),
  gamemodeId: z.string().uuid(),
  serverName: z.string().max(100).optional(),
});

/**
 * Start a new session
 * POST /session/start
 */
router.post('/start', apiKeyAuth, async (req, res, next) => {
  try {
    const { networkId, gamemodeId } = req as AuthenticatedRequest;
    const data = sessionStartSchema.parse(req.body);

    const sessionUuid = randomUUID();
    const now = new Date();

    // Get country from IP (simplified - in production use MaxMind or similar)
    const playerCountry = await getCountryFromIp(data.ipAddress);

    // Clean UUID
    const cleanUuid = data.playerUuid.replace(/-/g, '');

    // Add session to buffer
    addSession({
      network_id: networkId,
      session_uuid: sessionUuid,
      player_uuid: cleanUuid,
      proxy_id: null,
      gamemode_id: gamemodeId,
      domain: data.domain,
      ip_address: data.ipAddress,
      player_country: playerCountry,
      platform: data.platform,
      bedrock_device: data.bedrockDevice || null,
      start_time: now,
      end_time: null,
    });

    // Store session in Redis for quick lookup on end
    await redis.setex(
      `session:${sessionUuid}`,
      86400, // 24 hours
      JSON.stringify({ networkId, startTime: now.toISOString() })
    );

    // Upsert player in PostgreSQL (async, don't block response)
    upsertPlayer(networkId, cleanUuid, data, playerCountry).catch(() => {});

    res.status(201).json({ sessionUuid });
  } catch (error) {
    next(error);
  }
});

/**
 * End a session
 * POST /session/end
 */
router.post('/end', apiKeyAuth, async (req, res, next) => {
  try {
    const data = sessionEndSchema.parse(req.body);
    const now = new Date();

    // Get session from Redis
    const sessionData = await redis.get(`session:${data.sessionUuid}`);
    if (!sessionData) {
      throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session not found');
    }

    // Update session end time in ClickHouse
    await query(`
      ALTER TABLE network_sessions
      UPDATE end_time = '${now.toISOString()}'
      WHERE session_uuid = '${data.sessionUuid}'
    `);

    // Remove from Redis
    await redis.del(`session:${data.sessionUuid}`);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Record a gamemode session (player switches server)
 * POST /session/gamemode
 */
router.post('/gamemode', apiKeyAuth, async (req, res, next) => {
  try {
    const { networkId: _networkId } = req as AuthenticatedRequest;
    const data = gamemodeSessionSchema.parse(req.body);
    const now = new Date();

    // Get session data
    const sessionData = await redis.get(`session:${data.sessionUuid}`);
    if (!sessionData) {
      throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session not found');
    }

    // Get player info from the network session
    const [session] = await query<{
      player_uuid: string;
      ip_address: string;
      player_country: string;
    }>(`
      SELECT player_uuid, ip_address, player_country
      FROM network_sessions
      WHERE session_uuid = '${data.sessionUuid}'
      LIMIT 1
    `);

    if (!session) {
      throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session not found');
    }

    // Insert gamemode session
    await insert('gamemode_sessions', [{
      gamemode_id: data.gamemodeId,
      session_uuid: randomUUID(),
      player_uuid: session.player_uuid,
      server_name: data.serverName || null,
      ip_address: session.ip_address,
      player_country: session.player_country,
      start_time: now,
      end_time: null,
    }]);

    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Batch events
 * POST /session/batch
 */
router.post('/batch', apiKeyAuth, async (req, res, next) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      throw new ApiError(400, 'INVALID_BATCH', 'Events array required');
    }

    if (events.length > 100) {
      throw new ApiError(400, 'BATCH_TOO_LARGE', 'Maximum 100 events per batch');
    }

    const results: { index: number; success: boolean; error?: string }[] = [];

    for (let i = 0; i < events.length; i++) {
      try {
        // Process each event based on type
        // In production, batch these for efficiency
        void events[i]; // TODO: implement event processing
        results.push({ index: i, success: true });
      } catch (err) {
        results.push({
          index: i,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    res.json({ results });
  } catch (error) {
    next(error);
  }
});

// Helper functions

async function getCountryFromIp(_ip: string): Promise<string> {
  // In production, use MaxMind GeoIP2 or similar
  // For now, return unknown
  return 'XX';
}

async function upsertPlayer(
  networkId: string,
  playerUuid: string,
  data: z.infer<typeof sessionStartSchema>,
  country: string
): Promise<void> {
  const existing = await db.query.players.findFirst({
    where: and(
      eq(players.networkId, networkId),
      eq(players.playerUuid, playerUuid)
    ),
  });

  if (existing) {
    // Update last seen
    await db
      .update(players)
      .set({
        playerName: data.playerName,
        lastSeen: new Date(),
      })
      .where(and(
        eq(players.networkId, networkId),
        eq(players.playerUuid, playerUuid)
      ));
  } else {
    // Insert new player
    await db.insert(players).values({
      networkId,
      playerUuid,
      playerName: data.playerName,
      platform: data.platform,
      bedrockDevice: data.bedrockDevice || null,
      country,
      firstSeen: new Date(),
      lastSeen: new Date(),
    });
  }
}

export { router as sessionRouter };
