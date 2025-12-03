import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { db, players, gamemodes } from '@mctrack/db';
import { query as chQuery } from '@mctrack/db/clickhouse';
import { Permission } from '@mctrack/shared';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validateQuery } from '../middleware/validate.js';

const router: IRouter = Router({ mergeParams: true });

const listPlayersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  platform: z.enum(['java', 'bedrock', 'all']).optional().default('all'),
  sortBy: z.enum(['lastSeen', 'firstSeen', 'playerName']).optional().default('lastSeen'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * @swagger
 * /networks/{networkId}/players:
 *   get:
 *     summary: List players in a network
 *     tags: [Players]
 *     parameters:
 *       - in: path
 *         name: networkId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [java, bedrock, all]
 *     responses:
 *       200:
 *         description: Paginated player list
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permission.VIEW_PLAYERS),
  validateQuery(listPlayersSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { page, pageSize, platform } = req.query as unknown as z.infer<typeof listPlayersSchema>;

      const offset = (page - 1) * pageSize;

      let whereConditions = [eq(players.networkId, networkId)];

      if (platform !== 'all') {
        whereConditions.push(eq(players.platform, platform));
      }

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(players)
        .where(and(...whereConditions));

      // Get players
      const playerList = await db.query.players.findMany({
        where: and(...whereConditions),
        orderBy: [desc(players.lastSeen)],
        limit: pageSize,
        offset,
      });

      // Get session stats from ClickHouse for these players
      const playerUuids = playerList.map((p) => p.playerUuid);

      let sessionStats: Map<string, { totalSessions: number; totalPlaytime: number; totalSpent: number }> = new Map();

      if (playerUuids.length > 0) {
        // Get session stats
        const stats = await chQuery<{
          player_uuid: string;
          total_sessions: number;
          total_playtime: number;
        }>(`
          SELECT
            player_uuid,
            count() as total_sessions,
            sum(if(end_time IS NOT NULL, dateDiff('minute', start_time, end_time), 0)) as total_playtime
          FROM network_sessions
          WHERE network_id = '${networkId}'
            AND player_uuid IN (${playerUuids.map((u) => `'${u}'`).join(',')})
          GROUP BY player_uuid
        `);

        // Get payment stats
        const paymentStats = await chQuery<{
          player_uuid: string;
          total_spent: number;
        }>(`
          SELECT
            player_uuid,
            sum(amount) as total_spent
          FROM payments
          WHERE network_id = '${networkId}'
            AND player_uuid IN (${playerUuids.map((u) => `'${u}'`).join(',')})
          GROUP BY player_uuid
        `);

        stats.forEach((s) => {
          sessionStats.set(s.player_uuid, {
            totalSessions: Number(s.total_sessions),
            totalPlaytime: Number(s.total_playtime),
            totalSpent: 0,
          });
        });

        paymentStats.forEach((p) => {
          const existing = sessionStats.get(p.player_uuid) || { totalSessions: 0, totalPlaytime: 0, totalSpent: 0 };
          existing.totalSpent = Number(p.total_spent);
          sessionStats.set(p.player_uuid, existing);
        });
      }

      // Merge session stats with player data
      const playersWithStats = playerList.map((player) => {
        const stats = sessionStats.get(player.playerUuid) || { totalSessions: 0, totalPlaytime: 0, totalSpent: 0 };
        return {
          ...player,
          totalSessions: stats.totalSessions,
          totalPlaytime: stats.totalPlaytime,
          totalSpent: stats.totalSpent,
        };
      });

      res.json({
        players: playersWithStats,
        total: Number(count),
        page,
        pageSize,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/players/{playerUuid}:
 *   get:
 *     summary: Get a specific player's details
 *     tags: [Players]
 *     parameters:
 *       - in: path
 *         name: networkId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: playerUuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Player details
 *       404:
 *         description: Player not found
 */
router.get(
  '/:playerUuid',
  authenticate,
  requirePermission(Permission.VIEW_PLAYER_DETAILS),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      // Normalize UUID - remove dashes if present
      const playerUuid = req.params.playerUuid.replace(/-/g, '');

      const player = await db.query.players.findFirst({
        where: and(
          eq(players.networkId, networkId),
          eq(players.playerUuid, playerUuid)
        ),
        with: {
          campaign: true,
        },
      });

      if (!player) {
        return res.status(404).json({
          error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' },
        });
      }

      // Get session stats from ClickHouse
      const [sessionStats] = await chQuery<{
        total_sessions: number;
        total_playtime: number;
        avg_session_length: number;
      }>(`
        SELECT
          count() as total_sessions,
          sum(if(end_time IS NOT NULL, dateDiff('minute', start_time, end_time), 0)) as total_playtime,
          avg(if(end_time IS NOT NULL, dateDiff('minute', start_time, end_time), 0)) as avg_session_length
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND player_uuid = '${playerUuid}'
      `);

      // Get payment stats
      const [paymentStats] = await chQuery<{
        total_spent: number;
        transaction_count: number;
      }>(`
        SELECT
          sum(amount) as total_spent,
          count() as transaction_count
        FROM payments
        WHERE network_id = '${networkId}'
          AND player_uuid = '${playerUuid}'
      `);

      // Get recent sessions
      const recentSessions = await chQuery<{
        session_uuid: string;
        start_time: string;
        end_time: string | null;
        domain: string;
        ip_address: string;
        platform: string;
      }>(`
        SELECT
          session_uuid,
          start_time,
          end_time,
          domain,
          ip_address,
          platform
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND player_uuid = '${playerUuid}'
        ORDER BY start_time DESC
        LIMIT 10
      `);

      // Get recent payments
      const recentPayments = await chQuery<{
        payment_uuid: string;
        amount: number;
        currency: string;
        timestamp: string;
        products_dump_json: string;
      }>(`
        SELECT
          payment_uuid,
          amount,
          currency,
          timestamp,
          products_dump_json
        FROM payments
        WHERE network_id = '${networkId}'
          AND player_uuid = '${playerUuid}'
        ORDER BY timestamp DESC
        LIMIT 10
      `);

      // Get gamemode sessions
      const gamemodeSessions = await chQuery<{
        gamemode_id: string;
        session_uuid: string;
        server_name: string;
        start_time: string;
        end_time: string | null;
      }>(`
        SELECT
          gamemode_id,
          session_uuid,
          server_name,
          start_time,
          end_time
        FROM gamemode_sessions
        WHERE player_uuid = '${playerUuid}'
        ORDER BY start_time DESC
        LIMIT 20
      `);

      // Get gamemode stats for this player
      const gamemodeStats = await chQuery<{
        gamemode_id: string;
        total_sessions: number;
        total_playtime: number;
      }>(`
        SELECT
          gamemode_id,
          count() as total_sessions,
          sum(if(end_time IS NOT NULL, dateDiff('minute', start_time, end_time), 0)) as total_playtime
        FROM gamemode_sessions
        WHERE player_uuid = '${playerUuid}'
        GROUP BY gamemode_id
      `);

      // Get gamemode names from PostgreSQL
      const uniqueGamemodeIds = [...new Set([
        ...gamemodeSessions.map(s => s.gamemode_id),
        ...gamemodeStats.map(s => s.gamemode_id),
      ])].filter(Boolean);

      let gamemodeMap: Map<string, string> = new Map();
      if (uniqueGamemodeIds.length > 0) {
        const gamemodeList = await db.query.gamemodes.findMany({
          where: inArray(gamemodes.id, uniqueGamemodeIds),
        });
        gamemodeList.forEach(g => gamemodeMap.set(g.id, g.name));
      }

      res.json({
        player: {
          ...player,
          stats: {
            totalSessions: Number(sessionStats?.total_sessions || 0),
            totalPlaytime: Number(sessionStats?.total_playtime || 0),
            avgSessionLength: Number(sessionStats?.avg_session_length || 0),
            totalSpent: Number(paymentStats?.total_spent || 0),
            transactionCount: Number(paymentStats?.transaction_count || 0),
          },
          recentSessions: recentSessions.map((s) => ({
            sessionUuid: s.session_uuid,
            startTime: s.start_time,
            endTime: s.end_time,
            domain: s.domain,
            ipAddress: s.ip_address,
            platform: s.platform,
            duration: s.end_time
              ? Math.floor((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000)
              : null,
          })),
          recentPayments: recentPayments.map((p) => ({
            paymentUuid: p.payment_uuid,
            amount: Number(p.amount),
            currency: p.currency,
            timestamp: p.timestamp,
            products: JSON.parse(p.products_dump_json || '[]'),
          })),
          gamemodeStats: gamemodeStats.map((g) => ({
            gamemodeId: g.gamemode_id,
            gamemodeName: gamemodeMap.get(g.gamemode_id) || 'Unknown',
            totalSessions: Number(g.total_sessions),
            totalPlaytime: Number(g.total_playtime),
          })),
          recentGamemodeSessions: gamemodeSessions.map((s) => ({
            sessionUuid: s.session_uuid,
            gamemodeId: s.gamemode_id,
            gamemodeName: gamemodeMap.get(s.gamemode_id) || 'Unknown',
            serverName: s.server_name,
            startTime: s.start_time,
            endTime: s.end_time,
            duration: s.end_time
              ? Math.floor((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000)
              : null,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as playersRouter };
