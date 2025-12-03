'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { Download, Plus, FileDown, Clock, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  { id: 'players', label: 'Players', description: 'Export player data including lifetime stats', icon: '👤' },
  { id: 'sessions', label: 'Sessions', description: 'Export session data with timestamps and gamemodes', icon: '📊' },
  { id: 'payments', label: 'Payments', description: 'Export payment transactions', icon: '💳' },
  { id: 'analytics', label: 'Analytics', description: 'Export aggregated analytics data', icon: '📈' },
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
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: ExportJob['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="gray" size="sm">Pending</Badge>;
      case 'processing':
        return (
          <Badge variant="brand" size="sm" className="gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case 'completed':
        return <Badge variant="success" size="sm">Completed</Badge>;
      case 'failed':
        return <Badge variant="error" size="sm">Failed</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-4 w-56 bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Handle error state
  const jobs = error ? [] : data?.jobs || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Data Export</h1>
          <p className="text-sm text-gray-400 mt-1">
            Export your data for analysis or backup
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Export
        </Button>
      </div>

      {/* Export Jobs */}
      {jobs.length === 0 ? (
        <EmptyState
          icon={Download}
          title="No export jobs yet"
          description="Create an export to download your data in CSV or JSON format"
          action={{
            label: 'Create Export',
            onClick: () => setShowModal(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} padding="none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gray-800 flex items-center justify-center">
                      <FileDown className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-100 capitalize">{job.type}</h3>
                        <Badge variant="outline" size="sm" className="uppercase">
                          {job.format}
                        </Badge>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(job.createdAt)}
                        </span>
                        {job.rowCount !== null && (
                          <span>{job.rowCount.toLocaleString()} rows</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.status === 'completed' && job.downloadUrl && (
                      <>
                        {job.expiresAt && (
                          <span className="text-xs text-gray-500">
                            Expires {formatDate(job.expiresAt)}
                          </span>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => window.open(job.downloadUrl!, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Export Modal */}
      <ExportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { type: string; format: string; filters: Record<string, string> }) => void;
  isLoading: boolean;
}

function ExportModal({ isOpen, onClose, onSave, isLoading }: ExportModalProps) {
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

  const handleClose = () => {
    setType('players');
    setFormat('csv');
    setDateRange({ start: '', end: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Export" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Data Type</label>
          <div className="grid grid-cols-2 gap-2">
            {EXPORT_TYPES.map((exportType) => (
              <label
                key={exportType.id}
                className={cn(
                  'cursor-pointer flex items-start gap-3 rounded-lg px-3 py-3 border transition-colors',
                  type === exportType.id
                    ? 'border-brand-500/30 bg-brand-500/10'
                    : 'border-gray-800 bg-gray-900 hover:bg-gray-800/50'
                )}
              >
                <input
                  type="radio"
                  className="mt-1 rounded-full border-gray-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-gray-900"
                  checked={type === exportType.id}
                  onChange={() => setType(exportType.id)}
                />
                <div>
                  <span className="text-sm font-medium text-gray-200">{exportType.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{exportType.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Format</label>
          <div className="flex gap-4">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="radio"
                className="rounded-full border-gray-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-gray-900"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
              />
              <span className="text-sm font-medium text-gray-200">CSV</span>
            </label>
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="radio"
                className="rounded-full border-gray-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-gray-900"
                checked={format === 'json'}
                onChange={() => setFormat('json')}
              />
              <span className="text-sm font-medium text-gray-200">JSON</span>
            </label>
          </div>
        </div>

        {(type === 'sessions' || type === 'payments' || type === 'analytics') && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Date Range (optional)</label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                className="h-10 px-3 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <input
                type="date"
                className="h-10 px-3 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <p className="text-xs text-gray-500">Leave empty to export all data</p>
          </div>
        )}

        <Card className="border-brand-500/30 bg-brand-500/5">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-brand-400 flex-shrink-0" />
              <p className="text-sm text-gray-400">
                Large exports may take several minutes. You&apos;ll be able to download the file once it&apos;s ready. Download links expire after 24 hours.
              </p>
            </div>
          </CardContent>
        </Card>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} isLoading={isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Start Export
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
