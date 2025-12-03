'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, Badge, Button, Input, Modal } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  LogIn,
  Users,
  Key,
  Network as NetworkIcon,
} from 'lucide-react';
import { cn, formatDate, formatCompact } from '@/lib/utils';
import Link from 'next/link';

interface Network {
  id: string;
  name: string;
  timezone: string;
  creationTime: string;
  ownerId: string;
  ownerEmail: string;
  ownerUsername: string;
  memberCount: number;
  apiKeyCount: number;
  playerCount: number;
}

interface NetworksResponse {
  networks: Network[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminNetworksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data, isLoading } = useQuery<NetworksResponse>({
    queryKey: ['admin', 'networks', page, search],
    queryFn: () => api.get('/admin/networks', {
      params: {
        page: page.toString(),
        limit: '25',
        ...(search && { search }),
      },
    }),
  });

  const deleteNetworkMutation = useMutation({
    mutationFn: (networkId: string) => api.delete(`/admin/networks/${networkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'networks'] });
      setShowDeleteModal(false);
      setSelectedNetwork(null);
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: (networkId: string) =>
      api.post<{ token: string; network: { id: string; name: string } }>(`/admin/networks/${networkId}/impersonate`, {}),
    onSuccess: (data) => {
      localStorage.setItem('impersonation_token', data.token);
      localStorage.setItem('impersonation_network', JSON.stringify(data.network));
      window.location.href = `/${data.network.id}/analytics`;
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Networks</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage all platform networks
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search networks by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Networks Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Network
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Owner
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Stats
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4" colSpan={5}>
                      <div className="h-10 bg-gray-800/50 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : data?.networks.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                    No networks found
                  </td>
                </tr>
              ) : (
                data?.networks.map((network) => (
                  <tr key={network.id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
                          <NetworkIcon className="h-5 w-5 text-brand-400" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-100">{network.name}</div>
                          <div className="text-xs text-gray-500">{network.timezone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={network.ownerUsername} size="sm" />
                        <div>
                          <div className="text-sm text-gray-100">{network.ownerUsername}</div>
                          <div className="text-xs text-gray-500">{network.ownerEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-gray-500" />
                          <span className="text-gray-300">{network.memberCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-gray-500" />
                          <span className="text-gray-300">{network.apiKeyCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-brand-400">
                          <span className="font-medium">{formatCompact(network.playerCount)}</span>
                          <span className="text-gray-500">players</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400">
                      {formatDate(network.creationTime)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/networks/${network.id}`}>
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => impersonateMutation.mutate(network.id)}
                          disabled={impersonateMutation.isPending}
                          title="View as Owner"
                        >
                          <LogIn className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedNetwork(network);
                            setShowDeleteModal(true);
                          }}
                          className="text-error-400 hover:text-error-300"
                          title="Delete Network"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <div className="text-sm text-gray-500">
              Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
              {data.pagination.total} networks
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-400">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedNetwork(null);
        }}
        title="Delete Network"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete the network <strong>{selectedNetwork?.name}</strong>?
          </p>
          <div className="p-3 rounded-lg bg-error-500/10 border border-error-500/20">
            <p className="text-error-400 text-sm">
              This will permanently delete all data associated with this network, including:
            </p>
            <ul className="text-error-400 text-sm mt-2 list-disc list-inside">
              <li>All player data and session history</li>
              <li>All payment records</li>
              <li>All campaigns and analytics</li>
              <li>All team members and roles</li>
            </ul>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedNetwork(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="error"
              onClick={() => selectedNetwork && deleteNetworkMutation.mutate(selectedNetwork.id)}
              disabled={deleteNetworkMutation.isPending}
            >
              {deleteNetworkMutation.isPending ? 'Deleting...' : 'Delete Network'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
