import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validateQuery } from '../middleware/validate.js';
import { Permission } from '@mctrack/shared';
import { query } from '@mctrack/db/clickhouse';

const router: IRouter = Router({ mergeParams: true });

const dateRangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platform: z.enum(['java', 'bedrock', 'all']).optional().default('all'),
  country: z.string().optional(),
});

/**
 * @swagger
 * /networks/{networkId}/analytics/overview:
 *   get:
 *     summary: Get analytics overview for a network
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: networkId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: start
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [java, bedrock, all]
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics overview data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsOverview'
 */
router.get(
  '/overview',
  authenticate,
  requirePermission(Permission.VIEW_DASHBOARD),
  validateQuery(dateRangeSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { start, end, platform, country } = req.query as z.infer<typeof dateRangeSchema>;

      const platformFilter = platform && platform !== 'all' ? `AND platform = '${platform}'` : '';
      const countryFilter = country && country !== '' ? `AND country = '${country}'` : '';

      const [stats] = await query<{
        unique_players: number;
        total_sessions: number;
        total_playtime_minutes: number;
        peak_ccu: number;
        revenue: number;
        paying_players: number;
      }>(`
        SELECT
          sum(unique_players) as unique_players,
          sum(total_sessions) as total_sessions,
          sum(total_playtime_minutes) as total_playtime_minutes,
          max(peak_ccu) as peak_ccu,
          sum(revenue) as revenue,
          sum(paying_players) as paying_players
        FROM daily_rollups_segmented
        WHERE network_id = '${networkId}'
          AND date >= '${start}'
          AND date <= '${end}'
          ${platformFilter}
          ${countryFilter}
      `);

      const uniquePlayers = Number(stats?.unique_players || 0);
      const payingPlayers = Number(stats?.paying_players || 0);
      const revenue = Number(stats?.revenue || 0);

      const overview = {
        uniquePlayers,
        totalSessions: Number(stats?.total_sessions || 0),
        avgSessionDuration: uniquePlayers > 0
          ? Number(stats?.total_playtime_minutes || 0) / Number(stats?.total_sessions || 1)
          : 0,
        peakCcu: Number(stats?.peak_ccu || 0),
        revenue,
        arpu: uniquePlayers > 0 ? revenue / uniquePlayers : 0,
        arppu: payingPlayers > 0 ? revenue / payingPlayers : 0,
        payerConversion: uniquePlayers > 0 ? (payingPlayers / uniquePlayers) * 100 : 0,
      };

      res.json(overview);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/analytics/ccu:
 *   get:
 *     summary: Get current and historical CCU
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: networkId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CCU data
 */
router.get(
  '/ccu',
  authenticate,
  requirePermission(Permission.VIEW_DASHBOARD),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;

      // Get current CCU (active sessions)
      const [currentResult] = await query<{ count: number }>(`
        SELECT count() as count
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND end_time IS NULL
      `);

      // Get CCU time series for last 24 hours
      const timeSeries = await query<{ timestamp: string; ccu: number }>(`
        SELECT
          toStartOfFiveMinutes(start_time) as timestamp,
          uniq(session_uuid) as ccu
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND start_time >= now() - INTERVAL 24 HOUR
        GROUP BY timestamp
        ORDER BY timestamp
      `);

      res.json({
        current: Number(currentResult?.count || 0),
        peak: Math.max(...timeSeries.map((t) => t.ccu), 0),
        timeSeries: timeSeries.map((t) => ({
          timestamp: t.timestamp,
          value: t.ccu,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/analytics/retention:
 *   get:
 *     summary: Get retention cohort data
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: networkId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: start
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Retention cohort data
 */
router.get(
  '/retention',
  authenticate,
  requirePermission(Permission.VIEW_ADVANCED_ANALYTICS),
  validateQuery(dateRangeSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { start, end, platform, country } = req.query as z.infer<typeof dateRangeSchema>;

      const platformFilter = platform && platform !== 'all' ? `AND platform = '${platform}'` : '';
      const countryFilter = country && country !== '' ? `AND country = '${country}'` : '';

      const cohorts = await query<{
        cohort_date: string;
        days_since: number;
        cohort_size: number;
        returned_players: number;
      }>(`
        SELECT
          cohort_date,
          days_since,
          sum(cohort_size) as cohort_size,
          sum(returned_players) as returned_players
        FROM retention_cohorts_segmented
        WHERE network_id = '${networkId}'
          AND cohort_date >= '${start}'
          AND cohort_date <= '${end}'
          ${platformFilter}
          ${countryFilter}
        GROUP BY cohort_date, days_since
        ORDER BY cohort_date, days_since
      `);

      const result = cohorts.map((c) => ({
        cohortDate: c.cohort_date,
        daysSince: c.days_since,
        cohortSize: Number(c.cohort_size),
        returnedPlayers: Number(c.returned_players),
        retentionRate: c.cohort_size > 0
          ? (Number(c.returned_players) / Number(c.cohort_size)) * 100
          : 0,
      }));

      res.json({ cohorts: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/analytics/ltv:
 *   get:
 *     summary: Get LTV cohort data
 *     tags: [Analytics]
 */
router.get(
  '/ltv',
  authenticate,
  requirePermission(Permission.VIEW_ADVANCED_ANALYTICS),
  validateQuery(dateRangeSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { start, end, platform, country } = req.query as z.infer<typeof dateRangeSchema>;

      const platformFilter = platform && platform !== 'all' ? `AND platform = '${platform}'` : '';
      const countryFilter = country && country !== '' ? `AND country = '${country}'` : '';

      const cohorts = await query<{
        cohort_date: string;
        days_since: number;
        cohort_size: number;
        paying_players: number;
        cumulative_revenue: number;
      }>(`
        SELECT
          cohort_date,
          days_since,
          sum(cohort_size) as cohort_size,
          sum(paying_players) as paying_players,
          sum(cumulative_revenue) as cumulative_revenue
        FROM ltv_cohorts_segmented
        WHERE network_id = '${networkId}'
          AND cohort_date >= '${start}'
          AND cohort_date <= '${end}'
          ${platformFilter}
          ${countryFilter}
        GROUP BY cohort_date, days_since
        ORDER BY cohort_date, days_since
      `);

      const result = cohorts.map((c) => ({
        cohortDate: c.cohort_date,
        daysSince: c.days_since,
        cohortSize: Number(c.cohort_size),
        payingPlayers: Number(c.paying_players),
        cumulativeRevenue: Number(c.cumulative_revenue),
        ltv: c.cohort_size > 0
          ? Number(c.cumulative_revenue) / Number(c.cohort_size)
          : 0,
        payingLtv: c.paying_players > 0
          ? Number(c.cumulative_revenue) / Number(c.paying_players)
          : 0,
      }));

      res.json({ cohorts: result });
    } catch (error) {
      next(error);
    }
  }
);

export { router as analyticsRouter };
