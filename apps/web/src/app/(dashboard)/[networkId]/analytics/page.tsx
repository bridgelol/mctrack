'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/stat-card';
import { formatCompactNumber, formatCurrency, formatDuration } from '@mctrack/shared';

export default function AnalyticsPage() {
  const params = useParams();
  const networkId = params.networkId as string;

  // Get date range (last 7 days)
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'overview', networkId, start, end],
    queryFn: () =>
      api.get<{
        uniquePlayers: number;
        totalSessions: number;
        avgSessionDuration: number;
        peakCcu: number;
        revenue: number;
        arpu: number;
        arppu: number;
        payerConversion: number;
      }>(`/networks/${networkId}/analytics/overview`, {
        params: { start, end },
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Failed to load analytics</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          <select className="select select-bordered select-sm">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Unique Players"
          value={formatCompactNumber(data?.uniquePlayers || 0)}
          icon="👥"
        />
        <StatCard
          title="Total Sessions"
          value={formatCompactNumber(data?.totalSessions || 0)}
          icon="🎮"
        />
        <StatCard
          title="Avg Session"
          value={formatDuration(data?.avgSessionDuration || 0)}
          icon="⏱️"
        />
        <StatCard
          title="Peak CCU"
          value={data?.peakCcu?.toString() || '0'}
          icon="📈"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue"
          value={formatCurrency(data?.revenue || 0, 'USD')}
          icon="💰"
        />
        <StatCard
          title="ARPU"
          value={formatCurrency(data?.arpu || 0, 'USD')}
          description="Avg Revenue Per User"
          icon="📊"
        />
        <StatCard
          title="ARPPU"
          value={formatCurrency(data?.arppu || 0, 'USD')}
          description="Avg Revenue Per Paying User"
          icon="💳"
        />
        <StatCard
          title="Payer Conversion"
          value={`${(data?.payerConversion || 0).toFixed(1)}%`}
          icon="🎯"
        />
      </div>

      {/* Charts would go here */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Player Activity</h2>
            <div className="h-64 flex items-center justify-center text-base-content/60">
              Chart coming soon
            </div>
          </div>
        </div>
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Revenue Trend</h2>
            <div className="h-64 flex items-center justify-center text-base-content/60">
              Chart coming soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
