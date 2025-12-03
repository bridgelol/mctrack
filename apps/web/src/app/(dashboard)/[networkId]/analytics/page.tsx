'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { api } from '@/lib/api';
import { StatCard, DateRangePicker, type DateRange, Card, CardHeader, CardTitle, CardContent, SkeletonStatCard, EmptyState } from '@/components/ui';
import { AreaChart, BarChart, DonutChart } from '@/components/charts';
import {
  Users,
  Gamepad2,
  Clock,
  TrendingUp,
  DollarSign,
  UserCheck,
  CreditCard,
  Target,
  RefreshCw,
  Download,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatCompact, formatCurrency } from '@/lib/utils';

// Format utilities
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

interface OverviewData {
  uniquePlayers: number;
  totalSessions: number;
  avgSessionDuration: number;
  peakCcu: number;
  revenue: number;
  arpu: number;
  arppu: number;
  payerConversion: number;
  changes?: {
    uniquePlayers?: number;
    totalSessions?: number;
    revenue?: number;
    peakCcu?: number;
  };
}

interface TimeSeriesData {
  playerActivity: Array<{ name: string; players: number }>;
  revenue: Array<{ name: string; revenue: number }>;
  hourlyActivity: Array<{ name: string; sessions: number }>;
  platforms: Array<{ name: string; value: number }>;
  retention: Array<{ name: string; day1: number; day7: number; day30: number }>;
}

export default function AnalyticsPage() {
  const params = useParams();
  const networkId = params.networkId as string;

  // Date range state - default to today
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const start = format(dateRange.from, 'yyyy-MM-dd');
  const end = format(dateRange.to, 'yyyy-MM-dd');

  // Fetch overview data
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['analytics', 'overview', networkId, start, end],
    queryFn: () =>
      api.get<OverviewData>(`/networks/${networkId}/analytics/overview`, {
        params: { start, end },
      }),
  });

  // Fetch timeseries data for charts
  const { data: timeseriesData, isLoading: timeseriesLoading } = useQuery({
    queryKey: ['analytics', 'timeseries', networkId, start, end],
    queryFn: () =>
      api.get<{
        playerActivity: Array<{ name: string; players: number; sessions: number }>;
        hourlyActivity: Array<{ name: string; sessions: number }>;
        platforms: Array<{ name: string; value: number }>;
        countries: Array<{ name: string; value: number }>;
        revenue: Array<{ name: string; revenue: number; transactions: number }>;
        ccuTimeline: Array<{ timestamp: string; value: number }>;
      }>(`/networks/${networkId}/analytics/timeseries`, {
        params: { start, end },
      }),
  });

  // Check if we have any data
  const hasData = data && (data.uniquePlayers > 0 || data.totalSessions > 0 || data.revenue > 0);

  // Generate empty chart data structure for date range (fallback)
  const emptyChartData = generateEmptyChartData(dateRange);

  // Use real data if available, otherwise use empty data
  const chartData = {
    playerActivity: timeseriesData?.playerActivity?.length ? timeseriesData.playerActivity : emptyChartData.playerActivity,
    hourlyActivity: timeseriesData?.hourlyActivity?.length ? timeseriesData.hourlyActivity : emptyChartData.hourlyActivity,
    platforms: timeseriesData?.platforms?.length ? timeseriesData.platforms : emptyChartData.platforms,
    revenue: timeseriesData?.revenue?.length ? timeseriesData.revenue : emptyChartData.revenue,
    retention: emptyChartData.retention, // Retention comes from a different endpoint
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onRefresh={refetch}
          isFetching={isFetching}
        />
        <Card className="p-8 text-center">
          <div className="text-error-400 mb-2">Failed to load analytics</div>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={refetch}
        isFetching={isFetching}
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              title="Unique Players"
              value={formatCompact(data?.uniquePlayers || 0)}
              icon={Users}
              iconColor="primary"
              change={data?.changes?.uniquePlayers}
            />
            <StatCard
              title="Total Sessions"
              value={formatCompact(data?.totalSessions || 0)}
              icon={Gamepad2}
              iconColor="secondary"
              change={data?.changes?.totalSessions}
            />
            <StatCard
              title="Avg Session Duration"
              value={formatDuration(data?.avgSessionDuration || 0)}
              icon={Clock}
              iconColor="info"
            />
            <StatCard
              title="Peak CCU"
              value={data?.peakCcu?.toLocaleString() || '0'}
              icon={TrendingUp}
              iconColor="success"
              change={data?.changes?.peakCcu}
            />
          </>
        )}
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              title="Revenue"
              value={formatCurrency(data?.revenue || 0)}
              icon={DollarSign}
              iconColor="success"
              change={data?.changes?.revenue}
            />
            <StatCard
              title="ARPU"
              value={formatCurrency(data?.arpu || 0)}
              description="Average Revenue Per User"
              icon={UserCheck}
              iconColor="primary"
            />
            <StatCard
              title="ARPPU"
              value={formatCurrency(data?.arppu || 0)}
              description="Avg Revenue Per Paying User"
              icon={CreditCard}
              iconColor="secondary"
            />
            <StatCard
              title="Payer Conversion"
              value={`${(data?.payerConversion || 0).toFixed(1)}%`}
              icon={Target}
              iconColor="warning"
            />
          </>
        )}
      </div>

      {/* Show empty state or charts */}
      {!isLoading && !hasData ? (
        <Card className="p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-brand-500/5 via-brand-600/5 to-transparent p-12">
            <EmptyState
              icon={BarChart3}
              title="No analytics data yet"
              description="Analytics will appear here once players start connecting to your server. Make sure your server has the MCTrack plugin installed and configured."
            />
          </div>
        </Card>
      ) : (
        <>
          {/* Charts Row 1 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Player Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[280px] animate-pulse bg-gray-800/30 rounded-lg" />
                ) : (
                  <AreaChart
                    data={chartData.playerActivity}
                    dataKeys={[
                      { key: 'players', name: 'Active Players', color: '#6366f1' },
                    ]}
                    height={280}
                    showGrid
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[280px] animate-pulse bg-gray-800/30 rounded-lg" />
                ) : (
                  <BarChart
                    data={chartData.revenue}
                    dataKeys={[
                      { key: 'revenue', name: 'Revenue', color: '#22c55e' },
                    ]}
                    height={280}
                    showGrid
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Sessions by Hour</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[240px] animate-pulse bg-gray-800/30 rounded-lg" />
                ) : (
                  <BarChart
                    data={chartData.hourlyActivity}
                    dataKeys={[
                      { key: 'sessions', name: 'Sessions', color: '#8b5cf6' },
                    ]}
                    height={240}
                    showGrid
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[240px] animate-pulse bg-gray-800/30 rounded-lg" />
                ) : hasData ? (
                  <DonutChart
                    data={chartData.platforms}
                    height={240}
                    centerValue={formatCompact(data?.totalSessions || 0)}
                    centerLabel="Total Sessions"
                    showLegend
                  />
                ) : (
                  <div className="h-[240px] flex items-center justify-center">
                    <p className="text-gray-500 text-sm">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Player Retention</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[240px] animate-pulse bg-gray-800/30 rounded-lg" />
                ) : (
                  <AreaChart
                    data={chartData.retention}
                    dataKeys={[
                      { key: 'day1', name: 'D1', color: '#22c55e' },
                      { key: 'day7', name: 'D7', color: '#3b82f6' },
                      { key: 'day30', name: 'D30', color: '#f59e0b' },
                    ]}
                    height={240}
                    stacked
                    showLegend
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// Page header component
interface PageHeaderProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
  isFetching: boolean;
}

function PageHeader({ dateRange, onDateRangeChange, onRefresh, isFetching }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-50">Analytics</h1>
        <p className="text-sm text-gray-400 mt-1">
          Track player engagement and revenue metrics
        </p>
      </div>
      <div className="flex items-center gap-2">
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </Button>
        <Button variant="outline" size="icon">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Generate empty chart data with correct date labels (all values 0)
function generateEmptyChartData(dateRange: DateRange): TimeSeriesData {
  const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));

  const playerActivity = Array.from({ length: days }, (_, i) => {
    const date = new Date(dateRange.from);
    date.setDate(date.getDate() + i);
    return {
      name: format(date, 'MMM d'),
      players: 0,
    };
  });

  const revenue = Array.from({ length: days }, (_, i) => {
    const date = new Date(dateRange.from);
    date.setDate(date.getDate() + i);
    return {
      name: format(date, 'MMM d'),
      revenue: 0,
    };
  });

  const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
    name: `${i}:00`,
    sessions: 0,
  }));

  const platforms = [
    { name: 'Java', value: 0 },
    { name: 'Bedrock', value: 0 },
  ];

  const retention = Array.from({ length: 7 }, (_, i) => ({
    name: `Week ${i + 1}`,
    day1: 0,
    day7: 0,
    day30: 0,
  }));

  return { playerActivity, revenue, hourlyActivity, platforms, retention };
}
