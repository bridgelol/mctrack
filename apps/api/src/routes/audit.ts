import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { db, auditLogs, users } from '@mctrack/db';
import { Permission } from '@mctrack/shared';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validateQuery } from '../middleware/validate.js';

const router: IRouter = Router({ mergeParams: true });

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  targetType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * @swagger
 * /networks/{networkId}/audit-logs:
 *   get:
 *     summary: List audit logs
 *     tags: [Audit]
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permission.VIEW_TEAM),
  validateQuery(listQuerySchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const {
        page = 1,
        pageSize = 50,
        action,
        userId,
        targetType,
        startDate,
        endDate,
      } = req.query as unknown as z.infer<typeof listQuerySchema>;

      const conditions = [eq(auditLogs.networkId, networkId)];

      if (action) {
        conditions.push(eq(auditLogs.action, action));
      }
      if (userId) {
        conditions.push(eq(auditLogs.userId, userId));
      }
      if (targetType) {
        conditions.push(eq(auditLogs.targetType, targetType));
      }
      if (startDate) {
        conditions.push(gte(auditLogs.timestamp, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(auditLogs.timestamp, new Date(endDate)));
      }

      const [logs, countResult] = await Promise.all([
        db
          .select({
            id: auditLogs.id,
            action: auditLogs.action,
            targetType: auditLogs.targetType,
            targetId: auditLogs.targetId,
            metadata: auditLogs.metadata,
            ipAddress: auditLogs.ipAddress,
            createdAt: auditLogs.timestamp,
            userId: auditLogs.userId,
            userEmail: users.email,
            userName: users.username,
          })
          .from(auditLogs)
          .leftJoin(users, eq(auditLogs.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(auditLogs.timestamp))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db
          .select({ count: sql<number>`count(*)` })
          .from(auditLogs)
          .where(and(...conditions)),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      res.json({
        logs: logs.map((log) => ({
          id: log.id,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          metadata: log.metadata,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt,
          user: log.userId
            ? {
                id: log.userId,
                email: log.userEmail,
                username: log.userName,
              }
            : null,
        })),
        total,
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
 * /networks/{networkId}/audit-logs/actions:
 *   get:
 *     summary: List available action types
 *     tags: [Audit]
 */
router.get(
  '/actions',
  authenticate,
  requirePermission(Permission.VIEW_TEAM),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;

      const actions = await db
        .selectDistinct({ action: auditLogs.action })
        .from(auditLogs)
        .where(eq(auditLogs.networkId, networkId));

      res.json({
        actions: actions.map((a) => a.action),
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as auditRouter };
