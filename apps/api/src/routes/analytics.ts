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
      const countryFilter = country && country !== '' ? `AND player_country = '${country}'` : '';

      // Query real-time data from network_sessions
      const [sessionStats] = await query<{
        unique_players: number;
        total_sessions: number;
        total_playtime_minutes: number;
      }>(`
        SELECT
          uniq(player_uuid) as unique_players,
          count() as total_sessions,
          sum(if(end_time IS NOT NULL, dateDiff('minute', start_time, end_time), 0)) as total_playtime_minutes
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND toDate(start_time) >= '${start}'
          AND toDate(start_time) <= '${end}'
          ${platformFilter}
          ${countryFilter}
      `);

      // Get peak CCU for the period
      const [ccuStats] = await query<{ peak_ccu: number }>(`
        SELECT max(concurrent) as peak_ccu
        FROM (
          SELECT
            toStartOfMinute(start_time) as minute,
            uniq(session_uuid) as concurrent
          FROM network_sessions
          WHERE network_id = '${networkId}'
            AND toDate(start_time) >= '${start}'
            AND toDate(start_time) <= '${end}'
            ${platformFilter}
            ${countryFilter}
          GROUP BY minute
        )
      `);

      // Get revenue from payments
      const [revenueStats] = await query<{
        revenue: number;
        paying_players: number;
      }>(`
        SELECT
          sum(amount) as revenue,
          uniq(player_uuid) as paying_players
        FROM payments
        WHERE network_id = '${networkId}'
          AND toDate(timestamp) >= '${start}'
          AND toDate(timestamp) <= '${end}'
          ${platformFilter}
          ${country && country !== '' ? `AND country = '${country}'` : ''}
      `);

      const stats = {
        unique_players: sessionStats?.unique_players || 0,
        total_sessions: sessionStats?.total_sessions || 0,
        total_playtime_minutes: sessionStats?.total_playtime_minutes || 0,
        peak_ccu: ccuStats?.peak_ccu || 0,
        revenue: revenueStats?.revenue || 0,
        paying_players: revenueStats?.paying_players || 0,
      };

      const uniquePlayers = Number(stats?.unique_players || 0);
      const payingPlayers = Number(stats?.paying_players || 0);
      const revenue = Number(stats?.revenue || 0);

      const overview = {
        uniquePlayers,
        totalSessions: Number(stats?.total_sessions || 0),
        avgSessionDuration: uniquePlayers > 0
          ? (Number(stats?.total_playtime_minutes || 0) / Number(stats?.total_sessions || 1)) * 60
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

      // Get current CCU (active sessions with recent heartbeat - within 5 minutes)
      const [currentResult] = await query<{ count: number }>(`
        SELECT count() as count
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND end_time IS NULL
          AND last_heartbeat >= now() - INTERVAL 5 MINUTE
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

/**
 * @swagger
 * /networks/{networkId}/analytics/timeseries:
 *   get:
 *     summary: Get time series data for charts
 *     tags: [Analytics]
 */
router.get(
  '/timeseries',
  authenticate,
  requirePermission(Permission.VIEW_DASHBOARD),
  validateQuery(dateRangeSchema),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;
      const { start, end, platform, country } = req.query as z.infer<typeof dateRangeSchema>;

      const platformFilter = platform && platform !== 'all' ? `AND platform = '${platform}'` : '';
      const countryFilter = country && country !== '' ? `AND player_country = '${country}'` : '';

      // Player activity by day
      const playerActivity = await query<{
        date: string;
        players: number;
        sessions: number;
      }>(`
        SELECT
          toDate(start_time) as date,
          uniq(player_uuid) as players,
          count() as sessions
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND toDate(start_time) >= '${start}'
          AND toDate(start_time) <= '${end}'
          ${platformFilter}
          ${countryFilter}
        GROUP BY date
        ORDER BY date
      `);

      // Hourly activity pattern (for today or single-day ranges)
      const hourlyActivity = await query<{
        hour: number;
        sessions: number;
      }>(`
        SELECT
          toHour(start_time) as hour,
          count() as sessions
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND toDate(start_time) >= '${start}'
          AND toDate(start_time) <= '${end}'
          ${platformFilter}
          ${countryFilter}
        GROUP BY hour
        ORDER BY hour
      `);

      // Platform distribution
      const platforms = await query<{
        platform: string;
        count: number;
      }>(`
        SELECT
          platform,
          uniq(player_uuid) as count
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND toDate(start_time) >= '${start}'
          AND toDate(start_time) <= '${end}'
          ${countryFilter}
        GROUP BY platform
      `);

      // Country distribution (top 10)
      const countries = await query<{
        country: string;
        count: number;
      }>(`
        SELECT
          player_country as country,
          uniq(player_uuid) as count
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND toDate(start_time) >= '${start}'
          AND toDate(start_time) <= '${end}'
          ${platformFilter}
        GROUP BY country
        ORDER BY count DESC
        LIMIT 10
      `);

      // Revenue by day
      const revenue = await query<{
        date: string;
        revenue: number;
        transactions: number;
      }>(`
        SELECT
          toDate(timestamp) as date,
          sum(amount) as revenue,
          count() as transactions
        FROM payments
        WHERE network_id = '${networkId}'
          AND toDate(timestamp) >= '${start}'
          AND toDate(timestamp) <= '${end}'
          ${platformFilter}
          ${country && country !== '' ? `AND country = '${country}'` : ''}
        GROUP BY date
        ORDER BY date
      `);

      // CCU timeline (5-minute intervals)
      const ccuTimeline = await query<{
        timestamp: string;
        ccu: number;
      }>(`
        SELECT
          toStartOfFiveMinutes(start_time) as timestamp,
          uniq(session_uuid) as ccu
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND toDate(start_time) >= '${start}'
          AND toDate(start_time) <= '${end}'
          ${platformFilter}
          ${countryFilter}
        GROUP BY timestamp
        ORDER BY timestamp
      `);

      res.json({
        playerActivity: playerActivity.map((d) => ({
          name: d.date,
          players: Number(d.players),
          sessions: Number(d.sessions),
        })),
        hourlyActivity: hourlyActivity.map((d) => ({
          name: `${d.hour}:00`,
          sessions: Number(d.sessions),
        })),
        platforms: platforms.map((d) => ({
          name: d.platform,
          value: Number(d.count),
        })),
        countries: countries.map((d) => ({
          name: d.country,
          value: Number(d.count),
        })),
        revenue: revenue.map((d) => ({
          name: d.date,
          revenue: Number(d.revenue),
          transactions: Number(d.transactions),
        })),
        ccuTimeline: ccuTimeline.map((d) => ({
          timestamp: d.timestamp,
          value: Number(d.ccu),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /networks/{networkId}/analytics/realtime:
 *   get:
 *     summary: Get real-time analytics (last 5 minutes)
 *     tags: [Analytics]
 */
router.get(
  '/realtime',
  authenticate,
  requirePermission(Permission.VIEW_DASHBOARD),
  async (req, res, next) => {
    try {
      const { networkId } = req.params;

      // Current CCU (active sessions with recent heartbeat)
      const [currentCcu] = await query<{ count: number }>(`
        SELECT count() as count
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND end_time IS NULL
          AND last_heartbeat >= now() - INTERVAL 5 MINUTE
      `);

      // Sessions in last 5 minutes
      const [recentActivity] = await query<{
        new_sessions: number;
        ended_sessions: number;
        unique_players: number;
      }>(`
        SELECT
          countIf(start_time >= now() - INTERVAL 5 MINUTE) as new_sessions,
          countIf(end_time >= now() - INTERVAL 5 MINUTE) as ended_sessions,
          uniqIf(player_uuid, start_time >= now() - INTERVAL 5 MINUTE) as unique_players
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND (start_time >= now() - INTERVAL 5 MINUTE OR end_time >= now() - INTERVAL 5 MINUTE)
      `);

      // CCU trend (last hour, per minute)
      const ccuTrend = await query<{
        minute: string;
        ccu: number;
      }>(`
        SELECT
          toStartOfMinute(start_time) as minute,
          uniq(session_uuid) as ccu
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND start_time >= now() - INTERVAL 1 HOUR
        GROUP BY minute
        ORDER BY minute
      `);

      // Platform breakdown of current players
      const platformBreakdown = await query<{
        platform: string;
        count: number;
      }>(`
        SELECT
          platform,
          count() as count
        FROM network_sessions
        WHERE network_id = '${networkId}'
          AND end_time IS NULL
          AND last_heartbeat >= now() - INTERVAL 5 MINUTE
        GROUP BY platform
      `);

      res.json({
        currentCcu: Number(currentCcu?.count || 0),
        newSessions: Number(recentActivity?.new_sessions || 0),
        endedSessions: Number(recentActivity?.ended_sessions || 0),
        uniquePlayersLast5Min: Number(recentActivity?.unique_players || 0),
        ccuTrend: ccuTrend.map((d) => ({
          timestamp: d.minute,
          value: Number(d.ccu),
        })),
        platformBreakdown: platformBreakdown.map((d) => ({
          platform: d.platform,
          count: Number(d.count),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as analyticsRouter };
