'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import {
  Clock,
  Calendar,
  Gamepad2,
  CreditCard,
  Activity,
  ArrowLeft,
  Globe,
  Monitor,
  Server,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';

interface PlayerDetails {
  id: string;
  playerUuid: string;
  playerName: string;
  platform: 'java' | 'bedrock';
  bedrockDevice: string | null;
  country: string;
  firstSeen: string;
  lastSeen: string;
  campaignId: string | null;
  campaign?: { name: string } | null;
  stats?: {
    totalSessions: number;
    totalPlaytime: number;
    avgSessionLength: number;
    totalSpent: number;
    transactionCount: number;
  };
  recentSessions?: Array<{
    sessionUuid: string;
    startTime: string;
    endTime: string | null;
    duration: number | null;
    domain?: string;
    platform?: string;
  }>;
  recentPayments?: Array<{
    paymentUuid: string;
    amount: number;
    currency: string;
    timestamp: string;
    products?: Array<{ name: string; quantity: number }>;
  }>;
  gamemodeStats?: Array<{
    gamemodeId: string;
    gamemodeName: string;
    totalSessions: number;
    totalPlaytime: number;
  }>;
  recentGamemodeSessions?: Array<{
    sessionUuid: string;
    gamemodeId: string;
    gamemodeName: string;
    serverName: string;
    startTime: string;
    endTime: string | null;
    duration: number | null;
  }>;
}

interface PlayerResponse {
  player: PlayerDetails;
}

export default function PlayerDetailPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const playerUuid = params.playerUuid as string;

  const { data, isLoading } = useQuery<PlayerResponse>({
    queryKey: ['player', networkId, playerUuid],
    queryFn: () => api.get(`/networks/${networkId}/players/${playerUuid}`),
  });

  const player = data?.player;

  // Check if player has any active session (network or gamemode)
  const hasActiveSession =
    player?.recentSessions?.some((s) => !s.endTime) ||
    player?.recentGamemodeSessions?.some((s) => s.duration === null);

  const formatPlaytime = (minutes: number) => {
    if (!minutes) return '0m';
    const roundedMinutes = Math.round(minutes);
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    if (hours < 1) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-xl bg-gray-800 animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-40 bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
            <div className="h-6 w-32 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-gray-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Player not found</h2>
        <p className="text-gray-400 mb-6">The player you're looking for doesn't exist.</p>
        <Link
          href={`/${networkId}/players`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Players
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href={`/${networkId}/players`}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Players
      </Link>

      {/* Header */}
      <div className="flex items-start gap-5">
        <div className="relative">
          <img
            src={`https://mc-heads.net/avatar/${player.playerName}/80`}
            alt={player.playerName}
            className="w-20 h-20 rounded-xl border-2 border-gray-700"
          />
          {hasActiveSession && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success-500 border-2 border-gray-900" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-50">{player.playerName}</h1>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{player.playerUuid}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant={player.platform === 'java' ? 'brand' : 'warning'}>
              {player.platform === 'java' ? 'Java' : 'Bedrock'}
            </Badge>
            {player.bedrockDevice && (
              <Badge variant="outline">
                <Monitor className="h-3 w-3 mr-1" />
                {player.bedrockDevice}
              </Badge>
            )}
            {player.country && (
              <Badge variant="outline">
                <Globe className="h-3 w-3 mr-1" />
                {player.country}
              </Badge>
            )}
            {player.campaign?.name && (
              <Link href={`/${networkId}/campaigns/${player.campaignId}`}>
                <Badge variant="success" className="cursor-pointer hover:opacity-80">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {player.campaign.name}
                </Badge>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Sessions"
          value={(player.stats?.totalSessions || 0).toLocaleString()}
          icon={Activity}
          iconColor="brand"
        />
        <StatCard
          title="Total Playtime"
          value={formatPlaytime(player.stats?.totalPlaytime || 0)}
          icon={Clock}
          iconColor="success"
        />
        <StatCard
          title="Avg Session"
          value={formatPlaytime(player.stats?.avgSessionLength || 0)}
          icon={Clock}
          iconColor="info"
        />
        <StatCard
          title="Total Spent"
          value={`$${(player.stats?.totalSpent || 0).toFixed(2)}`}
          icon={DollarSign}
          iconColor="warning"
        />
        <StatCard
          title="Payments"
          value={(player.stats?.transactionCount || 0).toString()}
          icon={CreditCard}
          iconColor="secondary"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Info */}
        <Card>
          <CardHeader>
            <CardTitle>Player Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  First Seen
                </span>
                <span className="text-gray-100 font-medium">{formatDate(player.firstSeen)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last Seen
                </span>
                <span className="text-gray-100 font-medium">{formatTimeAgo(player.lastSeen)}</span>
              </div>
              {player.campaign?.name && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-400 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Acquired via
                  </span>
                  <Link
                    href={`/${networkId}/campaigns/${player.campaignId}`}
                    className="text-brand-400 hover:text-brand-300 font-medium"
                  >
                    {player.campaign.name}
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Network Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-brand-400" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!player.recentSessions?.length ? (
              <div className="text-center py-6">
                <Activity className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500">No sessions recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {player.recentSessions.slice(0, 5).map((session) => {
                  const isActive = !session.endTime;
                  return (
                    <div
                      key={session.sessionUuid}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isActive
                          ? 'bg-success-500/10 border-success-500/30'
                          : 'bg-gray-800/50 border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-success-400 animate-pulse' : 'bg-gray-600'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-100">
                            {formatDateTime(session.startTime)}
                          </p>
                          {session.domain && (
                            <p className="text-xs text-gray-500">{session.domain}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {isActive ? (
                          <Badge variant="success" size="sm" dot>
                            Active
                          </Badge>
                        ) : (
                          <span className="text-sm font-medium text-gray-400">
                            {formatPlaytime(session.duration || 0)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gamemode Activity */}
      {player.gamemodeStats && player.gamemodeStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-brand-400" />
              Gamemode Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {player.gamemodeStats.map((gm) => (
                <Link
                  key={gm.gamemodeId}
                  href={`/${networkId}/gamemodes/${gm.gamemodeId}`}
                  className="group"
                >
                  <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-800 hover:border-gray-700 hover:bg-gray-800 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-brand-500/15">
                        <Gamepad2 className="h-4 w-4 text-brand-400" />
                      </div>
                      <h4 className="font-semibold text-gray-100 group-hover:text-brand-400 transition-colors">
                        {gm.gamemodeName}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        {gm.totalSessions} session{gm.totalSessions !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-300 font-medium">
                        {formatPlaytime(gm.totalPlaytime)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Gamemode Sessions */}
      {player.recentGamemodeSessions && player.recentGamemodeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-brand-400" />
              Recent Gamemode Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Gamemode
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Server
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {player.recentGamemodeSessions.slice(0, 10).map((session) => {
                    const isActive = session.duration === null;
                    return (
                      <tr
                        key={session.sessionUuid}
                        className={`hover:bg-gray-800/50 transition-colors ${
                          isActive ? 'bg-success-500/5' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/${networkId}/gamemodes/${session.gamemodeId}`}
                            className="inline-flex items-center gap-2 text-gray-100 hover:text-brand-400 font-medium transition-colors"
                          >
                            <Gamepad2 className="h-4 w-4 text-gray-500" />
                            {session.gamemodeName}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-400">{session.serverName || '—'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-300">{formatDateTime(session.startTime)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isActive ? (
                            <Badge variant="success" size="sm" dot>
                              Active
                            </Badge>
                          ) : (
                            <span className="text-gray-300 font-medium">
                              {formatPlaytime(session.duration || 0)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand-400" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!player.recentPayments?.length ? (
            <div className="text-center py-8">
              <CreditCard className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-1">No payments recorded</p>
              <p className="text-sm text-gray-500">
                Payment data will appear here once the player makes a purchase.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Products
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {player.recentPayments.map((payment) => (
                    <tr key={payment.paymentUuid} className="hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-gray-300">{formatDateTime(payment.timestamp)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-success-400 font-semibold">
                          {payment.currency} {(payment.amount || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {payment.products?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {payment.products.map((p, i) => (
                              <Badge key={i} variant="gray" size="sm">
                                {p.name} x{p.quantity}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
