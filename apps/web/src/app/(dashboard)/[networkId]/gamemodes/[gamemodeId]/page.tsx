'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { format, startOfDay, endOfDay } from 'date-fns';
import { api } from '@/lib/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  DateRangePicker,
  type DateRange,
  StatCard,
  SkeletonStatCard,
  EmptyState,
} from '@/components/ui';
import { AreaChart, BarChart } from '@/components/charts';
import { Button } from '@/components/ui/button';
import {
  Gamepad2,
  Users,
  Clock,
  TrendingUp,
  RefreshCw,
  ChevronLeft,
  Server,
} from 'lucide-react';
import { cn, formatCompact } from '@/lib/utils';
import Link from 'next/link';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

interface GamemodeAnalyticsResponse {
  gamemode: {
    id: string;
    name: string;
  };
  overview: {
    uniquePlayers: number;
    totalSessions: number;
    avgSessionDuration: number;
    totalPlaytime: number;
    peakCcu: number;
  };
  dailyActivity: Array<{ name: string; players: number; sessions: number }>;
  hourlyActivity: Array<{ name: string; sessions: number }>;
  serverDistribution: Array<{ name: string; sessions: number; players: number }>;
}

export default function GamemodeDetailPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const gamemodeId = params.gamemodeId as string;

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const start = format(dateRange.from, 'yyyy-MM-dd');
  const end = format(dateRange.to, 'yyyy-MM-dd');

  const { data, isLoading, error, refetch, isFetching } = useQuery<GamemodeAnalyticsResponse>({
    queryKey: ['gamemode', 'analytics', networkId, gamemodeId, start, end],
    queryFn: () =>
      api.get(`/networks/${networkId}/gamemodes/${gamemodeId}/analytics`, {
        params: { start, end },
      }),
  });

  const hasData = data && data.overview.totalSessions > 0;

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          gamemodeName=""
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onRefresh={refetch}
          isFetching={isFetching}
          networkId={networkId}
        />
        <Card className="p-8 text-center">
          <div className="text-error-400 mb-2">Failed to load gamemode analytics</div>
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
        gamemodeName={data?.gamemode.name || 'Loading...'}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={refetch}
        isFetching={isFetching}
        networkId={networkId}
      />

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {isLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              title="Unique Players"
              value={formatCompact(data?.overview.uniquePlayers || 0)}
              icon={Users}
              iconColor="primary"
            />
            <StatCard
              title="Total Sessions"
              value={formatCompact(data?.overview.totalSessions || 0)}
              icon={Gamepad2}
              iconColor="secondary"
            />
            <StatCard
              title="Avg Session Duration"
              value={formatDuration(data?.overview.avgSessionDuration || 0)}
              icon={Clock}
              iconColor="info"
            />
            <StatCard
              title="Total Playtime"
              value={formatPlaytime(data?.overview.totalPlaytime || 0)}
              icon={Clock}
              iconColor="warning"
            />
            <StatCard
              title="Peak CCU"
              value={formatCompact(data?.overview.peakCcu || 0)}
              icon={TrendingUp}
              iconColor="success"
            />
          </>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && !hasData && (
        <Card className="p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-brand-500/5 via-brand-600/5 to-transparent p-12">
            <EmptyState
              icon={Server}
              title="No sessions yet"
              description={`No player sessions have been recorded for ${data?.gamemode.name || 'this gamemode'} in the selected date range. Make sure your backend servers have the MCTrack plugin configured with an API key scoped to this gamemode.`}
            />
          </div>
        </Card>
      )}

      {/* Charts */}
      {!isLoading && hasData && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Player Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <AreaChart
                  data={data.dailyActivity}
                  dataKeys={[
                    { key: 'players', name: 'Active Players', color: '#6366f1' },
                  ]}
                  height={280}
                  showGrid
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sessions Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <AreaChart
                  data={data.dailyActivity}
                  dataKeys={[
                    { key: 'sessions', name: 'Sessions', color: '#22c55e' },
                  ]}
                  height={280}
                  showGrid
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sessions by Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={data.hourlyActivity}
                  dataKeys={[
                    { key: 'sessions', name: 'Sessions', color: '#8b5cf6' },
                  ]}
                  height={280}
                  showGrid
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Server Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {data.serverDistribution.length > 0 ? (
                  <BarChart
                    data={data.serverDistribution}
                    dataKeys={[
                      { key: 'sessions', name: 'Sessions', color: '#f59e0b' },
                    ]}
                    height={280}
                    showGrid
                  />
                ) : (
                  <div className="h-[280px] flex items-center justify-center">
                    <p className="text-gray-500 text-sm">No server data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Server Details Table */}
          {data.serverDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Server Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Server</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Sessions</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Unique Players</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.serverDistribution.map((server, index) => (
                        <tr key={server.name} className={cn(
                          'border-b border-gray-800/50',
                          index % 2 === 0 && 'bg-gray-900/30'
                        )}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Server className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-100">{server.name}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4 text-gray-300">
                            {formatCompact(server.sessions)}
                          </td>
                          <td className="text-right py-3 px-4 text-gray-300">
                            {formatCompact(server.players)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

interface PageHeaderProps {
  gamemodeName: string;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
  isFetching: boolean;
  networkId: string;
}

function PageHeader({
  gamemodeName,
  dateRange,
  onDateRangeChange,
  onRefresh,
  isFetching,
  networkId,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link href={`/${networkId}/gamemodes`}>
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
              <Gamepad2 className="h-4 w-4 text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-50">{gamemodeName}</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1 ml-10">
            Gamemode analytics and player engagement
          </p>
        </div>
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
      </div>
    </div>
  );
}
