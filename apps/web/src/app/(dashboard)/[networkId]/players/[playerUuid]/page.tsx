'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/stat-card';

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
  campaignName: string | null;
  stats: {
    totalSessions: number;
    totalPlaytime: number;
    avgSessionLength: number;
    totalSpent: number;
    paymentCount: number;
  };
  recentSessions: Array<{
    sessionUuid: string;
    startTime: string;
    endTime: string | null;
    duration: number;
    gamemode: string | null;
  }>;
  payments: Array<{
    paymentUuid: string;
    amount: number;
    currency: string;
    timestamp: string;
    products: Array<{ name: string; quantity: number }>;
  }>;
}

export default function PlayerDetailPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const playerUuid = params.playerUuid as string;

  const { data: player, isLoading } = useQuery<PlayerDetails>({
    queryKey: ['player', networkId, playerUuid],
    queryFn: () => api.get(`/networks/${networkId}/players/${playerUuid}`),
  });

  const formatPlaytime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes}m`;
    return `${hours}h ${minutes % 60}m`;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">Player not found</h2>
        <Link href={`/${networkId}/players`} className="btn btn-primary mt-4">
          Back to Players
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm breadcrumbs">
        <ul>
          <li><Link href={`/${networkId}/players`}>Players</Link></li>
          <li>{player.playerName}</li>
        </ul>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="avatar">
          <div className="w-20 rounded-lg">
            <img
              src={`https://mc-heads.net/avatar/${player.playerUuid}/80`}
              alt={player.playerName}
            />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{player.playerName}</h1>
          <p className="text-base-content/60 font-mono text-sm">{player.playerUuid}</p>
          <div className="flex gap-2 mt-2">
            <span className={`badge ${player.platform === 'java' ? 'badge-primary' : 'badge-secondary'}`}>
              {player.platform}
            </span>
            {player.bedrockDevice && (
              <span className="badge badge-outline">{player.bedrockDevice}</span>
            )}
            <span className="badge badge-outline">{player.country}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Sessions" value={player.stats.totalSessions.toLocaleString()} />
        <StatCard title="Total Playtime" value={formatPlaytime(player.stats.totalPlaytime)} />
        <StatCard title="Avg Session" value={formatPlaytime(player.stats.avgSessionLength)} />
        <StatCard title="Total Spent" value={`$${player.stats.totalSpent.toFixed(2)}`} />
        <StatCard title="Payments" value={player.stats.paymentCount.toString()} />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Player Info */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg">Player Info</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-base-content/60">First Seen</span>
                <span>{formatDateTime(player.firstSeen)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">Last Seen</span>
                <span>{formatDateTime(player.lastSeen)}</span>
              </div>
              {player.campaignName && (
                <div className="flex justify-between">
                  <span className="text-base-content/60">Acquired via</span>
                  <Link href={`/${networkId}/campaigns/${player.campaignId}`} className="link link-primary">
                    {player.campaignName}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg">Recent Sessions</h3>
            {player.recentSessions.length === 0 ? (
              <p className="text-base-content/60">No sessions yet</p>
            ) : (
              <div className="space-y-2">
                {player.recentSessions.slice(0, 5).map((session) => (
                  <div key={session.sessionUuid} className="flex justify-between text-sm">
                    <span>{formatDateTime(session.startTime)}</span>
                    <span className="text-base-content/60">
                      {formatPlaytime(session.duration)}
                      {session.gamemode && ` • ${session.gamemode}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-lg">Payment History</h3>
          {player.payments.length === 0 ? (
            <p className="text-base-content/60">No payments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Products</th>
                  </tr>
                </thead>
                <tbody>
                  {player.payments.map((payment) => (
                    <tr key={payment.paymentUuid}>
                      <td>{formatDateTime(payment.timestamp)}</td>
                      <td className="text-success">
                        {payment.currency} {payment.amount.toFixed(2)}
                      </td>
                      <td>
                        {payment.products.map((p) => `${p.name} x${p.quantity}`).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
