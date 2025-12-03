import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { eq, desc, sql, count, and, gte, lte, like, or } from 'drizzle-orm';
import { db, users, networks, subscriptions, players, apiKeys, networkMembers, auditLogs } from '@mctrack/db';
import { query, getClickHouseClient } from '@mctrack/db/clickhouse';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { requireAdmin, adminHandler, AdminRequest } from '../middleware/admin.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { ApiError } from '../middleware/error-handler.js';
import jwt from 'jsonwebtoken';

const router: IRouter = Router();

// ============================================================================
// PLATFORM STATS
// ============================================================================

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get platform-wide statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform statistics
 */
router.get('/stats', authenticate, requireAdmin, adminHandler(async (req, res, next) => {
  try {
    // Users count
    const [usersResult] = await db
      .select({ count: count() })
      .from(users);

    // Networks count
    const [networksResult] = await db
      .select({ count: count() })
      .from(networks);

    // Active subscriptions
    const [subscriptionsResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    // Total API keys
    const [apiKeysResult] = await db
      .select({ count: count() })
      .from(apiKeys);

    // Get total sessions and players from ClickHouse
    const [sessionStats] = await query<{
      total_sessions: number;
      total_players: number;
      total_revenue: number;
    }>(`
      SELECT
        count() as total_sessions,
        uniq(player_uuid) as total_players,
        (SELECT sum(amount) FROM payments) as total_revenue
      FROM network_sessions
    `);

    // Get stats for today
    const [todayStats] = await query<{
      sessions_today: number;
      players_today: number;
      revenue_today: number;
    }>(`
      SELECT
        count() as sessions_today,
        uniq(player_uuid) as players_today,
        (
          SELECT sum(amount)
          FROM payments
          WHERE toDate(timestamp) = today()
        ) as revenue_today
      FROM network_sessions
      WHERE toDate(start_time) = today()
    `);

    // Get current platform CCU
    const [ccuResult] = await query<{ current_ccu: number }>(`
      SELECT count() as current_ccu
      FROM network_sessions
      WHERE end_time IS NULL
        AND last_heartbeat >= now() - INTERVAL 5 MINUTE
    `);

    // New users this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [newUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.signUpTime, weekAgo));

    // New networks this week
    const [newNetworksResult] = await db
      .select({ count: count() })
      .from(networks)
      .where(gte(networks.creationTime, weekAgo));

    res.json({
      users: {
        total: usersResult.count,
        newThisWeek: newUsersResult.count,
      },
      networks: {
        total: networksResult.count,
        newThisWeek: newNetworksResult.count,
      },
      subscriptions: {
        active: subscriptionsResult.count,
      },
      apiKeys: {
        total: apiKeysResult.count,
      },
      analytics: {
        totalSessions: Number(sessionStats?.total_sessions || 0),
        totalPlayers: Number(sessionStats?.total_players || 0),
        totalRevenue: Number(sessionStats?.total_revenue || 0),
        sessionsToday: Number(todayStats?.sessions_today || 0),
        playersToday: Number(todayStats?.players_today || 0),
        revenueToday: Number(todayStats?.revenue_today || 0),
        currentCcu: Number(ccuResult?.current_ccu || 0),
      },
    });
  } catch (error) {
    next(error);
  }
}));

// ============================================================================
// USERS MANAGEMENT
// ============================================================================

const listUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  search: z.string().optional(),
  role: z.enum(['member', 'admin', 'all']).optional().default('all'),
  sort: z.enum(['signUpTime', 'lastLogin', 'email']).optional().default('signUpTime'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users
 *     tags: [Admin]
 */
router.get('/users', authenticate, requireAdmin, validateQuery(listUsersSchema), adminHandler(async (req, res, next) => {
  try {
    const { page, limit, search, role, sort, order } = req.query as z.infer<typeof listUsersSchema>;
    const offset = (page - 1) * limit;

    // Build query
    let query = db.select().from(users);

    // Apply filters
    const conditions = [];
    if (search) {
      conditions.push(or(
        like(users.email, `%${search}%`),
        like(users.username, `%${search}%`)
      ));
    }
    if (role && role !== 'all') {
      conditions.push(eq(users.role, role));
    }

    // Get total count
    const countQuery = db
      .select({ count: count() })
      .from(users);

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }
    const [countResult] = await countQuery;

    // Get users
    const usersQuery = db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        emailVerified: users.emailVerified,
        signUpTime: users.signUpTime,
        lastLogin: users.lastLogin,
      })
      .from(users);

    if (conditions.length > 0) {
      usersQuery.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = sort === 'email' ? users.email : sort === 'lastLogin' ? users.lastLogin : users.signUpTime;
    if (order === 'desc') {
      usersQuery.orderBy(desc(sortColumn));
    } else {
      usersQuery.orderBy(sortColumn);
    }

    usersQuery.limit(limit).offset(offset);

    const usersList = await usersQuery;

    // Get network counts for each user
    const usersWithNetworks = await Promise.all(
      usersList.map(async (user) => {
        const [ownedCount] = await db
          .select({ count: count() })
          .from(networks)
          .where(eq(networks.ownerId, user.id));

        const [memberCount] = await db
          .select({ count: count() })
          .from(networkMembers)
          .where(eq(networkMembers.userId, user.id));

        return {
          ...user,
          networksOwned: ownedCount.count,
          networksMember: memberCount.count,
        };
      })
    );

    res.json({
      users: usersWithNetworks,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}));

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Get user details
 *     tags: [Admin]
 */
router.get('/users/:userId', authenticate, requireAdmin, adminHandler(async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        username: true,
        role: true,
        emailVerified: true,
        signUpTime: true,
        lastLogin: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Get owned networks
    const ownedNetworks = await db.query.networks.findMany({
      where: eq(networks.ownerId, userId),
    });

    // Get memberships
    const memberships = await db.query.networkMembers.findMany({
      where: eq(networkMembers.userId, userId),
      with: {
        network: true,
        role: true,
      },
    });

    // Get subscriptions
    const userSubscriptions = await db.query.subscriptions.findMany({
      where: eq(subscriptions.userId, userId),
    });

    res.json({
      user,
      ownedNetworks,
      memberships: memberships.map((m) => ({
        network: m.network,
        role: m.role,
        joinedAt: m.createdAt,
      })),
      subscriptions: userSubscriptions,
    });
  } catch (error) {
    next(error);
  }
}));

const updateUserSchema = z.object({
  role: z.enum(['member', 'admin']).optional(),
  username: z.string().min(3).max(50).optional(),
  emailVerified: z.boolean().optional(),
});

/**
 * @swagger
 * /admin/users/{userId}:
 *   patch:
 *     summary: Update a user
 *     tags: [Admin]
 */
router.patch('/users/:userId', authenticate, requireAdmin, validateBody(updateUserSchema), adminHandler(async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = req.body as z.infer<typeof updateUserSchema>;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        emailVerified: users.emailVerified,
      });

    res.json({ user: updated });
  } catch (error) {
    next(error);
  }
}));

/**
 * @swagger
 * /admin/users/{userId}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin]
 */
router.delete('/users/:userId', authenticate, requireAdmin, adminHandler(async (req, res, next) => {
  try {
    const { userId: targetUserId } = req.params;
    const { userId: adminUserId } = req as AdminRequest;

    if (targetUserId === adminUserId) {
      throw new ApiError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Check if user owns any networks
    const ownedNetworks = await db.query.networks.findMany({
      where: eq(networks.ownerId, targetUserId),
    });

    if (ownedNetworks.length > 0) {
      throw new ApiError(
        400,
        'USER_OWNS_NETWORKS',
        `User owns ${ownedNetworks.length} network(s). Transfer ownership before deleting.`
      );
    }

    await db.delete(users).where(eq(users.id, targetUserId));

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}));

/**
 * @swagger
 * /admin/users/{userId}/impersonate:
 *   post:
 *     summary: Generate impersonation token for a user
 *     tags: [Admin]
 */
router.post('/users/:userId/impersonate', authenticate, requireAdmin, adminHandler(async (req, res, next) => {
  try {
    const { userId: targetUserId } = req.params;
    const { userId: adminUserId } = req as AdminRequest;

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Generate short-lived impersonation token
    const impersonationToken = jwt.sign(
      {
        userId: targetUserId,
        email: targetUser.email,
        impersonatedBy: adminUserId,
        isImpersonation: true,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.json({
      token: impersonationToken,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        username: targetUser.username,
      },
    });
  } catch (error) {
    next(error);
  }
}));

// ============================================================================
// NETWORKS MANAGEMENT
// ============================================================================

const listNetworksSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  search: z.string().optional(),
  sort: z.enum(['creationTime', 'name']).optional().default('creationTime'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * @swagger
 * /admin/networks:
 *   get:
 *     summary: List all networks
 *     tags: [Admin]
 */
router.get('/networks', authenticate, requireAdmin, validateQuery(listNetworksSchema), adminHandler(async (req, res, next) => {
  try {
    const { page, limit, search, sort, order } = req.query as z.infer<typeof listNetworksSchema>;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(like(networks.name, `%${search}%`));
    }

    // Get total count
    const countQuery = db.select({ count: count() }).from(networks);
    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }
    const [countResult] = await countQuery;

    // Get networks with owner info
    const networksQuery = db
      .select({
        id: networks.id,
        name: networks.name,
        timezone: networks.timezone,
        creationTime: networks.creationTime,
        ownerId: networks.ownerId,
        ownerEmail: users.email,
        ownerUsername: users.username,
      })
      .from(networks)
      .leftJoin(users, eq(networks.ownerId, users.id));

    if (conditions.length > 0) {
      networksQuery.where(and(...conditions));
    }

    const sortColumn = sort === 'name' ? networks.name : networks.creationTime;
    if (order === 'desc') {
      networksQuery.orderBy(desc(sortColumn));
    } else {
      networksQuery.orderBy(sortColumn);
    }

    networksQuery.limit(limit).offset(offset);

    const networksList = await networksQuery;

    // Get additional stats for each network
    const networksWithStats = await Promise.all(
      networksList.map(async (network) => {
        // Member count
        const [memberCount] = await db
          .select({ count: count() })
          .from(networkMembers)
          .where(eq(networkMembers.networkId, network.id));

        // API key count
        const [keyCount] = await db
          .select({ count: count() })
          .from(apiKeys)
          .where(eq(apiKeys.networkId, network.id));

        // Player count
        const [playerCount] = await db
          .select({ count: count() })
          .from(players)
          .where(eq(players.networkId, network.id));

        return {
          ...network,
          memberCount: memberCount.count,
          apiKeyCount: keyCount.count,
          playerCount: playerCount.count,
        };
      })
    );

    res.json({
      networks: networksWithStats,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}));

/**
 * @swagger
 * /admin/networks/{networkId}:
 *   get:
 *     summary: Get network details (admin view)
 *     tags: [Admin]
 */
router.get('/networks/:networkId', authenticate, requireAdmin, adminHandler(async (req, res, next) => {
  try {
    const { networkId } = req.params;

    const network = await db.query.networks.findFirst({
      where: eq(networks.id, networkId),
      with: {
        owner: {
          columns: {
            id: true,
            email: true,
            username: true,
          },
        },
        roles: true,
        members: {
          with: {
            user: {
              columns: {
                id: true,
                email: true,
                username: true,
              },
            },
            role: true,
          },
        },
        apiKeys: true,
        gamemodes: true,
      },
    });

    if (!network) {
      throw new ApiError(404, 'NETWORK_NOT_FOUND', 'Network not found');
    }

    // Get analytics summary from ClickHouse
    const [analyticsStats] = await query<{
      total_sessions: number;
      total_players: number;
      total_revenue: number;
      last_activity: string;
    }>(`
      SELECT
        count() as total_sessions,
        uniq(player_uuid) as total_players,
        (
          SELECT sum(amount)
          FROM payments
          WHERE network_id = '${networkId}'
        ) as total_revenue,
        max(start_time) as last_activity
      FROM network_sessions
      WHERE network_id = '${networkId}'
    `);

    res.json({
      network,
      analytics: {
        totalSessions: Number(analyticsStats?.total_sessions || 0),
        totalPlayers: Number(analyticsStats?.total_players || 0),
        totalRevenue: Number(analyticsStats?.total_revenue || 0),
        lastActivity: analyticsStats?.last_activity || null,
      },
    });
  } catch (error) {
    next(error);
  }
}));

const updateNetworkAdminSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  ownerId: z.string().uuid().optional(),
});

/**
 * @swagger
 * /admin/networks/{networkId}:
 *   patch:
 *     summary: Update a network (admin)
 *     tags: [Admin]
 */
router.patch('/networks/:networkId', authenticate, requireAdmin, validateBody(updateNetworkAdminSchema), adminHandler(async (req, res, next) => {
  try {
    const { networkId } = req.params;
    const updates = req.body as z.infer<typeof updateNetworkAdminSchema>;

    const network = await db.query.networks.findFirst({
      where: eq(networks.id, networkId),
    });

    if (!network) {
      throw new ApiError(404, 'NETWORK_NOT_FOUND', 'Network not found');
    }

    // If transferring ownership, verify new owner exists
    if (updates.ownerId) {
      const newOwner = await db.query.users.findFirst({
        where: eq(users.id, updates.ownerId),
      });
      if (!newOwner) {
        throw new ApiError(400, 'INVALID_OWNER', 'New owner not found');
      }
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
}));

/**
 * @swagger
 * /admin/networks/{networkId}:
 *   delete:
 *     summary: Delete a network (admin)
 *     tags: [Admin]
 */
router.delete('/networks/:networkId', authenticate, requireAdmin, adminHandler(async (req, res, next) => {
  try {
    const { networkId } = req.params;

    const network = await db.query.networks.findFirst({
      where: eq(networks.id, networkId),
    });

    if (!network) {
      throw new ApiError(404, 'NETWORK_NOT_FOUND', 'Network not found');
    }

    // Delete the network (cascades will handle related data)
    await db.delete(networks).where(eq(networks.id, networkId));

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}));

/**
 * @swagger
 * /admin/networks/{networkId}/impersonate:
 *   post:
 *     summary: Get impersonation token to view network as owner
 *     tags: [Admin]
 */
router.post('/networks/:networkId/impersonate', authenticate, requireAdmin, adminHandler(async (req, res, next) => {
  try {
    const { networkId } = req.params;
    const { userId: adminUserId } = req as AdminRequest;

    const network = await db.query.networks.findFirst({
      where: eq(networks.id, networkId),
      with: {
        owner: {
          columns: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!network) {
      throw new ApiError(404, 'NETWORK_NOT_FOUND', 'Network not found');
    }

    // Generate token that impersonates the network owner
    const impersonationToken = jwt.sign(
      {
        userId: network.ownerId,
        email: network.owner.email,
        impersonatedBy: adminUserId,
        isImpersonation: true,
        targetNetworkId: networkId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.json({
      token: impersonationToken,
      network: {
        id: network.id,
        name: network.name,
      },
      owner: network.owner,
    });
  } catch (error) {
    next(error);
  }
}));

// ============================================================================
// SYSTEM HEALTH
// ============================================================================

/**
 * @swagger
 * /admin/health:
 *   get:
 *     summary: Get system health status
 *     tags: [Admin]
 */
router.get('/health', authenticate, requireAdmin, adminHandler(async (req, res, next) => {
  try {
    const checks: Record<string, { status: 'healthy' | 'unhealthy' | 'degraded'; latency?: number; error?: string }> = {};

    // Check PostgreSQL
    const pgStart = Date.now();
    try {
      await db.select({ value: sql`1` }).from(users).limit(1);
      checks.postgres = { status: 'healthy', latency: Date.now() - pgStart };
    } catch (error) {
      checks.postgres = { status: 'unhealthy', error: (error as Error).message };
    }

    // Check ClickHouse
    const chStart = Date.now();
    try {
      await query<{ value: number }>('SELECT 1 as value');
      checks.clickhouse = { status: 'healthy', latency: Date.now() - chStart };
    } catch (error) {
      checks.clickhouse = { status: 'unhealthy', error: (error as Error).message };
    }

    // Check Redis (if available)
    // Note: Redis check would go here if redis client is available

    // Overall status
    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
    const anyUnhealthy = Object.values(checks).some((c) => c.status === 'unhealthy');

    res.json({
      status: allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    next(error);
  }
}));

// ============================================================================
// PLATFORM AUDIT LOG
// ============================================================================

const platformAuditSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  networkId: z.string().uuid().optional(),
});

/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     summary: Get platform-wide audit logs
 *     tags: [Admin]
 */
router.get('/audit-logs', authenticate, requireAdmin, validateQuery(platformAuditSchema), adminHandler(async (req, res, next) => {
  try {
    const { page, limit, action, userId, networkId } = req.query as z.infer<typeof platformAuditSchema>;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (action) conditions.push(eq(auditLogs.action, action));
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (networkId) conditions.push(eq(auditLogs.networkId, networkId));

    // Get total count
    const countQuery = db.select({ count: count() }).from(auditLogs);
    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }
    const [countResult] = await countQuery;

    // Get logs with user info
    const logsQuery = db
      .select({
        id: auditLogs.id,
        networkId: auditLogs.networkId,
        userId: auditLogs.userId,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        ipAddress: auditLogs.ipAddress,
        timestamp: auditLogs.timestamp,
        userEmail: users.email,
        userName: users.username,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id));

    if (conditions.length > 0) {
      logsQuery.where(and(...conditions));
    }

    logsQuery.orderBy(desc(auditLogs.timestamp)).limit(limit).offset(offset);

    const logs = await logsQuery;

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}));

// ============================================================================
// FEATURE FLAGS
// ============================================================================

// Note: Feature flags would need a new table in the schema
// For now, we'll use a simple in-memory/env-based approach

const FEATURE_FLAGS: Record<string, boolean> = {
  webhooks_enabled: true,
  alerts_enabled: true,
  export_enabled: false,
  campaigns_enabled: true,
  bedrock_tracking: true,
};

/**
 * @swagger
 * /admin/feature-flags:
 *   get:
 *     summary: Get all feature flags
 *     tags: [Admin]
 */
router.get('/feature-flags', authenticate, requireAdmin, adminHandler(async (_req, res) => {
  res.json({ flags: FEATURE_FLAGS });
}));

const updateFlagSchema = z.object({
  enabled: z.boolean(),
});

/**
 * @swagger
 * /admin/feature-flags/{flag}:
 *   patch:
 *     summary: Update a feature flag
 *     tags: [Admin]
 */
router.patch('/feature-flags/:flag', authenticate, requireAdmin, validateBody(updateFlagSchema), adminHandler(async (req, res, next) => {
  try {
    const { flag } = req.params;
    const { enabled } = req.body as z.infer<typeof updateFlagSchema>;

    if (!(flag in FEATURE_FLAGS)) {
      throw new ApiError(404, 'FLAG_NOT_FOUND', 'Feature flag not found');
    }

    FEATURE_FLAGS[flag] = enabled;

    res.json({ flag, enabled });
  } catch (error) {
    next(error);
  }
}));

export { router as adminRouter };
