'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface ExportJob {
  id: string;
  type: 'players' | 'sessions' | 'payments' | 'analytics';
  format: 'csv' | 'json';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters: Record<string, string>;
  downloadUrl: string | null;
  expiresAt: string | null;
  rowCount: number | null;
  createdAt: string;
  completedAt: string | null;
}

interface ExportJobsResponse {
  jobs: ExportJob[];
}

const EXPORT_TYPES = [
  { id: 'players', label: 'Players', description: 'Export player data including lifetime stats' },
  { id: 'sessions', label: 'Sessions', description: 'Export session data with timestamps and gamemodes' },
  { id: 'payments', label: 'Payments', description: 'Export payment transactions' },
  { id: 'analytics', label: 'Analytics', description: 'Export aggregated analytics data' },
];

export default function ExportPage() {
  const params = useParams();
  const networkId = params.networkId as string;

  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<ExportJobsResponse>({
    queryKey: ['export-jobs', networkId],
    queryFn: () => api.get(`/networks/${networkId}/exports`),
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: (job: { type: string; format: string; filters: Record<string, string> }) =>
      api.post(`/networks/${networkId}/exports`, job),
    onSuccess: () => {
      refetch();
      setShowModal(false);
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusBadge = (status: ExportJob['status']) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 text-xs font-medium bg-gray-800 text-gray-300 rounded-md">Pending</span>;
      case 'processing':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-brand-500/10 text-brand-400 rounded-md border border-brand-500/30 flex items-center gap-1">
            <span className="animate-spin h-3 w-3 border-2 border-brand-400 border-t-transparent rounded-full" />
            Processing
          </span>
        );
      case 'completed':
        return <span className="px-2 py-0.5 text-xs font-medium bg-success-500/10 text-success-400 rounded-md border border-success-500/30">Completed</span>;
      case 'failed':
        return <span className="px-2 py-0.5 text-xs font-medium bg-error-500/10 text-error-400 rounded-md border border-error-500/30">Failed</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-gray-800/70 rounded-lg animate-pulse" />
            <div className="h-4 w-56 bg-gray-800/70 rounded animate-pulse" />
          </div>
          <div className="h-9 w-28 bg-gray-800/70 rounded-lg animate-pulse" />
        </div>
        <div className="rounded-xl bg-gray-900 overflow-hidden">
          <div className="flex gap-4 p-4 border-b border-gray-800 bg-gray-800/30">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 flex-1 bg-gray-800/70 rounded animate-pulse" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 p-4 border-b border-gray-800 last:border-0">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="h-4 flex-1 bg-gray-800/70 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Handle error state - show empty state instead of crashing
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Data Export</h1>
            <p className="text-base-content/60">
              Export your data for analysis or backup
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            + New Export
          </button>
        </div>
        <div className="text-center py-12">
          <p className="text-base-content/60 mb-4">No export jobs yet</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create your first export
          </button>
        </div>
        {showModal && (
          <ExportModal
            onClose={() => setShowModal(false)}
            onSave={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Data Export</h1>
          <p className="text-gray-400">
            Export your data for analysis or backup
          </p>
        </div>
        <button className="bg-brand-500 text-white hover:bg-brand-600 rounded-lg px-4 py-2 font-medium h-9 text-sm" onClick={() => setShowModal(true)}>
          + New Export
        </button>
      </div>

      {/* Export Jobs */}
      {data?.jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No export jobs yet</p>
          <button className="bg-brand-500 text-white hover:bg-brand-600 rounded-lg px-4 py-2 font-medium" onClick={() => setShowModal(true)}>
            Create your first export
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>Type</th>
                <th>Format</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.jobs.map((job) => (
                <tr key={job.id}>
                  <td className="capitalize font-medium">{job.type}</td>
                  <td className="uppercase text-sm">{job.format}</td>
                  <td>{getStatusBadge(job.status)}</td>
                  <td>{job.rowCount?.toLocaleString() || '-'}</td>
                  <td className="text-sm text-gray-400">{formatDate(job.createdAt)}</td>
                  <td>
                    {job.status === 'completed' && job.downloadUrl && (
                      <a
                        href={job.downloadUrl}
                        className="bg-brand-500 text-white hover:bg-brand-600 rounded-lg px-3 py-1 font-medium h-7 text-xs inline-flex items-center"
                        download
                      >
                        Download
                      </a>
                    )}
                    {job.expiresAt && job.status === 'completed' && (
                      <span className="text-xs text-gray-400 ml-2">
                        Expires {formatDate(job.expiresAt)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Export Modal */}
      {showModal && (
        <ExportModal
          onClose={() => setShowModal(false)}
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}

interface ExportModalProps {
  onClose: () => void;
  onSave: (data: { type: string; format: string; filters: Record<string, string> }) => void;
  isLoading: boolean;
}

function ExportModal({ onClose, onSave, isLoading }: ExportModalProps) {
  const [type, setType] = useState<string>('players');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filters: Record<string, string> = {};
    if (dateRange.start) filters.startDate = dateRange.start;
    if (dateRange.end) filters.endDate = dateRange.end;
    onSave({ type, format, filters });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-2xl max-w-2xl w-full mx-4">
        <h3 className="font-bold text-lg">Create Export</h3>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">
              Data Type
            </label>
            <div className="grid gap-2">
              {EXPORT_TYPES.map((exportType) => (
                <label
                  key={exportType.id}
                  className={`cursor-pointer justify-start gap-3 rounded-lg px-4 py-3 border ${
                    type === exportType.id ? 'border-brand-500/30 bg-brand-500/10' : 'border-gray-800 bg-gray-900'
                  }`}
                >
                  <input
                    type="radio"
                    className="rounded border-gray-700 text-brand-500 focus:ring-brand-500"
                    checked={type === exportType.id}
                    onChange={() => setType(exportType.id)}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-300">{exportType.label}</span>
                    <p className="text-xs text-gray-500">{exportType.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">
              Format
            </label>
            <div className="flex gap-4">
              <label className="cursor-pointer gap-2 flex items-center">
                <input
                  type="radio"
                  className="rounded border-gray-700 text-brand-500 focus:ring-brand-500"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                />
                <span className="text-sm font-medium text-gray-300">CSV</span>
              </label>
              <label className="cursor-pointer gap-2 flex items-center">
                <input
                  type="radio"
                  className="rounded border-gray-700 text-brand-500 focus:ring-brand-500"
                  checked={format === 'json'}
                  onChange={() => setFormat('json')}
                />
                <span className="text-sm font-medium text-gray-300">JSON</span>
              </label>
            </div>
          </div>

          {(type === 'sessions' || type === 'payments' || type === 'analytics') && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">
                Date Range (optional)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  className="border border-gray-700 bg-gray-900 rounded-lg px-3 py-2 text-gray-100 focus:ring-2 focus:ring-brand-500"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
                <input
                  type="date"
                  className="border border-gray-700 bg-gray-900 rounded-lg px-3 py-2 text-gray-100 focus:ring-2 focus:ring-brand-500"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
              <p className="text-sm text-gray-500">Leave empty to export all data</p>
            </div>
          )}

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 border-brand-500/30 bg-brand-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current text-brand-400 shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-sm">
              Large exports may take several minutes. You&apos;ll receive a notification when ready.
              Download links expire after 24 hours.
            </span>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="hover:bg-gray-800 text-gray-300 hover:text-gray-100 rounded-lg px-4 py-2 font-medium" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="bg-brand-500 text-white hover:bg-brand-600 rounded-lg px-4 py-2 font-medium" disabled={isLoading}>
              {isLoading ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : 'Start Export'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
