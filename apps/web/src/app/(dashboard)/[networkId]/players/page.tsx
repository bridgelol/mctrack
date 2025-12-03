'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, StatCard, SkeletonTable, EmptyState } from '@/components/ui';
import {
  Search,
  Users,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Gamepad2,
} from 'lucide-react';
import { cn, formatCompact, formatCurrency } from '@/lib/utils';

interface Player {
  playerUuid: string;
  playerName: string;
  platform: 'java' | 'bedrock';
  bedrockDevice: string | null;
  country: string;
  firstSeen: string;
  lastSeen: string;
  totalSessions?: number;
  totalPlaytime?: number;
  totalSpent?: number;
}

interface PlayersResponse {
  players: Player[];
  total: number;
  page: number;
  pageSize: number;
}

export default function PlayersPage() {
  const params = useParams();
  const router = useRouter();
  const networkId = params.networkId as string;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<'all' | 'java' | 'bedrock'>('all');
  const pageSize = 20;

  const { data, isLoading } = useQuery<PlayersResponse>({
    queryKey: ['players', networkId, page, search, platform],
    queryFn: () => api.get(`/networks/${networkId}/players`, {
      params: { page: page.toString(), pageSize: pageSize.toString(), search, platform },
    }),
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const formatPlaytime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes}m`;
    return `${hours}h ${minutes % 60}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Players</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage and analyze your player base
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Players"
          value={formatCompact(data?.total || 0)}
          icon={Users}
          iconColor="primary"
        />
        <StatCard
          title="Java Players"
          value={formatCompact(data?.players?.filter(p => p.platform === 'java').length || 0)}
          icon={Gamepad2}
          iconColor="info"
        />
        <StatCard
          title="Bedrock Players"
          value={formatCompact(data?.players?.filter(p => p.platform === 'bedrock').length || 0)}
          icon={Gamepad2}
          iconColor="secondary"
        />
        <StatCard
          title="Paying Players"
          value={formatCompact(data?.players?.filter(p => (p.totalSpent || 0) > 0).length || 0)}
          icon={DollarSign}
          iconColor="success"
        />
      </div>

      {/* Filters */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name or UUID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-10 px-3 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value as 'all' | 'java' | 'bedrock');
                setPage(1);
              }}
            >
              <option value="all">All Platforms</option>
              <option value="java">Java Only</option>
              <option value="bedrock">Bedrock Only</option>
            </select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {isLoading ? (
          <SkeletonTable rows={10} />
        ) : !data?.players || data.players.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No players found"
            description={search ? `No players matching "${search}"` : 'Players will appear here once they join your server'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-800/30">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">
                    Player
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">
                    Platform
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">
                    Country
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">
                    Last Seen
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">
                    Sessions
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">
                    Playtime
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.players.map((player) => (
                  <tr
                    key={player.playerUuid}
                    className="hover:bg-gray-800/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/${networkId}/players/${player.playerUuid}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://mc-heads.net/avatar/${player.playerName}/40`}
                          alt={player.playerName}
                          className="h-10 w-10 rounded-lg"
                        />
                        <div>
                          <p className="font-medium text-gray-50">
                            {player.playerName}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {player.playerUuid.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={player.platform === 'java' ? 'brand' : 'gray'}
                        size="sm"
                      >
                        {player.platform}
                      </Badge>
                      {player.bedrockDevice && (
                        <span className="text-xs text-gray-500 ml-2">
                          {player.bedrockDevice}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {player.country || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {formatDate(player.lastSeen)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-50 text-right tabular-nums">
                      {(player.totalSessions || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-50 text-right tabular-nums">
                      {formatPlaytime(player.totalPlaytime || 0)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        'text-sm font-medium tabular-nums',
                        (player.totalSpent || 0) > 0 ? 'text-success-400' : 'text-gray-500'
                      )}>
                        {formatCurrency(player.totalSpent || 0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-800 px-6 py-4">
            <p className="text-sm text-gray-400">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data?.total || 0)} of {(data?.total || 0).toLocaleString()} players
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-50 px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
