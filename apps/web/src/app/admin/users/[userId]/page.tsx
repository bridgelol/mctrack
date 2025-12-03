'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Shield,
  Mail,
  Calendar,
  Clock,
  Network,
  LogIn,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface UserDetails {
  user: {
    id: string;
    email: string;
    username: string;
    role: 'member' | 'admin';
    emailVerified: boolean;
    signUpTime: string;
    lastLogin: string | null;
  };
  ownedNetworks: Array<{
    id: string;
    name: string;
    creationTime: string;
  }>;
  memberships: Array<{
    network: { id: string; name: string };
    role: { name: string; color: string };
    joinedAt: string;
  }>;
  subscriptions: Array<{
    id: string;
    type: string;
    status: string;
    startedAt: string;
    expiryTime: string | null;
  }>;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.userId as string;

  const { data, isLoading, error } = useQuery<UserDetails>({
    queryKey: ['admin', 'users', userId],
    queryFn: () => api.get(`/admin/users/${userId}`),
  });

  const impersonateMutation = useMutation({
    mutationFn: () =>
      api.post<{ token: string; user: { id: string; email: string } }>(`/admin/users/${userId}/impersonate`, {}),
    onSuccess: (data) => {
      localStorage.setItem('impersonation_token', data.token);
      localStorage.setItem('impersonation_user', JSON.stringify(data.user));
      window.location.href = '/networks';
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
          <div className="text-error-400">User not found</div>
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

  const { user, ownedNetworks, memberships, subscriptions } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-50">{user.username}</h1>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => impersonateMutation.mutate()}
            disabled={impersonateMutation.isPending}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Impersonate
          </Button>
        </div>
      </div>

      {/* User Info Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={user.username} size="lg" />
              <div>
                <div className="font-medium text-gray-100">{user.username}</div>
                {user.role === 'admin' && (
                  <Badge variant="error" className="mt-1">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-800">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-gray-300">{user.email}</span>
                {user.emailVerified ? (
                  <Badge variant="success" size="sm">Verified</Badge>
                ) : (
                  <Badge variant="warning" size="sm">Unverified</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-300">Joined {formatDate(user.signUpTime)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-300">
                  Last login: {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                <div className="text-2xl font-bold text-gray-100">{ownedNetworks.length}</div>
                <div className="text-sm text-gray-500">Networks Owned</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                <div className="text-2xl font-bold text-gray-100">{memberships.length}</div>
                <div className="text-sm text-gray-500">Memberships</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                <div className="text-2xl font-bold text-gray-100">{subscriptions.length}</div>
                <div className="text-sm text-gray-500">Subscriptions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Owned Networks */}
      <Card>
        <CardHeader>
          <CardTitle>Owned Networks</CardTitle>
        </CardHeader>
        <CardContent>
          {ownedNetworks.length === 0 ? (
            <p className="text-gray-500 text-sm">This user doesn't own any networks.</p>
          ) : (
            <div className="space-y-2">
              {ownedNetworks.map((network) => (
                <div
                  key={network.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                      <Network className="h-4 w-4 text-brand-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-100">{network.name}</div>
                      <div className="text-xs text-gray-500">Created {formatDate(network.creationTime)}</div>
                    </div>
                  </div>
                  <Link href={`/admin/networks/${network.id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memberships */}
      <Card>
        <CardHeader>
          <CardTitle>Network Memberships</CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-gray-500 text-sm">This user is not a member of any networks.</p>
          ) : (
            <div className="space-y-2">
              {memberships.map((membership) => (
                <div
                  key={membership.network.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Network className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-100">{membership.network.name}</div>
                      <div className="text-xs text-gray-500">Joined {formatDate(membership.joinedAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      style={{ backgroundColor: `${membership.role.color}20`, color: membership.role.color }}
                    >
                      {membership.role.name}
                    </Badge>
                    <Link href={`/admin/networks/${membership.network.id}`}>
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

      {/* Subscriptions */}
      {subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800"
                >
                  <div>
                    <div className="font-medium text-gray-100">{sub.type}</div>
                    <div className="text-xs text-gray-500">Started {formatDate(sub.startedAt)}</div>
                  </div>
                  <Badge variant={sub.status === 'active' ? 'success' : 'warning'}>
                    {sub.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
