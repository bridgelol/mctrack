/**
 * ClickHouse Schema Definitions
 *
 * These are TypeScript representations of the ClickHouse tables.
 * The actual DDL is in migrations/clickhouse/*.sql
 */

// ============================================================================
// NETWORK SESSIONS
// ============================================================================

export interface NetworkSession {
  network_id: string;
  session_uuid: string;
  player_uuid: string;
  proxy_id: string | null;
  gamemode_id: string | null;
  domain: string;
  ip_address: string;
  player_country: string;
  platform: 'java' | 'bedrock';
  bedrock_device: string | null;
  start_time: Date;
  end_time: Date | null;
  last_heartbeat: Date;
}

export interface CcuSnapshot {
  network_id: string;
  timestamp: Date;
  ccu: number;
  java_ccu: number;
  bedrock_ccu: number;
}

// ============================================================================
// GAMEMODE SESSIONS
// ============================================================================

export interface GameModeSession {
  gamemode_id: string;
  session_uuid: string;
  player_uuid: string;
  server_name: string | null;
  ip_address: string;
  player_country: string;
  start_time: Date;
  end_time: Date | null;
}

// ============================================================================
// PAYMENTS
// ============================================================================

export interface Payment {
  network_id: string;
  payment_uuid: string;
  merchant_payment_id: string;
  player_name: string;
  player_uuid: string | null;
  platform: 'java' | 'bedrock';
  bedrock_device: string | null;
  country: string;
  amount: number;
  currency: string;
  timestamp: Date;
  products_dump_json: string;
}

// ============================================================================
// DAILY ROLLUPS
// ============================================================================

export interface DailyRollup {
  network_id: string;
  date: string; // YYYY-MM-DD
  unique_players: number;
  total_sessions: number;
  total_playtime_minutes: number;
  peak_ccu: number;
  revenue: number;
}

export interface DailyRollupSegmented {
  network_id: string;
  date: string;
  platform: 'java' | 'bedrock';
  bedrock_device: string;
  country: string;
  unique_players: number;
  paying_players: number;
  total_sessions: number;
  total_playtime_minutes: number;
  peak_ccu: number;
  revenue: number;
}

// ============================================================================
// RETENTION COHORTS
// ============================================================================

export interface RetentionCohort {
  network_id: string;
  cohort_date: string;
  days_since: number;
  cohort_size: number;
  returned_players: number;
}

export interface RetentionCohortSegmented {
  network_id: string;
  cohort_date: string;
  days_since: number;
  platform: 'java' | 'bedrock';
  bedrock_device: string;
  country: string;
  cohort_size: number;
  returned_players: number;
}

// ============================================================================
// LTV COHORTS
// ============================================================================

export interface LtvCohort {
  network_id: string;
  cohort_date: string;
  days_since: number;
  cohort_size: number;
  paying_players: number;
  cumulative_revenue: number;
}

export interface LtvCohortSegmented {
  network_id: string;
  cohort_date: string;
  days_since: number;
  platform: 'java' | 'bedrock';
  bedrock_device: string;
  country: string;
  cohort_size: number;
  paying_players: number;
  cumulative_revenue: number;
}

// ============================================================================
// DDL STATEMENTS
// ============================================================================

export const CLICKHOUSE_DDL = `
-- Network Sessions
CREATE TABLE IF NOT EXISTS network_sessions (
  network_id UUID,
  session_uuid UUID,
  player_uuid String,
  proxy_id Nullable(String),
  gamemode_id Nullable(UUID),
  domain String,
  ip_address String,
  player_country LowCardinality(String),
  platform Enum8('java' = 1, 'bedrock' = 2),
  bedrock_device LowCardinality(Nullable(String)),
  start_time DateTime64(3),
  end_time Nullable(DateTime64(3)),
  last_heartbeat DateTime64(3) DEFAULT start_time
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(start_time)
ORDER BY (network_id, start_time, session_uuid);

-- CCU Snapshots (recorded every minute)
CREATE TABLE IF NOT EXISTS ccu_snapshots (
  network_id UUID,
  timestamp DateTime,
  ccu UInt32,
  java_ccu UInt32,
  bedrock_ccu UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (network_id, timestamp)
TTL timestamp + INTERVAL 90 DAY;

-- GameMode Sessions
CREATE TABLE IF NOT EXISTS gamemode_sessions (
  gamemode_id UUID,
  session_uuid UUID,
  player_uuid String,
  server_name Nullable(String),
  ip_address String,
  player_country LowCardinality(String),
  start_time DateTime64(3),
  end_time Nullable(DateTime64(3))
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(start_time)
ORDER BY (gamemode_id, start_time, session_uuid);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  network_id UUID,
  payment_uuid UUID,
  merchant_payment_id String,
  player_name String,
  player_uuid Nullable(String),
  platform Enum8('java' = 1, 'bedrock' = 2),
  bedrock_device LowCardinality(Nullable(String)),
  country LowCardinality(String),
  amount Decimal(10, 2),
  currency LowCardinality(String),
  timestamp DateTime64(3),
  products_dump_json String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (network_id, timestamp, payment_uuid);

-- Daily Rollups
CREATE TABLE IF NOT EXISTS daily_rollups (
  network_id UUID,
  date Date,
  unique_players UInt32,
  total_sessions UInt32,
  total_playtime_minutes UInt64,
  peak_ccu UInt32,
  revenue Decimal(12, 2)
) ENGINE = SummingMergeTree()
ORDER BY (network_id, date);

-- Daily Rollups (Segmented)
CREATE TABLE IF NOT EXISTS daily_rollups_segmented (
  network_id UUID,
  date Date,
  platform Enum8('java' = 1, 'bedrock' = 2),
  bedrock_device LowCardinality(String),
  country LowCardinality(String),
  unique_players UInt32,
  paying_players UInt32,
  total_sessions UInt32,
  total_playtime_minutes UInt64,
  peak_ccu UInt32,
  revenue Decimal(12, 2)
) ENGINE = SummingMergeTree()
ORDER BY (network_id, date, platform, bedrock_device, country);

-- Retention Cohorts
CREATE TABLE IF NOT EXISTS retention_cohorts (
  network_id UUID,
  cohort_date Date,
  days_since UInt16,
  cohort_size UInt32,
  returned_players UInt32
) ENGINE = SummingMergeTree()
ORDER BY (network_id, cohort_date, days_since);

-- Retention Cohorts (Segmented)
CREATE TABLE IF NOT EXISTS retention_cohorts_segmented (
  network_id UUID,
  cohort_date Date,
  days_since UInt16,
  platform Enum8('java' = 1, 'bedrock' = 2),
  bedrock_device LowCardinality(String),
  country LowCardinality(String),
  cohort_size UInt32,
  returned_players UInt32
) ENGINE = SummingMergeTree()
ORDER BY (network_id, cohort_date, days_since, platform, bedrock_device, country);

-- LTV Cohorts
CREATE TABLE IF NOT EXISTS ltv_cohorts (
  network_id UUID,
  cohort_date Date,
  days_since UInt16,
  cohort_size UInt32,
  paying_players UInt32,
  cumulative_revenue Decimal(12, 2)
) ENGINE = SummingMergeTree()
ORDER BY (network_id, cohort_date, days_since);

-- LTV Cohorts (Segmented)
CREATE TABLE IF NOT EXISTS ltv_cohorts_segmented (
  network_id UUID,
  cohort_date Date,
  days_since UInt16,
  platform Enum8('java' = 1, 'bedrock' = 2),
  bedrock_device LowCardinality(String),
  country LowCardinality(String),
  cohort_size UInt32,
  paying_players UInt32,
  cumulative_revenue Decimal(12, 2)
) ENGINE = SummingMergeTree()
ORDER BY (network_id, cohort_date, days_since, platform, bedrock_device, country);
`;
