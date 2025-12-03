'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
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
import { BarChart, DonutChart, AreaChart } from '@/components/charts';
import { Button } from '@/components/ui/button';
import {
  Gamepad2,
  Users,
  Clock,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Server,
  Settings,
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

interface GamemodeStats {
  id: string;
  name: string;
  uniquePlayers: number;
  totalSessions: number;
  avgSessionDuration: number;
  totalPlaytime: number;
}

interface GamemodesAnalyticsResponse {
  gamemodes: GamemodeStats[];
}

export default function GamemodesPage() {
  const params = useParams();
  const router = useRouter();
  const networkId = params.networkId as string;

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const start = format(dateRange.from, 'yyyy-MM-dd');
  const end = format(dateRange.to, 'yyyy-MM-dd');

  const { data, isLoading, error, refetch, isFetching } = useQuery<GamemodesAnalyticsResponse>({
    queryKey: ['gamemodes', 'analytics', networkId, start, end],
    queryFn: () =>
      api.get(`/networks/${networkId}/gamemodes/analytics`, {
        params: { start, end },
      }),
  });

  const gamemodes = data?.gamemodes || [];
  const hasData = gamemodes.some(g => g.totalSessions > 0);

  // Calculate totals
  const totals = gamemodes.reduce(
    (acc, g) => ({
      uniquePlayers: acc.uniquePlayers + g.uniquePlayers,
      totalSessions: acc.totalSessions + g.totalSessions,
      totalPlaytime: acc.totalPlaytime + g.totalPlaytime,
    }),
    { uniquePlayers: 0, totalSessions: 0, totalPlaytime: 0 }
  );

  // Chart data
  const sessionsByGamemode = gamemodes.map(g => ({
    name: g.name,
    value: g.totalSessions,
  }));

  const playersByGamemode = gamemodes.map(g => ({
    name: g.name,
    value: g.uniquePlayers,
  }));

  const playtimeByGamemode = gamemodes.map(g => ({
    name: g.name,
    hours: Math.round(g.totalPlaytime / 60),
  }));

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
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
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={refetch}
        isFetching={isFetching}
        networkId={networkId}
      />

      {/* Overview Stats */}
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
              title="Active Gamemodes"
              value={gamemodes.filter(g => g.totalSessions > 0).length.toString()}
              description={`of ${gamemodes.length} configured`}
              icon={Gamepad2}
              iconColor="primary"
            />
            <StatCard
              title="Total Players"
              value={formatCompact(totals.uniquePlayers)}
              description="across all gamemodes"
              icon={Users}
              iconColor="secondary"
            />
            <StatCard
              title="Total Sessions"
              value={formatCompact(totals.totalSessions)}
              description="gamemode sessions"
              icon={TrendingUp}
              iconColor="success"
            />
            <StatCard
              title="Total Playtime"
              value={formatPlaytime(totals.totalPlaytime)}
              description="combined playtime"
              icon={Clock}
              iconColor="info"
            />
          </>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && gamemodes.length === 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-brand-500/5 via-brand-600/5 to-transparent p-12">
            <EmptyState
              icon={Gamepad2}
              title="No gamemodes configured"
              description="Create gamemodes to track analytics for different server types like SkyWars, BedWars, or SMP."
              action={
                <Link href={`/${networkId}/settings/gamemodes`}>
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Gamemodes
                  </Button>
                </Link>
              }
            />
          </div>
        </Card>
      )}

      {!isLoading && gamemodes.length > 0 && !hasData && (
        <Card className="p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-brand-500/5 via-brand-600/5 to-transparent p-12">
            <EmptyState
              icon={Server}
              title="No gamemode sessions yet"
              description="Gamemode analytics will appear here once players start joining your backend servers. Make sure your Spigot plugin is configured with an API key scoped to a gamemode."
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
                <CardTitle>Sessions by Gamemode</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={sessionsByGamemode}
                  height={280}
                  centerValue={formatCompact(totals.totalSessions)}
                  centerLabel="Total Sessions"
                  showLegend
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Players by Gamemode</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={playersByGamemode}
                  height={280}
                  centerValue={formatCompact(totals.uniquePlayers)}
                  centerLabel="Total Players"
                  showLegend
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Playtime by Gamemode (hours)</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={playtimeByGamemode}
                dataKeys={[{ key: 'hours', name: 'Hours', color: '#8b5cf6' }]}
                height={280}
                showGrid
              />
            </CardContent>
          </Card>

          {/* Gamemode Cards */}
          <div>
            <h2 className="text-lg font-semibold text-gray-50 mb-4">Gamemode Details</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {gamemodes.map((gamemode) => (
                <GamemodeCard
                  key={gamemode.id}
                  gamemode={gamemode}
                  networkId={networkId}
                  onClick={() => router.push(`/${networkId}/gamemodes/${gamemode.id}`)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface PageHeaderProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
  isFetching: boolean;
  networkId: string;
}

function PageHeader({ dateRange, onDateRangeChange, onRefresh, isFetching, networkId }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-50">Gamemodes</h1>
        <p className="text-sm text-gray-400 mt-1">
          Track player engagement across different server types
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
        <Link href={`/${networkId}/settings/gamemodes`}>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

interface GamemodeCardProps {
  gamemode: GamemodeStats;
  networkId: string;
  onClick: () => void;
}

function GamemodeCard({ gamemode, onClick }: GamemodeCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-gray-700 transition-colors group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand-500/20 flex items-center justify-center">
              <Gamepad2 className="h-5 w-5 text-brand-400" />
            </div>
            <h3 className="font-semibold text-gray-50">{gamemode.name}</h3>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Players</p>
            <p className="text-lg font-semibold text-gray-100">
              {formatCompact(gamemode.uniquePlayers)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Sessions</p>
            <p className="text-lg font-semibold text-gray-100">
              {formatCompact(gamemode.totalSessions)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Avg Duration</p>
            <p className="text-lg font-semibold text-gray-100">
              {formatDuration(gamemode.avgSessionDuration)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Playtime</p>
            <p className="text-lg font-semibold text-gray-100">
              {formatPlaytime(gamemode.totalPlaytime)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
