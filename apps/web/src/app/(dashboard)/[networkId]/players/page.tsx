'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Player {
  id: string;
  playerUuid: string;
  playerName: string;
  platform: 'java' | 'bedrock';
  bedrockDevice: string | null;
  country: string;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
  totalPlaytime: number;
  totalSpent: number;
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
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Players</h1>
        <div className="text-sm text-base-content/60">
          {(data?.total ?? 0).toLocaleString()} total players
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="form-control">
          <input
            type="text"
            placeholder="Search players..."
            className="input input-bordered input-sm w-64"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          className="select select-bordered select-sm"
          value={platform}
          onChange={(e) => {
            setPlatform(e.target.value as 'all' | 'java' | 'bedrock');
            setPage(1);
          }}
        >
          <option value="all">All Platforms</option>
          <option value="java">Java</option>
          <option value="bedrock">Bedrock</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Player</th>
              <th>Platform</th>
              <th>Country</th>
              <th>First Seen</th>
              <th>Last Seen</th>
              <th>Sessions</th>
              <th>Playtime</th>
              <th>Spent</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  <span className="loading loading-spinner loading-md" />
                </td>
              </tr>
            ) : !data?.players || data.players.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-base-content/60">
                  No players found
                </td>
              </tr>
            ) : (
              data.players.map((player) => (
                <tr
                  key={player.id}
                  className="hover cursor-pointer"
                  onClick={() => router.push(`/${networkId}/players/${player.playerUuid}`)}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar">
                        <div className="w-10 rounded">
                          <img
                            src={`https://mc-heads.net/avatar/${player.playerUuid}/40`}
                            alt={player.playerName}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{player.playerName}</div>
                        <div className="text-xs text-base-content/60 font-mono">
                          {player.playerUuid.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-sm ${player.platform === 'java' ? 'badge-primary' : 'badge-secondary'}`}>
                      {player.platform}
                    </span>
                    {player.bedrockDevice && (
                      <span className="text-xs text-base-content/60 ml-1">
                        ({player.bedrockDevice})
                      </span>
                    )}
                  </td>
                  <td>{player.country}</td>
                  <td>{formatDate(player.firstSeen)}</td>
                  <td>{formatDate(player.lastSeen)}</td>
                  <td>{player.totalSessions.toLocaleString()}</td>
                  <td>{formatPlaytime(player.totalPlaytime)}</td>
                  <td className={player.totalSpent > 0 ? 'text-success' : ''}>
                    ${player.totalSpent.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="join">
            <button
              className="join-item btn btn-sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              «
            </button>
            <button className="join-item btn btn-sm">
              Page {page} of {totalPages}
            </button>
            <button
              className="join-item btn btn-sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
