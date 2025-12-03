import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { eq, and, isNull, lte, gte } from 'drizzle-orm';
import { db, players, campaigns } from '@mctrack/db';
import { query, insert } from '@mctrack/db/clickhouse';
import { Platform, BedrockDevice } from '@mctrack/shared';
import { apiKeyAuth, AuthenticatedRequest } from '../middleware/api-key-auth.js';
import { ApiError } from '../middleware/error-handler.js';
import { addSession, addGamemodeSession } from '../buffer/index.js';
import { redis } from '../lib/redis.js';

const router: IRouter = Router();

// Convert Date to ClickHouse DateTime format: "2025-12-03 00:49:40"
function formatDateTimeForClickHouse(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

/**
 * Get API key info (for plugins to fetch gamemodeId on startup)
 * GET /session/auth
 */
router.get('/auth', apiKeyAuth, async (req, res, next) => {
  try {
    const { networkId, gamemodeId, apiKeyId } = req as AuthenticatedRequest;

    let gamemodeName: string | null = null;
    if (gamemodeId) {
      // Fetch gamemode name from PostgreSQL
      const { db, gamemodes } = await import('@mctrack/db');
      const { eq } = await import('drizzle-orm');
      const gamemode = await db.query.gamemodes.findFirst({
        where: eq(gamemodes.id, gamemodeId),
        columns: { name: true },
      });
      gamemodeName = gamemode?.name || null;
    }

    res.json({
      success: true,
      networkId,
      gamemodeId, // null if API key is not scoped to a gamemode
      gamemodeName,
      apiKeyId,
    });
  } catch (error) {
    next(error);
  }
});

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
      last_heartbeat: now,
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
      UPDATE end_time = '${formatDateTimeForClickHouse(now)}'
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

    // Add gamemode session to buffer
    addGamemodeSession({
      gamemode_id: data.gamemodeId,
      session_uuid: randomUUID(),
      player_uuid: session.player_uuid,
      server_name: data.serverName || null,
      ip_address: session.ip_address,
      player_country: session.player_country,
      start_time: now,
      end_time: null,
    });

    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Batch events from plugin
 * POST /session/batch
 *
 * Accepts format from MCTrack plugin:
 * {
 *   sessionStarts: [...],           // Network session starts (proxy or no-proxy mode)
 *   sessionEnds: [...],             // Network session ends
 *   heartbeats: [...],              // Session heartbeats
 *   serverSwitches: [...],          // Server switch events (proxy)
 *   gamemodeChanges: [...],         // Vanilla MC gamemode changes (legacy)
 *   gamemodeSessionStarts: [...],   // MCTrack gamemode session starts (Spigot)
 *   gamemodeSessionEnds: [...],     // MCTrack gamemode session ends (Spigot)
 *   payments: [...]                 // Payment events
 * }
 */
router.post('/batch', apiKeyAuth, async (req, res, next) => {
  try {
    const { networkId, gamemodeId } = req as AuthenticatedRequest;
    const {
      sessionStarts = [],
      sessionEnds = [],
      heartbeats = [],
      serverSwitches = [],
      gamemodeChanges = [],
      gamemodeSessionStarts = [],
      gamemodeSessionEnds = [],
      payments = [],
    } = req.body;

    const totalEvents = sessionStarts.length + sessionEnds.length + heartbeats.length +
      serverSwitches.length + gamemodeChanges.length + gamemodeSessionStarts.length +
      gamemodeSessionEnds.length + payments.length;

    if (totalEvents === 0) {
      // Empty batch is ok, just return success
      return res.json({ success: true, processed: 0 });
    }

    if (totalEvents > 100) {
      throw new ApiError(400, 'BATCH_TOO_LARGE', 'Maximum 100 events per batch');
    }

    let processed = 0;

    // Process session starts
    for (const event of sessionStarts) {
      try {
        const sessionUuid = event.sessionUuid || randomUUID();
        const cleanUuid = (event.playerUuid || '').replace(/-/g, '');
        const playerCountry = await getCountryFromIp(event.ipAddress || '0.0.0.0');
        const now = event.timestamp ? new Date(event.timestamp) : new Date();

        // Add session to buffer for ClickHouse
        addSession({
          network_id: networkId,
          session_uuid: sessionUuid,
          player_uuid: cleanUuid,
          proxy_id: null,
          gamemode_id: null,
          domain: event.joinDomain || event.domain || '',
          ip_address: event.ipAddress || '0.0.0.0',
          player_country: playerCountry,
          platform: (event.platform?.toLowerCase() || 'java') as 'java' | 'bedrock',
          bedrock_device: event.bedrockDevice || null,
          start_time: now,
          end_time: null,
          last_heartbeat: now,
        });

        // Store session in Redis for quick lookup on end
        await redis.setex(
          `session:${sessionUuid}`,
          86400,
          JSON.stringify({ networkId, startTime: now.toISOString(), playerUuid: cleanUuid })
        );

        // Upsert player in PostgreSQL
        if (cleanUuid && event.playerName) {
          upsertPlayer(networkId, cleanUuid, {
            playerUuid: cleanUuid,
            playerName: event.playerName,
            domain: event.joinDomain || event.domain || '',
            ipAddress: event.ipAddress || '0.0.0.0',
            platform: (event.platform?.toLowerCase() || 'java') as 'java' | 'bedrock',
            bedrockDevice: event.bedrockDevice,
          }, playerCountry).catch(() => {});
        }

        processed++;
      } catch (err) {
        // Log error but continue processing other events
        console.error('Error processing session start:', err);
      }
    }

    // Process session ends
    for (const event of sessionEnds) {
      try {
        const now = event.timestamp ? new Date(event.timestamp) : new Date();

        // Update session end time in ClickHouse
        if (event.sessionUuid) {
          await query(`
            ALTER TABLE network_sessions
            UPDATE end_time = '${formatDateTimeForClickHouse(now)}'
            WHERE session_uuid = '${event.sessionUuid}'
          `);

          // Remove from Redis
          await redis.del(`session:${event.sessionUuid}`);
        }

        processed++;
      } catch (err) {
        console.error('Error processing session end:', err);
      }
    }

    // Process heartbeats - update last_heartbeat to keep sessions alive
    for (const event of heartbeats) {
      try {
        const now = event.timestamp ? new Date(event.timestamp) : new Date();

        if (event.sessionUuid) {
          // Update last_heartbeat in ClickHouse
          await query(`
            ALTER TABLE network_sessions
            UPDATE last_heartbeat = '${formatDateTimeForClickHouse(now)}'
            WHERE session_uuid = '${event.sessionUuid}'
          `);

          // Refresh TTL in Redis
          await redis.expire(`session:${event.sessionUuid}`, 86400);
        }

        processed++;
      } catch (err) {
        console.error('Error processing heartbeat:', err);
        processed++; // Still count as processed
      }
    }

    // Process server switches (when players move between backend servers)
    for (const event of serverSwitches) {
      try {
        if (event.sessionUuid && event.toServer) {
          // Get session data from Redis
          const sessionData = await redis.get(`session:${event.sessionUuid}`);
          if (sessionData) {
            const parsed = JSON.parse(sessionData);
            const now = event.timestamp ? new Date(event.timestamp) : new Date();

            // If we have a gamemodeId (from API key), create a gamemode session
            if (event.gamemodeId) {
              addGamemodeSession({
                gamemode_id: event.gamemodeId,
                session_uuid: randomUUID(),
                player_uuid: parsed.playerUuid || '',
                server_name: event.toServer,
                ip_address: event.ipAddress || '0.0.0.0',
                player_country: event.playerCountry || 'XX',
                start_time: now,
                end_time: null,
              });
            }

            // Update network session's gamemode_id if provided
            if (event.gamemodeId) {
              await query(`
                ALTER TABLE network_sessions
                UPDATE gamemode_id = '${event.gamemodeId}'
                WHERE session_uuid = '${event.sessionUuid}'
              `);
            }
          }
        }
        processed++;
      } catch (err) {
        console.error('Error processing server switch:', err);
        processed++;
      }
    }

    // Process gamemode changes (Minecraft's SURVIVAL/CREATIVE/etc - not MCTrack gamemodes)
    for (const event of gamemodeChanges) {
      // These are vanilla Minecraft gamemode changes (SURVIVAL, CREATIVE, etc.)
      // Just log them for now - could be used for analytics later
      void event;
      processed++;
    }

    // Process payments
    for (const event of payments) {
      try {
        if (event.paymentUuid && event.amount) {
          await insert('payments', [{
            network_id: networkId,
            payment_uuid: event.paymentUuid || randomUUID(),
            merchant_payment_id: event.merchantPaymentId || '',
            player_name: event.playerName || '',
            player_uuid: event.playerUuid?.replace(/-/g, '') || null,
            platform: (event.platform?.toLowerCase() || 'java') as 'java' | 'bedrock',
            bedrock_device: event.bedrockDevice || null,
            country: event.country || 'XX',
            amount: event.amount,
            currency: event.currency || 'USD',
            timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
            products_dump_json: JSON.stringify(event.products || []),
          }]);
        }
        processed++;
      } catch (err) {
        console.error('Error processing payment:', err);
      }
    }

    // Process gamemode session starts
    for (const event of gamemodeSessionStarts) {
      try {
        const sessionUuid = event.sessionUuid || randomUUID();
        const cleanUuid = (event.playerUuid || '').replace(/-/g, '');
        const playerCountry = await getCountryFromIp(event.ipAddress || '0.0.0.0');
        const now = event.timestamp ? new Date(event.timestamp) : new Date();

        // Use gamemodeId from event or from API key
        const effectiveGamemodeId = event.gamemodeId || gamemodeId;
        if (!effectiveGamemodeId) {
          console.warn('Gamemode session start without gamemodeId, skipping');
          continue;
        }

        // Add gamemode session to buffer
        addGamemodeSession({
          gamemode_id: effectiveGamemodeId,
          session_uuid: sessionUuid,
          player_uuid: cleanUuid,
          server_name: event.serverName || null,
          ip_address: event.ipAddress || '0.0.0.0',
          player_country: playerCountry,
          start_time: now,
          end_time: null,
        });

        // Store gamemode session in Redis for quick lookup on end
        await redis.setex(
          `gamemode_session:${sessionUuid}`,
          86400, // 24 hours
          JSON.stringify({ gamemodeId: effectiveGamemodeId, startTime: now.toISOString(), playerUuid: cleanUuid })
        );

        processed++;
      } catch (err) {
        console.error('Error processing gamemode session start:', err);
      }
    }

    // Process gamemode session ends
    for (const event of gamemodeSessionEnds) {
      try {
        const now = event.timestamp ? new Date(event.timestamp) : new Date();

        if (event.sessionUuid) {
          // Update gamemode session end time in ClickHouse
          await query(`
            ALTER TABLE gamemode_sessions
            UPDATE end_time = '${formatDateTimeForClickHouse(now)}'
            WHERE session_uuid = '${event.sessionUuid}'
          `);

          // Remove from Redis
          await redis.del(`gamemode_session:${event.sessionUuid}`);
        }

        processed++;
      } catch (err) {
        console.error('Error processing gamemode session end:', err);
      }
    }

    res.json({ success: true, processed });
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
    // New player - check for matching campaign
    const campaignId = await findMatchingCampaign(networkId, data.domain);

    // Insert new player
    await db.insert(players).values({
      networkId,
      playerUuid,
      playerName: data.playerName,
      platform: data.platform,
      bedrockDevice: data.bedrockDevice || null,
      country,
      campaignId,
      firstSeen: new Date(),
      lastSeen: new Date(),
    });
  }
}

/**
 * Find an active campaign that matches the player's join domain
 */
async function findMatchingCampaign(
  networkId: string,
  domain: string
): Promise<string | null> {
  if (!domain) return null;

  const now = new Date();

  // Find active campaigns for this network where domain matches
  const activeCampaigns = await db.query.campaigns.findMany({
    where: and(
      eq(campaigns.networkId, networkId),
      isNull(campaigns.archivedAt),
      lte(campaigns.startTime, now),
      gte(campaigns.endTime, now)
    ),
    columns: {
      id: true,
      domainFilter: true,
    },
  });

  // Check if any campaign's domain filter matches
  for (const campaign of activeCampaigns) {
    if (domainMatches(domain, campaign.domainFilter)) {
      return campaign.id;
    }
  }

  return null;
}

/**
 * Check if a domain matches a filter pattern
 * Supports exact match and wildcard prefix (*.example.com)
 */
function domainMatches(domain: string, filter: string): boolean {
  const normalizedDomain = domain.toLowerCase();
  const normalizedFilter = filter.toLowerCase();

  // Exact match
  if (normalizedDomain === normalizedFilter) {
    return true;
  }

  // Wildcard match (*.example.com matches sub.example.com)
  if (normalizedFilter.startsWith('*.')) {
    const suffix = normalizedFilter.slice(1); // .example.com
    return normalizedDomain.endsWith(suffix);
  }

  // Subdomain match (example.com matches sub.example.com)
  if (normalizedDomain.endsWith('.' + normalizedFilter)) {
    return true;
  }

  return false;
}

export { router as sessionRouter };
