import type { Platform, BedrockDevice } from '../constants/platform.js';

export interface AnalyticsFilters {
  start: Date;
  end: Date;
  platform?: Platform | 'all';
  bedrockDevice?: BedrockDevice;
  country?: string;
}

export interface OverviewData {
  uniquePlayers: number;
  totalSessions: number;
  avgSessionDuration: number;
  peakCcu: number;
  revenue: number;
  arpu: number;
  arppu: number;
  payerConversion: number;
}

export interface DailyRollup {
  networkId: string;
  date: Date;
  uniquePlayers: number;
  totalSessions: number;
  totalPlaytimeMinutes: number;
  peakCcu: number;
  revenue: number;
}

export interface DailyRollupSegmented extends DailyRollup {
  platform: Platform;
  bedrockDevice: string;
  country: string;
  payingPlayers: number;
}

export interface RetentionCohort {
  networkId: string;
  cohortDate: Date;
  daysSince: number;
  cohortSize: number;
  returnedPlayers: number;
  retentionRate: number;
}

export interface LtvCohort {
  networkId: string;
  cohortDate: Date;
  daysSince: number;
  cohortSize: number;
  payingPlayers: number;
  cumulativeRevenue: number;
  ltv: number;
  payingLtv: number;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface CcuData {
  current: number;
  peak: number;
  timeSeries: TimeSeriesPoint[];
}
