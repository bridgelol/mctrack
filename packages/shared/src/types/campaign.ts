import type { BudgetType } from '../constants/platform.js';

export interface Campaign {
  id: string;
  networkId: string;
  name: string;
  domainFilter: string | null;
  startDate: Date;
  endDate: Date;
  budgetType: BudgetType;
  budgetAmount: number;
  currency: string;
  createdAt: Date;
  archivedAt: Date | null;
}

export interface CampaignSpend {
  id: string;
  campaignId: string;
  date: Date;
  amount: number;
  notes: string | null;
  createdAt: Date;
}

export interface CampaignMetrics {
  campaignId: string;
  newPlayers: number;
  totalSessions: number;
  revenue: number;
  spend: number;
  roi: number;
}
