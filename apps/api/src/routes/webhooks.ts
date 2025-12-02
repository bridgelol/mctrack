import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { randomBytes, createHmac } from 'crypto';
import { db, webhooks } from '@mctrack/db';
import { Permission } from '@mctrack/shared';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validateBody } from '../middleware/validate.js';
import { ApiError } from '../middleware/error-handler.js';

const router: IRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /networks/{networkId}/webhooks:
 *   get:
 *     summary: List all webhooks for a network
 *     tags: [Webhooks]
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permission.MANAGE_WEBHOOKS),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;

      const webhookList = await db.query.webhooks.findMany({
        where: eq(webhooks.networkId, networkId),
        columns: {
          id: true,
          name: true,
          url: true,
          events: true,
          isActive: true,
          lastTriggeredAt: true,
          failureCount: true,
          createdAt: true,
        },
      });

      // Add a flag to indicate secret exists without exposing it
      const webhooksWithSecretFlag = webhookList.map((w) => ({
        ...w,
        failureCount: Number(w.failureCount),
        secret: null, // Never expose the actual secret
      }));

      res.json({ webhooks: webhooksWithSecretFlag });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/webhooks:
 *   post:
 *     summary: Create a new webhook
 *     tags: [Webhooks]
 */
const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().optional(),
});

router.post(
  '/',
  authenticate,
  requirePermission(Permission.MANAGE_WEBHOOKS),
  validateBody(createWebhookSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { name, url, events, secret } = req.body;

      const [webhook] = await db
        .insert(webhooks)
        .values({
          networkId,
          name,
          url,
          events,
          secret: secret || randomBytes(32).toString('hex'),
        })
        .returning();

      res.status(201).json({ webhook });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/webhooks/{webhookId}:
 *   patch:
 *     summary: Update a webhook
 *     tags: [Webhooks]
 */
const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  secret: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  '/:webhookId',
  authenticate,
  requirePermission(Permission.MANAGE_WEBHOOKS),
  validateBody(updateWebhookSchema),
  async (req, res, next) => {
    try {
      const { networkId, webhookId } = req.params;

      const updateData: Record<string, unknown> = {};
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.url) updateData.url = req.body.url;
      if (req.body.events) updateData.events = req.body.events;
      if (req.body.secret) updateData.secret = req.body.secret;
      if (typeof req.body.isActive === 'boolean') updateData.isActive = req.body.isActive;

      const [webhook] = await db
        .update(webhooks)
        .set(updateData)
        .where(and(eq(webhooks.id, webhookId), eq(webhooks.networkId, networkId)))
        .returning();

      if (!webhook) {
        throw new ApiError(404, 'WEBHOOK_NOT_FOUND', 'Webhook not found');
      }

      res.json({ webhook });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/webhooks/{webhookId}:
 *   delete:
 *     summary: Delete a webhook
 *     tags: [Webhooks]
 */
router.delete(
  '/:webhookId',
  authenticate,
  requirePermission(Permission.MANAGE_WEBHOOKS),
  async (req, res, next) => {
    try {
      const { networkId, webhookId } = req.params;

      await db
        .delete(webhooks)
        .where(and(eq(webhooks.id, webhookId), eq(webhooks.networkId, networkId)));

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/webhooks/{webhookId}/test:
 *   post:
 *     summary: Test a webhook by sending a test payload
 *     tags: [Webhooks]
 */
router.post(
  '/:webhookId/test',
  authenticate,
  requirePermission(Permission.MANAGE_WEBHOOKS),
  async (req, res, next) => {
    try {
      const { networkId, webhookId } = req.params;

      const webhook = await db.query.webhooks.findFirst({
        where: and(eq(webhooks.id, webhookId), eq(webhooks.networkId, networkId)),
      });

      if (!webhook) {
        throw new ApiError(404, 'WEBHOOK_NOT_FOUND', 'Webhook not found');
      }

      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        networkId,
        data: {
          message: 'This is a test webhook delivery',
        },
      };

      const payloadString = JSON.stringify(testPayload);
      const signature = webhook.secret
        ? createHmac('sha256', webhook.secret).update(payloadString).digest('hex')
        : null;

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(signature && { 'X-MCTrack-Signature': `sha256=${signature}` }),
          },
          body: payloadString,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        res.json({ success: true, status: response.status });
      } catch (fetchError) {
        res.json({
          success: false,
          error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

export { router as webhooksRouter };
