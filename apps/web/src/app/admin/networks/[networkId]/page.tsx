'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Network as NetworkIcon,
  Users,
  Key,
  Gamepad2,
  DollarSign,
  Clock,
  LogIn,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { formatDate, formatCompact, formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface NetworkDetails {
  network: {
    id: string;
    name: string;
    timezone: string;
    creationTime: string;
    settings: Record<string, unknown>;
    owner: {
      id: string;
      email: string;
      username: string;
    };
    roles: Array<{
      id: string;
      name: string;
      color: string;
      isDefault: boolean;
    }>;
    members: Array<{
      id: string;
      user: { id: string; email: string; username: string };
      role: { id: string; name: string; color: string };
      createdAt: string;
    }>;
    apiKeys: Array<{
      id: string;
      name: string;
      keyPrefix: string;
      createdAt: string;
      lastUsedAt: string | null;
    }>;
    gamemodes: Array<{
      id: string;
      name: string;
      creationTime: string;
    }>;
  };
  analytics: {
    totalSessions: number;
    totalPlayers: number;
    totalRevenue: number;
    lastActivity: string | null;
  };
}

export default function AdminNetworkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const networkId = params.networkId as string;

  const { data, isLoading, error } = useQuery<NetworkDetails>({
    queryKey: ['admin', 'networks', networkId],
    queryFn: () => api.get(`/admin/networks/${networkId}`),
  });

  const impersonateMutation = useMutation({
    mutationFn: () =>
      api.post<{ token: string; network: { id: string; name: string } }>(`/admin/networks/${networkId}/impersonate`, {}),
    onSuccess: (data) => {
      localStorage.setItem('impersonation_token', data.token);
      localStorage.setItem('impersonation_network', JSON.stringify(data.network));
      window.location.href = `/${data.network.id}/analytics`;
    },
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card className="p-8 text-center">
          <div className="text-error-400">Network not found</div>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-gray-800/50 animate-pulse rounded" />
        <Card className="p-8">
          <div className="h-20 bg-gray-800/50 animate-pulse rounded" />
        </Card>
      </div>
    );
  }

  const { network, analytics } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <NetworkIcon className="h-6 w-6 text-brand-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-50">{network.name}</h1>
              <p className="text-sm text-gray-400">{network.timezone}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => impersonateMutation.mutate()}
            disabled={impersonateMutation.isPending}
          >
            <LogIn className="h-4 w-4 mr-2" />
            View as Owner
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-100">{formatCompact(analytics.totalPlayers)}</div>
              <div className="text-sm text-gray-500">Total Players</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Gamepad2 className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-100">{formatCompact(analytics.totalSessions)}</div>
              <div className="text-sm text-gray-500">Total Sessions</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-100">{formatCurrency(analytics.totalRevenue)}</div>
              <div className="text-sm text-gray-500">Total Revenue</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-100">
                {analytics.lastActivity ? formatDate(analytics.lastActivity) : 'No activity'}
              </div>
              <div className="text-sm text-gray-500">Last Activity</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Owner */}
        <Card>
          <CardHeader>
            <CardTitle>Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
              <div className="flex items-center gap-3">
                <Avatar name={network.owner.username} size="md" />
                <div>
                  <div className="font-medium text-gray-100">{network.owner.username}</div>
                  <div className="text-sm text-gray-500">{network.owner.email}</div>
                </div>
              </div>
              <Link href={`/admin/users/${network.owner.id}`}>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-gray-900/50 border border-gray-800">
                <div className="text-xl font-bold text-gray-100">{network.members.length}</div>
                <div className="text-xs text-gray-500">Members</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-900/50 border border-gray-800">
                <div className="text-xl font-bold text-gray-100">{network.apiKeys.length}</div>
                <div className="text-xs text-gray-500">API Keys</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-900/50 border border-gray-800">
                <div className="text-xl font-bold text-gray-100">{network.gamemodes.length}</div>
                <div className="text-xs text-gray-500">Gamemodes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({network.members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {network.members.length === 0 ? (
            <p className="text-gray-500 text-sm">No team members.</p>
          ) : (
            <div className="space-y-2">
              {network.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={member.user.username} size="sm" />
                    <div>
                      <div className="font-medium text-gray-100">{member.user.username}</div>
                      <div className="text-xs text-gray-500">{member.user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge style={{ backgroundColor: `${member.role.color}20`, color: member.role.color }}>
                      {member.role.name}
                    </Badge>
                    <Link href={`/admin/users/${member.user.id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys ({network.apiKeys.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {network.apiKeys.length === 0 ? (
            <p className="text-gray-500 text-sm">No API keys created.</p>
          ) : (
            <div className="space-y-2">
              {network.apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Key className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-100">{key.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{key.keyPrefix}...</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {key.lastUsedAt ? `Last used ${formatDate(key.lastUsedAt)}` : 'Never used'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gamemodes */}
      {network.gamemodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gamemodes ({network.gamemodes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {network.gamemodes.map((gm) => (
                <div
                  key={gm.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Gamepad2 className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-100">{gm.name}</div>
                      <div className="text-xs text-gray-500">Created {formatDate(gm.creationTime)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Network Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-4 rounded-lg bg-gray-900/50 border border-gray-800 text-sm text-gray-300 overflow-auto">
            {JSON.stringify(network.settings, null, 2) || '{}'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
