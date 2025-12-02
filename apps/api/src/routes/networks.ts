import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, networks, networkRoles, networkMembers } from '@mctrack/db';
import { PermissionGroups } from '@mctrack/shared';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ApiError } from '../middleware/error-handler.js';

const router: IRouter = Router();

/**
 * @swagger
 * /networks:
 *   get:
 *     summary: Get all networks for the current user
 *     tags: [Networks]
 *     responses:
 *       200:
 *         description: List of networks
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;

    // Get owned networks
    const ownedNetworks = await db.query.networks.findMany({
      where: eq(networks.ownerId, userId),
    });

    const ownedNetworkIds = new Set(ownedNetworks.map((n) => n.id));

    // Get member networks (excluding ones user owns)
    const memberships = await db.query.networkMembers.findMany({
      where: eq(networkMembers.userId, userId),
      with: {
        network: true,
        role: true,
      },
    });

    // Filter out networks the user already owns
    const memberNetworks = memberships
      .filter((m) => !ownedNetworkIds.has(m.networkId))
      .map((m) => ({
        ...m.network,
        role: m.role,
        isOwner: false,
      }));

    const allNetworks = [
      ...ownedNetworks.map((n) => ({ ...n, isOwner: true })),
      ...memberNetworks,
    ];

    res.json({ networks: allNetworks });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /networks:
 *   post:
 *     summary: Create a new network
 *     tags: [Networks]
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
 *               timezone:
 *                 type: string
 *                 default: UTC
 *     responses:
 *       201:
 *         description: Network created
 */
const createNetworkSchema = z.object({
  name: z.string().min(1).max(100),
  timezone: z.string().default('UTC'),
});

router.post('/', authenticate, validateBody(createNetworkSchema), async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { name, timezone } = req.body;

    // Create network
    const [network] = await db
      .insert(networks)
      .values({
        name,
        timezone,
        ownerId: userId,
      })
      .returning();

    // Create default roles
    const defaultRoles = [
      {
        networkId: network.id,
        name: 'Admin',
        color: '#ef4444',
        permissions: PermissionGroups.ADMIN,
        isDefault: false,
      },
      {
        networkId: network.id,
        name: 'Moderator',
        color: '#f59e0b',
        permissions: PermissionGroups.MODERATOR,
        isDefault: false,
      },
      {
        networkId: network.id,
        name: 'Viewer',
        color: '#6366f1',
        permissions: PermissionGroups.VIEWER,
        isDefault: true,
      },
    ];

    await db.insert(networkRoles).values(defaultRoles.map(r => ({
      ...r,
      permissions: [...r.permissions],
    })));

    res.status(201).json({ network });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /networks/{networkId}:
 *   get:
 *     summary: Get a specific network
 *     tags: [Networks]
 *     parameters:
 *       - in: path
 *         name: networkId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Network details
 *       404:
 *         description: Network not found
 */
router.get('/:networkId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { networkId } = req.params;

    const network = await db.query.networks.findFirst({
      where: eq(networks.id, networkId),
    });

    if (!network) {
      throw new ApiError(404, 'NETWORK_NOT_FOUND', 'Network not found');
    }

    // Check access
    const isOwner = network.ownerId === userId;
    const membership = await db.query.networkMembers.findFirst({
      where: and(
        eq(networkMembers.networkId, networkId),
        eq(networkMembers.userId, userId)
      ),
    });

    if (!isOwner && !membership) {
      throw new ApiError(404, 'NETWORK_NOT_FOUND', 'Network not found');
    }

    res.json({ network, isOwner });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /networks/{networkId}:
 *   patch:
 *     summary: Update a network
 *     tags: [Networks]
 *     parameters:
 *       - in: path
 *         name: networkId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               timezone:
 *                 type: string
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Network updated
 */
const updateNetworkSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

router.patch('/:networkId', authenticate, validateBody(updateNetworkSchema), async (req, res, next) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { networkId } = req.params;

    const network = await db.query.networks.findFirst({
      where: eq(networks.id, networkId),
    });

    if (!network || network.ownerId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the owner can update network settings');
    }

    const updates: Record<string, unknown> = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.timezone) updates.timezone = req.body.timezone;
    if (req.body.settings) {
      updates.settings = { ...network.settings, ...req.body.settings };
    }

    const [updated] = await db
      .update(networks)
      .set(updates)
      .where(eq(networks.id, networkId))
      .returning();

    res.json({ network: updated });
  } catch (error) {
    next(error);
  }
});

export { router as networksRouter };
