import { query as clickhouseQuery } from '@mctrack/db/clickhouse';
import { logger } from '../lib/logger.js';

export async function runDailyAggregations(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  logger.info({ date: dateStr }, 'Running daily aggregations');

  await Promise.all([
    aggregateDailyRollups(dateStr),
    aggregateDailyRollupsSegmented(dateStr),
    aggregateRetentionCohorts(dateStr),
    aggregateRetentionCohortsSegmented(dateStr),
    aggregateLTVCohorts(dateStr),
    aggregateLTVCohortsSegmented(dateStr),
  ]);

  logger.info({ date: dateStr }, 'Daily aggregations completed');
}

async function aggregateDailyRollups(date: string): Promise<void> {
  await clickhouseQuery(`
    INSERT INTO daily_rollups (network_id, date, unique_players, total_sessions, total_playtime_minutes, peak_ccu, revenue)
    SELECT
      network_id,
      toDate('${date}') as date,
      uniq(player_uuid) as unique_players,
      count() as total_sessions,
      sum(dateDiff('minute', start_time, coalesce(end_time, now()))) as total_playtime_minutes,
      0 as peak_ccu,
      0 as revenue
    FROM network_sessions
    WHERE toDate(start_time) = '${date}'
    GROUP BY network_id
  `);

  // Update revenue from payments
  await clickhouseQuery(`
    ALTER TABLE daily_rollups
    UPDATE revenue = (
      SELECT coalesce(sum(amount), 0)
      FROM payments
      WHERE payments.network_id = daily_rollups.network_id
        AND toDate(timestamp) = daily_rollups.date
    )
    WHERE date = '${date}'
  `);

  logger.info({ date }, 'Daily rollups aggregated');
}

async function aggregateDailyRollupsSegmented(date: string): Promise<void> {
  await clickhouseQuery(`
    INSERT INTO daily_rollups_segmented (network_id, date, platform, bedrock_device, country, unique_players, paying_players, total_sessions, total_playtime_minutes, peak_ccu, revenue)
    SELECT
      s.network_id,
      toDate('${date}') as date,
      s.platform,
      s.bedrock_device,
      s.player_country as country,
      uniq(s.player_uuid) as unique_players,
      uniq(if(p.player_uuid != '', p.player_uuid, null)) as paying_players,
      count() as total_sessions,
      sum(dateDiff('minute', s.start_time, coalesce(s.end_time, now()))) as total_playtime_minutes,
      0 as peak_ccu,
      coalesce(sum(p.amount), 0) as revenue
    FROM network_sessions s
    LEFT JOIN payments p ON s.network_id = p.network_id
      AND s.player_uuid = p.player_uuid
      AND toDate(p.timestamp) = '${date}'
    WHERE toDate(s.start_time) = '${date}'
    GROUP BY s.network_id, s.platform, s.bedrock_device, s.player_country
  `);

  logger.info({ date }, 'Segmented daily rollups aggregated');
}

async function aggregateRetentionCohorts(date: string): Promise<void> {
  // For each cohort date, calculate how many players returned on this date
  await clickhouseQuery(`
    INSERT INTO retention_cohorts (network_id, cohort_date, days_since, cohort_size, returned_players)
    SELECT
      c.network_id,
      c.cohort_date,
      dateDiff('day', c.cohort_date, toDate('${date}')) as days_since,
      c.cohort_size,
      count(distinct s.player_uuid) as returned_players
    FROM (
      SELECT
        network_id,
        toDate(min(start_time)) as cohort_date,
        player_uuid,
        count() as cohort_size
      FROM network_sessions
      GROUP BY network_id, player_uuid
      HAVING cohort_date <= toDate('${date}') - 1
    ) c
    LEFT JOIN network_sessions s ON c.network_id = s.network_id
      AND c.player_uuid = s.player_uuid
      AND toDate(s.start_time) = '${date}'
    GROUP BY c.network_id, c.cohort_date, c.cohort_size
    HAVING days_since IN (1, 3, 7, 14, 30, 60, 90)
  `);

  logger.info({ date }, 'Retention cohorts aggregated');
}

async function aggregateRetentionCohortsSegmented(date: string): Promise<void> {
  await clickhouseQuery(`
    INSERT INTO retention_cohorts_segmented (network_id, cohort_date, days_since, platform, bedrock_device, country, cohort_size, returned_players)
    SELECT
      c.network_id,
      c.cohort_date,
      dateDiff('day', c.cohort_date, toDate('${date}')) as days_since,
      c.platform,
      c.bedrock_device,
      c.country,
      c.cohort_size,
      count(distinct s.player_uuid) as returned_players
    FROM (
      SELECT
        network_id,
        toDate(min(start_time)) as cohort_date,
        player_uuid,
        any(platform) as platform,
        any(bedrock_device) as bedrock_device,
        any(player_country) as country,
        count() as cohort_size
      FROM network_sessions
      GROUP BY network_id, player_uuid
      HAVING cohort_date <= toDate('${date}') - 1
    ) c
    LEFT JOIN network_sessions s ON c.network_id = s.network_id
      AND c.player_uuid = s.player_uuid
      AND toDate(s.start_time) = '${date}'
    GROUP BY c.network_id, c.cohort_date, c.cohort_size, c.platform, c.bedrock_device, c.country
    HAVING days_since IN (1, 3, 7, 14, 30, 60, 90)
  `);

  logger.info({ date }, 'Segmented retention cohorts aggregated');
}

async function aggregateLTVCohorts(date: string): Promise<void> {
  await clickhouseQuery(`
    INSERT INTO ltv_cohorts (network_id, cohort_date, days_since, cohort_size, paying_players, cumulative_revenue)
    SELECT
      c.network_id,
      c.cohort_date,
      days_since,
      c.cohort_size,
      uniq(if(p.player_uuid != '', p.player_uuid, null)) as paying_players,
      coalesce(sum(p.amount), 0) as cumulative_revenue
    FROM (
      SELECT
        network_id,
        toDate(min(start_time)) as cohort_date,
        player_uuid,
        count() over (partition by network_id, toDate(min(start_time))) as cohort_size
      FROM network_sessions
      GROUP BY network_id, player_uuid
    ) c
    CROSS JOIN (
      SELECT arrayJoin([1, 7, 14, 30, 60, 90]) as days_since
    ) d
    LEFT JOIN payments p ON c.network_id = p.network_id
      AND c.player_uuid = p.player_uuid
      AND toDate(p.timestamp) <= c.cohort_date + d.days_since
    WHERE c.cohort_date + d.days_since <= toDate('${date}')
    GROUP BY c.network_id, c.cohort_date, d.days_since, c.cohort_size
  `);

  logger.info({ date }, 'LTV cohorts aggregated');
}

async function aggregateLTVCohortsSegmented(date: string): Promise<void> {
  await clickhouseQuery(`
    INSERT INTO ltv_cohorts_segmented (network_id, cohort_date, days_since, platform, bedrock_device, country, cohort_size, paying_players, cumulative_revenue)
    SELECT
      c.network_id,
      c.cohort_date,
      days_since,
      c.platform,
      c.bedrock_device,
      c.country,
      c.cohort_size,
      uniq(if(p.player_uuid != '', p.player_uuid, null)) as paying_players,
      coalesce(sum(p.amount), 0) as cumulative_revenue
    FROM (
      SELECT
        network_id,
        toDate(min(start_time)) as cohort_date,
        player_uuid,
        any(platform) as platform,
        any(bedrock_device) as bedrock_device,
        any(player_country) as country,
        count() over (partition by network_id, toDate(min(start_time)), any(platform), any(bedrock_device), any(player_country)) as cohort_size
      FROM network_sessions
      GROUP BY network_id, player_uuid
    ) c
    CROSS JOIN (
      SELECT arrayJoin([1, 7, 14, 30, 60, 90]) as days_since
    ) d
    LEFT JOIN payments p ON c.network_id = p.network_id
      AND c.player_uuid = p.player_uuid
      AND toDate(p.timestamp) <= c.cohort_date + d.days_since
    WHERE c.cohort_date + d.days_since <= toDate('${date}')
    GROUP BY c.network_id, c.cohort_date, d.days_since, c.platform, c.bedrock_device, c.country, c.cohort_size
  `);

  logger.info({ date }, 'Segmented LTV cohorts aggregated');
}
