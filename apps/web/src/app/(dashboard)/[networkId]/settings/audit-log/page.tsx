'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

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
    return new Date(dateStr).toLocaleString();
  };

  const getActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action.replace(/[._]/g, ' ');
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('created') || action.includes('joined')) return 'badge-success';
    if (action.includes('deleted') || action.includes('removed') || action.includes('revoked')) return 'badge-error';
    if (action.includes('updated') || action.includes('changed')) return 'badge-warning';
    return 'badge-info';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-base-content/60">
            Track all actions in your network
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <select
          className="select select-bordered select-sm"
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

        <div className="text-sm text-base-content/60 self-center">
          {data?.total.toLocaleString()} total events
        </div>
      </div>

      {/* Logs */}
      {data?.logs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-base-content/60">No audit logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.logs.map((log) => (
            <div key={log.id} className="card bg-base-200">
              <div className="card-body py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`badge badge-sm ${getActionBadgeClass(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                    <span className="text-sm">
                      {log.user ? (
                        <span className="font-medium">{log.user.username}</span>
                      ) : (
                        <span className="text-base-content/60">System</span>
                      )}
                    </span>
                    {log.targetType && (
                      <span className="text-sm text-base-content/60">
                        on {log.targetType}
                        {log.targetId && (
                          <span className="font-mono text-xs ml-1">
                            ({log.targetId.slice(0, 8)}...)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-base-content/60">
                    {log.ipAddress && (
                      <span className="font-mono text-xs">{log.ipAddress}</span>
                    )}
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-base-content/60">
                      View details
                    </summary>
                    <pre className="mt-2 text-xs bg-base-300 p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
