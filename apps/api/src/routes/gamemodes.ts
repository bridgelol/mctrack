import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, gamemodes } from '@mctrack/db';
import { Permission } from '@mctrack/shared';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validateBody } from '../middleware/validate.js';
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

export { router as gamemodesRouter };
