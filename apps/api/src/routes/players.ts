import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db, players } from '@mctrack/db';
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

      res.json({
        players: playerList,
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
      const { networkId, playerUuid } = req.params;

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

      res.json({ player });
    } catch (error) {
      next(error);
    }
  }
);

export { router as playersRouter };
