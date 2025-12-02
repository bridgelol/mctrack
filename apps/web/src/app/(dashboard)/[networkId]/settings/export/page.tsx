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

  const { data, isLoading, refetch } = useQuery<ExportJobsResponse>({
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
        return <span className="badge badge-ghost badge-sm">Pending</span>;
      case 'processing':
        return (
          <span className="badge badge-info badge-sm flex items-center gap-1">
            <span className="loading loading-spinner loading-xs" />
            Processing
          </span>
        );
      case 'completed':
        return <span className="badge badge-success badge-sm">Completed</span>;
      case 'failed':
        return <span className="badge badge-error badge-sm">Failed</span>;
    }
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
          <h1 className="text-2xl font-bold">Data Export</h1>
          <p className="text-base-content/60">
            Export your data for analysis or backup
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          + New Export
        </button>
      </div>

      {/* Export Jobs */}
      {data?.jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-base-content/60 mb-4">No export jobs yet</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create your first export
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
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
                  <td className="text-sm text-base-content/60">{formatDate(job.createdAt)}</td>
                  <td>
                    {job.status === 'completed' && job.downloadUrl && (
                      <a
                        href={job.downloadUrl}
                        className="btn btn-primary btn-xs"
                        download
                      >
                        Download
                      </a>
                    )}
                    {job.expiresAt && job.status === 'completed' && (
                      <span className="text-xs text-base-content/60 ml-2">
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
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Create Export</h3>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Data Type</span>
            </label>
            <div className="grid gap-2">
              {EXPORT_TYPES.map((exportType) => (
                <label
                  key={exportType.id}
                  className={`label cursor-pointer justify-start gap-3 rounded-lg px-4 py-3 border ${
                    type === exportType.id ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-200'
                  }`}
                >
                  <input
                    type="radio"
                    className="radio radio-primary"
                    checked={type === exportType.id}
                    onChange={() => setType(exportType.id)}
                  />
                  <div>
                    <span className="label-text font-medium">{exportType.label}</span>
                    <p className="text-xs text-base-content/60">{exportType.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Format</span>
            </label>
            <div className="flex gap-4">
              <label className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  className="radio radio-primary"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                />
                <span className="label-text">CSV</span>
              </label>
              <label className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  className="radio radio-primary"
                  checked={format === 'json'}
                  onChange={() => setFormat('json')}
                />
                <span className="label-text">JSON</span>
              </label>
            </div>
          </div>

          {(type === 'sessions' || type === 'payments' || type === 'analytics') && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Date Range (optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  className="input input-bordered"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
                <input
                  type="date"
                  className="input input-bordered"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
              <label className="label">
                <span className="label-text-alt">Leave empty to export all data</span>
              </label>
            </div>
          )}

          <div className="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-sm">
              Large exports may take several minutes. You&apos;ll receive a notification when ready.
              Download links expire after 24 hours.
            </span>
          </div>

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? <span className="loading loading-spinner loading-sm" /> : 'Start Export'}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
