import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, alerts } from '@mctrack/db';
import { Permission } from '@mctrack/shared';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validateBody } from '../middleware/validate.js';
import { ApiError } from '../middleware/error-handler.js';

const router: IRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /networks/{networkId}/alerts:
 *   get:
 *     summary: List all alerts for a network
 *     tags: [Alerts]
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permission.MANAGE_ALERTS),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;

      const alertList = await db.query.alerts.findMany({
        where: eq(alerts.networkId, networkId),
      });

      // Convert decimal fields to numbers
      const alertsWithNumbers = alertList.map((a) => ({
        ...a,
        threshold: Number(a.threshold),
        timeWindow: Number(a.timeWindow),
      }));

      res.json({ alerts: alertsWithNumbers });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/alerts:
 *   post:
 *     summary: Create a new alert
 *     tags: [Alerts]
 */
const createAlertSchema = z.object({
  name: z.string().min(1).max(100),
  metric: z.string().min(1).max(50),
  condition: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']),
  threshold: z.number(),
  timeWindow: z.number().min(1).max(1440).default(15),
  channels: z.array(z.string()).min(1),
});

router.post(
  '/',
  authenticate,
  requirePermission(Permission.MANAGE_ALERTS),
  validateBody(createAlertSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { name, metric, condition, threshold, timeWindow, channels } = req.body;

      const [alert] = await db
        .insert(alerts)
        .values({
          networkId,
          name,
          metric,
          condition,
          threshold: threshold.toString(),
          timeWindow: timeWindow.toString(),
          channels,
        })
        .returning();

      res.status(201).json({
        alert: {
          ...alert,
          threshold: Number(alert.threshold),
          timeWindow: Number(alert.timeWindow),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/alerts/{alertId}:
 *   patch:
 *     summary: Update an alert
 *     tags: [Alerts]
 */
const updateAlertSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  metric: z.string().min(1).max(50).optional(),
  condition: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']).optional(),
  threshold: z.number().optional(),
  timeWindow: z.number().min(1).max(1440).optional(),
  channels: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  '/:alertId',
  authenticate,
  requirePermission(Permission.MANAGE_ALERTS),
  validateBody(updateAlertSchema),
  async (req, res, next) => {
    try {
      const { networkId, alertId } = req.params;

      const updateData: Record<string, unknown> = {};
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.metric) updateData.metric = req.body.metric;
      if (req.body.condition) updateData.condition = req.body.condition;
      if (req.body.threshold !== undefined) updateData.threshold = req.body.threshold.toString();
      if (req.body.timeWindow !== undefined) updateData.timeWindow = req.body.timeWindow.toString();
      if (req.body.channels) updateData.channels = req.body.channels;
      if (typeof req.body.isActive === 'boolean') updateData.isActive = req.body.isActive;

      const [alert] = await db
        .update(alerts)
        .set(updateData)
        .where(and(eq(alerts.id, alertId), eq(alerts.networkId, networkId)))
        .returning();

      if (!alert) {
        throw new ApiError(404, 'ALERT_NOT_FOUND', 'Alert not found');
      }

      res.json({
        alert: {
          ...alert,
          threshold: Number(alert.threshold),
          timeWindow: Number(alert.timeWindow),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/alerts/{alertId}:
 *   delete:
 *     summary: Delete an alert
 *     tags: [Alerts]
 */
router.delete(
  '/:alertId',
  authenticate,
  requirePermission(Permission.MANAGE_ALERTS),
  async (req, res, next) => {
    try {
      const { networkId, alertId } = req.params;

      await db
        .delete(alerts)
        .where(and(eq(alerts.id, alertId), eq(alerts.networkId, networkId)));

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export { router as alertsRouter };
