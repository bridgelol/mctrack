'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { Bell, Plus, MoreVertical, Pencil, Trash2, Clock, Power, PowerOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  timeWindow: number;
  channels: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

interface AlertsResponse {
  alerts: Alert[];
}

const METRICS = [
  { id: 'concurrent_players', label: 'Concurrent Players', unit: 'players' },
  { id: 'sessions_per_hour', label: 'Sessions per Hour', unit: 'sessions' },
  { id: 'revenue_per_hour', label: 'Revenue per Hour', unit: 'USD' },
  { id: 'new_players_per_hour', label: 'New Players per Hour', unit: 'players' },
  { id: 'avg_session_length', label: 'Avg Session Length', unit: 'minutes' },
  { id: 'payment_conversion_rate', label: 'Payment Conversion Rate', unit: '%' },
];

const CONDITIONS = [
  { id: 'gt', label: 'Greater than', symbol: '>' },
  { id: 'gte', label: 'Greater than or equal', symbol: '>=' },
  { id: 'lt', label: 'Less than', symbol: '<' },
  { id: 'lte', label: 'Less than or equal', symbol: '<=' },
  { id: 'eq', label: 'Equal to', symbol: '=' },
];

const CHANNELS = [
  { id: 'email', label: 'Email', description: 'Send to team members' },
  { id: 'webhook', label: 'Webhook', description: 'Trigger configured webhooks' },
  { id: 'discord', label: 'Discord', description: 'Send to Discord channel' },
  { id: 'slack', label: 'Slack', description: 'Send to Slack channel' },
];

export default function AlertsPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const { data, isLoading } = useQuery<AlertsResponse>({
    queryKey: ['alerts', networkId],
    queryFn: () => api.get(`/networks/${networkId}/alerts`),
  });

  const createMutation = useMutation({
    mutationFn: (alert: Partial<Alert>) =>
      editingAlert
        ? api.patch(`/networks/${networkId}/alerts/${editingAlert.id}`, alert)
        : api.post(`/networks/${networkId}/alerts`, alert),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', networkId] });
      setShowModal(false);
      setEditingAlert(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (alertId: string) =>
      api.delete(`/networks/${networkId}/alerts/${alertId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', networkId] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/networks/${networkId}/alerts/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', networkId] });
    },
  });

  const getMetricLabel = (metricId: string) => {
    return METRICS.find((m) => m.id === metricId)?.label || metricId;
  };

  const getConditionSymbol = (condition: string) => {
    return CONDITIONS.find((c) => c.id === condition)?.symbol || condition;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-24 bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-4 w-56 bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
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
          <h1 className="text-2xl font-bold text-gray-50">Alerts</h1>
          <p className="text-sm text-gray-400 mt-1">
            Get notified when metrics cross thresholds
          </p>
        </div>
        <Button onClick={() => { setEditingAlert(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Alert
        </Button>
      </div>

      {/* Alerts List */}
      {data?.alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No alerts configured"
          description="Create an alert to get notified when important metrics change"
          action={{
            label: 'Create Alert',
            onClick: () => setShowModal(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {data?.alerts.map((alert) => (
            <Card key={alert.id} padding="none" className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      alert.isActive ? "bg-brand-500/20" : "bg-gray-800"
                    )}>
                      <Bell className={cn(
                        "h-5 w-5",
                        alert.isActive ? "text-brand-400" : "text-gray-500"
                      )} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-50">{alert.name}</h3>
                        <Badge variant={alert.isActive ? 'success' : 'gray'} size="sm" dot>
                          {alert.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        When <span className="font-medium text-gray-200">{getMetricLabel(alert.metric)}</span>{' '}
                        is {getConditionSymbol(alert.condition)}{' '}
                        <span className="font-medium text-gray-200">{alert.threshold}</span>{' '}
                        over <span className="font-medium text-gray-200">{alert.timeWindow}</span> minutes
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex gap-1.5">
                          {alert.channels.map((channel) => (
                            <Badge key={channel} variant="outline" size="sm" className="capitalize">
                              {channel}
                            </Badge>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last triggered: {formatDate(alert.lastTriggeredAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMutation.mutate({ id: alert.id, isActive: !alert.isActive })}
                      className={alert.isActive ? 'text-gray-400' : 'text-success-400'}
                    >
                      {alert.isActive ? (
                        <><PowerOff className="h-4 w-4 mr-1" /> Off</>
                      ) : (
                        <><Power className="h-4 w-4 mr-1" /> On</>
                      )}
                    </Button>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setOpenDropdown(openDropdown === alert.id ? null : alert.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {openDropdown === alert.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute right-0 mt-1 w-36 z-50 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1">
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                              onClick={() => {
                                setEditingAlert(alert);
                                setShowModal(true);
                                setOpenDropdown(null);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-400 hover:bg-gray-800"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this alert?')) {
                                  deleteMutation.mutate(alert.id);
                                }
                                setOpenDropdown(null);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AlertModal
        isOpen={showModal}
        alert={editingAlert}
        onClose={() => { setShowModal(false); setEditingAlert(null); }}
        onSave={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}

interface AlertModalProps {
  isOpen: boolean;
  alert: Alert | null;
  onClose: () => void;
  onSave: (data: Partial<Alert>) => void;
  isLoading: boolean;
}

function AlertModal({ isOpen, alert, onClose, onSave, isLoading }: AlertModalProps) {
  const [formData, setFormData] = useState({
    name: alert?.name || '',
    metric: alert?.metric || METRICS[0].id,
    condition: alert?.condition || 'gt',
    threshold: alert?.threshold || 0,
    timeWindow: alert?.timeWindow || 15,
    channels: alert?.channels || [],
  });

  const toggleChannel = (channel: string) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleClose = () => {
    setFormData({
      name: alert?.name || '',
      metric: alert?.metric || METRICS[0].id,
      condition: alert?.condition || 'gt',
      threshold: alert?.threshold || 0,
      timeWindow: alert?.timeWindow || 15,
      channels: alert?.channels || [],
    });
    onClose();
  };

  const selectedMetric = METRICS.find((m) => m.id === formData.metric);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={alert ? 'Edit Alert' : 'Create Alert'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Alert Name"
          placeholder="e.g., Low Player Count"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        {/* Condition Builder */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <p className="text-sm text-gray-400 mb-4">Trigger when:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Metric</label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={formData.metric}
                  onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
                >
                  {METRICS.map((metric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Condition</label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as Alert['condition'] })}
                >
                  {CONDITIONS.map((cond) => (
                    <option key={cond.id} value={cond.id}>
                      {cond.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Threshold {selectedMetric && <span className="text-gray-500">({selectedMetric.unit})</span>}
                </label>
                <input
                  type="number"
                  className="w-full h-10 px-3 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-gray-300">Time Window</label>
              <select
                className="w-full max-w-xs h-10 px-3 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={formData.timeWindow}
                onChange={(e) => setFormData({ ...formData, timeWindow: parseInt(e.target.value) })}
              >
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="360">6 hours</option>
                <option value="1440">24 hours</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Notification Channels
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CHANNELS.map((channel) => (
              <label
                key={channel.id}
                className={cn(
                  'cursor-pointer flex items-start gap-3 rounded-lg px-3 py-2.5 border transition-colors',
                  formData.channels.includes(channel.id)
                    ? 'border-brand-500/30 bg-brand-500/10'
                    : 'border-gray-800 bg-gray-900 hover:bg-gray-800/50'
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-gray-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-gray-900"
                  checked={formData.channels.includes(channel.id)}
                  onChange={() => toggleChannel(channel.id)}
                />
                <div>
                  <span className="text-sm font-medium text-gray-200">{channel.label}</span>
                  <p className="text-xs text-gray-500">{channel.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || formData.channels.length === 0 || !formData.name.trim()}
            isLoading={isLoading}
          >
            {alert ? 'Save Changes' : 'Create Alert'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
