import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db, apiKeys } from '@mctrack/db';
import { Permission, generateApiKey, hashApiKey, getApiKeyPrefix } from '@mctrack/shared';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validateBody } from '../middleware/validate.js';
import { ApiError } from '../middleware/error-handler.js';

const router: IRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /networks/{networkId}/api-keys:
 *   get:
 *     summary: List all API keys for a network
 *     tags: [API Keys]
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permission.MANAGE_API_KEYS),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;

      const keys = await db.query.apiKeys.findMany({
        where: and(
          eq(apiKeys.networkId, networkId),
          isNull(apiKeys.revokedAt)
        ),
        columns: {
          id: true,
          name: true,
          keyPrefix: true,
          gamemodeId: true,
          lastUsedAt: true,
          createdAt: true,
        },
        with: {
          gamemode: {
            columns: { id: true, name: true },
          },
        },
      });

      res.json({ keys });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/api-keys:
 *   post:
 *     summary: Create a new API key
 *     tags: [API Keys]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               gamemodeId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: API key created (full key shown only once)
 */
const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  gamemodeId: z.string().uuid().nullable().optional(),
});

router.post(
  '/',
  authenticate,
  requirePermission(Permission.MANAGE_API_KEYS),
  validateBody(createKeySchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { name, gamemodeId } = req.body;

      // Generate key
      const key = generateApiKey();
      const keyHash = hashApiKey(key);
      const keyPrefix = getApiKeyPrefix(key);

      const [apiKey] = await db
        .insert(apiKeys)
        .values({
          networkId,
          name,
          gamemodeId: gamemodeId || null,
          keyHash,
          keyPrefix,
        })
        .returning({
          id: apiKeys.id,
          name: apiKeys.name,
        });

      // Return full key only on creation
      res.status(201).json({
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          key, // Full key - only shown once!
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/api-keys/{keyId}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [API Keys]
 */
router.delete(
  '/:keyId',
  authenticate,
  requirePermission(Permission.MANAGE_API_KEYS),
  async (req, res, next) => {
    try {
      const { networkId, keyId } = req.params;

      const [key] = await db
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.networkId, networkId)
        ))
        .returning();

      if (!key) {
        throw new ApiError(404, 'API_KEY_NOT_FOUND', 'API key not found');
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export { router as apiKeysRouter };
