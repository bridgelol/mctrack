import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db, campaigns, campaignSpends } from '@mctrack/db';
import { Permission, BudgetType } from '@mctrack/shared';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validateBody } from '../middleware/validate.js';
import { ApiError } from '../middleware/error-handler.js';

const router: IRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /networks/{networkId}/campaigns:
 *   get:
 *     summary: List all campaigns for a network
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: networkId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeArchived
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of campaigns
 */
router.get(
  '/',
  authenticate,
  requirePermission(Permission.VIEW_CAMPAIGNS),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const includeArchived = req.query.includeArchived === 'true';

      const whereConditions = [eq(campaigns.networkId, networkId)];
      if (!includeArchived) {
        whereConditions.push(isNull(campaigns.archivedAt));
      }

      const campaignList = await db.query.campaigns.findMany({
        where: and(...whereConditions),
        with: {
          spends: true,
        },
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      });

      res.json({ campaigns: campaignList });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Campaign'
 *     responses:
 *       201:
 *         description: Campaign created
 */
const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  domainFilter: z.string().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  budgetType: z.enum([BudgetType.DAILY, BudgetType.TOTAL]),
  budgetAmount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
});

router.post(
  '/',
  authenticate,
  requirePermission(Permission.MANAGE_CAMPAIGNS),
  validateBody(createCampaignSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;

      const [campaign] = await db
        .insert(campaigns)
        .values({
          ...req.body,
          networkId,
        })
        .returning();

      res.status(201).json({ campaign });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/campaigns/{campaignId}:
 *   get:
 *     summary: Get a specific campaign
 *     tags: [Campaigns]
 */
router.get(
  '/:campaignId',
  authenticate,
  requirePermission(Permission.VIEW_CAMPAIGNS),
  async (req, res, next) => {
    try {
      const { networkId, campaignId } = req.params;

      const campaign = await db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, campaignId),
          eq(campaigns.networkId, networkId)
        ),
        with: {
          spends: true,
          players: {
            limit: 10,
            orderBy: (p, { desc }) => [desc(p.lastSeen)],
          },
        },
      });

      if (!campaign) {
        throw new ApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
      }

      res.json({ campaign });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/campaigns/{campaignId}:
 *   patch:
 *     summary: Update a campaign
 *     tags: [Campaigns]
 */
const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domainFilter: z.string().nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  budgetAmount: z.number().positive().optional(),
});

router.patch(
  '/:campaignId',
  authenticate,
  requirePermission(Permission.MANAGE_CAMPAIGNS),
  validateBody(updateCampaignSchema),
  async (req, res, next) => {
    try {
      const { networkId, campaignId } = req.params;

      const [campaign] = await db
        .update(campaigns)
        .set(req.body)
        .where(and(
          eq(campaigns.id, campaignId),
          eq(campaigns.networkId, networkId)
        ))
        .returning();

      if (!campaign) {
        throw new ApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
      }

      res.json({ campaign });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/campaigns/{campaignId}/archive:
 *   post:
 *     summary: Archive a campaign
 *     tags: [Campaigns]
 */
router.post(
  '/:campaignId/archive',
  authenticate,
  requirePermission(Permission.MANAGE_CAMPAIGNS),
  async (req, res, next) => {
    try {
      const { networkId, campaignId } = req.params;

      const [campaign] = await db
        .update(campaigns)
        .set({ archivedAt: new Date() })
        .where(and(
          eq(campaigns.id, campaignId),
          eq(campaigns.networkId, networkId)
        ))
        .returning();

      if (!campaign) {
        throw new ApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
      }

      res.json({ campaign });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/campaigns/{campaignId}/spend:
 *   post:
 *     summary: Log spend for a campaign
 *     tags: [Campaigns]
 */
const logSpendSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

router.post(
  '/:campaignId/spend',
  authenticate,
  requirePermission(Permission.MANAGE_CAMPAIGNS),
  validateBody(logSpendSchema),
  async (req, res, next) => {
    try {
      const { campaignId } = req.params;

      const [spend] = await db
        .insert(campaignSpends)
        .values({
          campaignId,
          ...req.body,
        })
        .returning();

      res.status(201).json({ spend });
    } catch (error) {
      next(error);
    }
  }
);

export { router as campaignsRouter };
