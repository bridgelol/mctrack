'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, Badge, Button, Input } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  User,
  Network,
  Globe,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface AuditLog {
  id: string;
  networkId: string;
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  timestamp: string;
  userEmail: string | null;
  userName: string | null;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-500/10 text-green-400 border-green-500/20',
  update: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  delete: 'bg-red-500/10 text-red-400 border-red-500/20',
  login: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  invite: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

function getActionColor(action: string): string {
  const prefix = action.split('_')[0].toLowerCase();
  return ACTION_COLORS[prefix] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ['admin', 'audit-logs', page, actionFilter],
    queryFn: () => api.get('/admin/audit-logs', {
      params: {
        page: page.toString(),
        limit: '50',
        ...(actionFilter && { action: actionFilter }),
      },
    }),
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-50">Audit Logs</h1>
        <p className="text-sm text-gray-400 mt-1">
          Platform-wide activity log across all networks
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Filter by action (e.g., create_network, update_settings)..."
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Logs */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-800/50 animate-pulse rounded" />
              ))}
            </div>
          ) : data?.logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No audit logs found
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {data?.logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-900/50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      {log.userName ? (
                        <Avatar name={log.userName} size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Action Badge */}
                        <Badge className={getActionColor(log.action)}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>

                        {/* User Link */}
                        {log.userId && log.userName && (
                          <Link
                            href={`/admin/users/${log.userId}`}
                            className="text-sm text-brand-400 hover:text-brand-300"
                          >
                            {log.userName}
                          </Link>
                        )}

                        {/* Target */}
                        {log.targetType && (
                          <span className="text-sm text-gray-500">
                            on {log.targetType}
                            {log.targetId && (
                              <span className="font-mono text-xs ml-1">
                                ({log.targetId.slice(0, 8)}...)
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Metadata Preview */}
                      {Object.keys(log.metadata || {}).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 font-mono bg-gray-900/50 rounded px-2 py-1 inline-block max-w-full overflow-hidden text-ellipsis">
                          {JSON.stringify(log.metadata).slice(0, 100)}
                          {JSON.stringify(log.metadata).length > 100 && '...'}
                        </div>
                      )}

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(log.timestamp)}
                        </span>
                        {log.ipAddress && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {log.ipAddress}
                          </span>
                        )}
                        <Link
                          href={`/admin/networks/${log.networkId}`}
                          className="flex items-center gap-1 text-brand-400 hover:text-brand-300"
                        >
                          <Network className="h-3 w-3" />
                          View Network
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <div className="text-sm text-gray-500">
              Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
              {data.pagination.total} logs
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
    </div>
  );
}
