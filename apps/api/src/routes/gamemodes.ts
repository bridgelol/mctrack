import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, gamemodes } from '@mctrack/db';
import { query } from '@mctrack/db/clickhouse';
import { Permission } from '@mctrack/shared';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { ApiError } from '../middleware/error-handler.js';

const router: IRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /networks/{networkId}/gamemodes:
 *   get:
 *     summary: List all gamemodes for a network
 *     tags: [Gamemodes]
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permission.VIEW_DASHBOARD),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;

      const gamemodeList = await db.query.gamemodes.findMany({
        where: eq(gamemodes.networkId, networkId),
        orderBy: (g, { asc }) => [asc(g.name)],
      });

      res.json({ gamemodes: gamemodeList });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/gamemodes:
 *   post:
 *     summary: Create a new gamemode
 *     tags: [Gamemodes]
 */
const createGamemodeSchema = z.object({
  name: z.string().min(1).max(100),
});

router.post(
  '/',
  authenticate,
  requirePermission(Permission.MANAGE_GAMEMODES),
  validateBody(createGamemodeSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { name } = req.body;

      const [gamemode] = await db
        .insert(gamemodes)
        .values({
          networkId,
          name,
        })
        .returning();

      res.status(201).json({ gamemode });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/gamemodes/{gamemodeId}:
 *   patch:
 *     summary: Update a gamemode
 *     tags: [Gamemodes]
 */
router.patch(
  '/:gamemodeId',
  authenticate,
  requirePermission(Permission.MANAGE_GAMEMODES),
  validateBody(createGamemodeSchema.partial()),
  async (req, res, next) => {
    try {
      const { networkId, gamemodeId } = req.params;

      const [gamemode] = await db
        .update(gamemodes)
        .set(req.body)
        .where(and(
          eq(gamemodes.id, gamemodeId),
          eq(gamemodes.networkId, networkId)
        ))
        .returning();

      if (!gamemode) {
        throw new ApiError(404, 'GAMEMODE_NOT_FOUND', 'Gamemode not found');
      }

      res.json({ gamemode });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/gamemodes/{gamemodeId}:
 *   delete:
 *     summary: Delete a gamemode
 *     tags: [Gamemodes]
 */
router.delete(
  '/:gamemodeId',
  authenticate,
  requirePermission(Permission.MANAGE_GAMEMODES),
  async (req, res, next) => {
    try {
      const { networkId, gamemodeId } = req.params;

      const [gamemode] = await db
        .delete(gamemodes)
        .where(and(
          eq(gamemodes.id, gamemodeId),
          eq(gamemodes.networkId, networkId)
        ))
        .returning();

      if (!gamemode) {
        throw new ApiError(404, 'GAMEMODE_NOT_FOUND', 'Gamemode not found');
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/gamemodes/analytics:
 *   get:
 *     summary: Get analytics overview for all gamemodes
 *     tags: [Gamemodes]
 */
const dateRangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.get(
  '/analytics',
  authenticate,
  requirePermission(Permission.VIEW_DASHBOARD),
  validateQuery(dateRangeSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { start, end } = req.query as z.infer<typeof dateRangeSchema>;

      // Get all gamemodes for the network
      const gamemodeList = await db.query.gamemodes.findMany({
        where: eq(gamemodes.networkId, networkId),
      });

      if (gamemodeList.length === 0) {
        return res.json({ gamemodes: [] });
      }

      const gamemodeIds = gamemodeList.map(g => g.id);

      // Get stats for each gamemode
      const stats = await query<{
        gamemode_id: string;
        unique_players: number;
        total_sessions: number;
        total_playtime_minutes: number;
      }>(`
        SELECT
          gamemode_id,
          uniq(player_uuid) as unique_players,
          count() as total_sessions,
          sum(if(end_time IS NOT NULL, dateDiff('minute', start_time, end_time), 0)) as total_playtime_minutes
        FROM gamemode_sessions
        WHERE gamemode_id IN (${gamemodeIds.map(id => `'${id}'`).join(',')})
          AND toDate(start_time) >= '${start}'
          AND toDate(start_time) <= '${end}'
        GROUP BY gamemode_id
      `);

      // Map stats to gamemodes
      const result = gamemodeList.map(gamemode => {
        const gamemodeStats = stats.find(s => s.gamemode_id === gamemode.id);
        return {
          id: gamemode.id,
          name: gamemode.name,
          uniquePlayers: Number(gamemodeStats?.unique_players || 0),
          totalSessions: Number(gamemodeStats?.total_sessions || 0),
          avgSessionDuration: gamemodeStats && gamemodeStats.total_sessions > 0
            ? Number(gamemodeStats.total_playtime_minutes) / Number(gamemodeStats.total_sessions) * 60
            : 0, // in seconds
          totalPlaytime: Number(gamemodeStats?.total_playtime_minutes || 0), // in minutes
        };
      });

      res.json({ gamemodes: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/gamemodes/{gamemodeId}/analytics:
 *   get:
 *     summary: Get detailed analytics for a specific gamemode
 *     tags: [Gamemodes]
 */
router.get(
  '/:gamemodeId/analytics',
  authenticate,
  requirePermission(Permission.VIEW_DASHBOARD),
  validateQuery(dateRangeSchema),
  async (req, res, next) => {
    try {
      const { networkId, gamemodeId } = req.params;
      const { start, end } = req.query as z.infer<typeof dateRangeSchema>;

      // Verify gamemode exists and belongs to network
      const gamemode = await db.query.gamemodes.findFirst({
        where: and(
          eq(gamemodes.id, gamemodeId),
          eq(gamemodes.networkId, networkId)
        ),
      });

      if (!gamemode) {
        throw new ApiError(404, 'GAMEMODE_NOT_FOUND', 'Gamemode not found');
      }

      // Get overview stats
      const [overviewStats] = await query<{
        unique_players: number;
        total_sessions: number;
        total_playtime_minutes: number;
      }>(`
        SELECT
          uniq(player_uuid) as unique_players,
          count() as total_sessions,
          sum(if(end_time IS NOT NULL, dateDiff('minute', start_time, end_time), 0)) as total_playtime_minutes
        FROM gamemode_sessions
        WHERE gamemode_id = '${gamemodeId}'
          AND toDate(start_time) >= '${start}'
          AND toDate(start_time) <= '${end}'
      `);

      // Get peak CCU
      const [ccuStats] = await query<{ peak_ccu: number }>(`
        SELECT max(concurrent) as peak_ccu
        FROM (
          SELECT
            toStartOfMinute(start_time) as minute,
            uniq(session_uuid) as concurrent
          FROM gamemode_sessions
          WHERE gamemode_id = '${gamemodeId}'
            AND toDate(start_time) >= '${start}'
            AND toDate(start_time) <= '${end}'
          GROUP BY minute
        )
      `);

      // Get daily activity
      const dailyActivity = await query<{
        date: string;
        players: number;
        sessions: number;
      }>(`
        SELECT
          toDate(start_time) as date,
          uniq(player_uuid) as players,
          count() as sessions
        FROM gamemode_sessions
        WHERE gamemode_id = '${gamemodeId}'
          AND toDate(start_time) >= '${start}'
          AND toDate(start_time) <= '${end}'
        GROUP BY date
        ORDER BY date
      `);

      // Get hourly activity pattern
      const hourlyActivity = await query<{
        hour: number;
        sessions: number;
      }>(`
        SELECT
          toHour(start_time) as hour,
          count() as sessions
        FROM gamemode_sessions
        WHERE gamemode_id = '${gamemodeId}'
          AND toDate(start_time) >= '${start}'
          AND toDate(start_time) <= '${end}'
        GROUP BY hour
        ORDER BY hour
      `);

      // Get server distribution
      const serverDistribution = await query<{
        server_name: string;
        sessions: number;
        players: number;
      }>(`
        SELECT
          server_name,
          count() as sessions,
          uniq(player_uuid) as players
        FROM gamemode_sessions
        WHERE gamemode_id = '${gamemodeId}'
          AND toDate(start_time) >= '${start}'
          AND toDate(start_time) <= '${end}'
          AND server_name IS NOT NULL
          AND server_name != ''
        GROUP BY server_name
        ORDER BY sessions DESC
        LIMIT 10
      `);

      res.json({
        gamemode: {
          id: gamemode.id,
          name: gamemode.name,
        },
        overview: {
          uniquePlayers: Number(overviewStats?.unique_players || 0),
          totalSessions: Number(overviewStats?.total_sessions || 0),
          avgSessionDuration: overviewStats && overviewStats.total_sessions > 0
            ? Number(overviewStats.total_playtime_minutes) / Number(overviewStats.total_sessions) * 60
            : 0,
          totalPlaytime: Number(overviewStats?.total_playtime_minutes || 0),
          peakCcu: Number(ccuStats?.peak_ccu || 0),
        },
        dailyActivity: dailyActivity.map(d => ({
          name: d.date,
          players: Number(d.players),
          sessions: Number(d.sessions),
        })),
        hourlyActivity: hourlyActivity.map(d => ({
          name: `${d.hour}:00`,
          sessions: Number(d.sessions),
        })),
        serverDistribution: serverDistribution.map(s => ({
          name: s.server_name,
          sessions: Number(s.sessions),
          players: Number(s.players),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as gamemodesRouter };
