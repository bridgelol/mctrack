'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollText, ChevronLeft, ChevronRight, ChevronDown, User, Globe } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    username: string;
  } | null;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

interface ActionsResponse {
  actions: string[];
}

const ACTION_LABELS: Record<string, string> = {
  'network.created': 'Network Created',
  'network.updated': 'Network Updated',
  'network.deleted': 'Network Deleted',
  'member.invited': 'Member Invited',
  'member.joined': 'Member Joined',
  'member.removed': 'Member Removed',
  'member.role_changed': 'Member Role Changed',
  'role.created': 'Role Created',
  'role.updated': 'Role Updated',
  'role.deleted': 'Role Deleted',
  'api_key.created': 'API Key Created',
  'api_key.revoked': 'API Key Revoked',
  'campaign.created': 'Campaign Created',
  'campaign.updated': 'Campaign Updated',
  'campaign.archived': 'Campaign Archived',
  'webhook.created': 'Webhook Created',
  'webhook.updated': 'Webhook Updated',
  'webhook.deleted': 'Webhook Deleted',
  'alert.created': 'Alert Created',
  'alert.updated': 'Alert Updated',
  'alert.deleted': 'Alert Deleted',
  'payment_provider.connected': 'Payment Provider Connected',
  'payment_provider.updated': 'Payment Provider Updated',
  'payment_provider.removed': 'Payment Provider Removed',
  'export.created': 'Export Created',
};

export default function AuditLogPage() {
  const params = useParams();
  const networkId = params.networkId as string;

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const pageSize = 50;

  const { data: actionsData } = useQuery<ActionsResponse>({
    queryKey: ['audit-actions', networkId],
    queryFn: () => api.get(`/networks/${networkId}/audit-logs/actions`),
  });

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', networkId, page, actionFilter],
    queryFn: () => {
      const params: Record<string, string> = {
        page: page.toString(),
        pageSize: pageSize.toString(),
      };
      if (actionFilter) {
        params.action = actionFilter;
      }
      return api.get(`/networks/${networkId}/audit-logs`, { params });
    },
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActionVariant = (action: string): 'success' | 'error' | 'warning' | 'brand' => {
    if (action.includes('created') || action.includes('joined')) return 'success';
    if (action.includes('deleted') || action.includes('removed') || action.includes('revoked')) return 'error';
    if (action.includes('updated') || action.includes('changed')) return 'warning';
    return 'brand';
  };

  const toggleExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-28 bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Audit Log</h1>
          <p className="text-sm text-gray-400 mt-1">
            Track all actions in your network
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          className="h-9 px-3 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Actions</option>
          {actionsData?.actions.map((action) => (
            <option key={action} value={action}>
              {getActionLabel(action)}
            </option>
          ))}
        </select>

        <span className="text-sm text-gray-500">
          {data?.total.toLocaleString()} total events
        </span>
      </div>

      {/* Logs */}
      {data?.logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit logs found"
          description={actionFilter ? 'Try adjusting your filter' : 'Actions will appear here as they occur'}
        />
      ) : (
        <div className="space-y-2">
          {data?.logs.map((log) => (
            <Card key={log.id} padding="none">
              <CardContent className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge variant={getActionVariant(log.action)} size="sm">
                      {getActionLabel(log.action)}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm">
                      {log.user ? (
                        <span className="flex items-center gap-1.5 text-gray-200">
                          <User className="h-3.5 w-3.5 text-gray-500" />
                          {log.user.username}
                        </span>
                      ) : (
                        <span className="text-gray-500">System</span>
                      )}
                      {log.targetType && (
                        <span className="text-gray-500">
                          on <span className="text-gray-400">{log.targetType}</span>
                          {log.targetId && (
                            <code className="ml-1 text-xs text-gray-500">
                              ({log.targetId.slice(0, 8)}...)
                            </code>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {log.ipAddress && (
                      <span className="hidden md:flex items-center gap-1.5 font-mono text-xs">
                        <Globe className="h-3.5 w-3.5" />
                        {log.ipAddress}
                      </span>
                    )}
                    <span>{formatDate(log.createdAt)}</span>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => toggleExpanded(log.id)}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedLogs.has(log.id) ? 'rotate-180' : ''}`} />
                      </Button>
                    )}
                  </div>
                </div>
                {expandedLogs.has(log.id) && log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <pre className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-400 px-4">
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
      )}
    </div>
  );
}
