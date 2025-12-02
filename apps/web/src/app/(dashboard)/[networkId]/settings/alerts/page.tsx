'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

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
    return new Date(dateStr).toLocaleString();
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
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-base-content/60">
            Get notified when metrics cross thresholds
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setEditingAlert(null);
            setShowModal(true);
          }}
        >
          + Create Alert
        </button>
      </div>

      {/* Alerts List */}
      {data?.alerts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-base-content/60 mb-4">No alerts configured</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create your first alert
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.alerts.map((alert) => (
            <div key={alert.id} className="card bg-base-200">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      {alert.name}
                      {alert.isActive ? (
                        <span className="badge badge-success badge-sm">Active</span>
                      ) : (
                        <span className="badge badge-ghost badge-sm">Inactive</span>
                      )}
                    </h3>
                    <p className="text-sm text-base-content/60 mt-1">
                      When <span className="font-medium">{getMetricLabel(alert.metric)}</span>{' '}
                      is {getConditionSymbol(alert.condition)}{' '}
                      <span className="font-medium">{alert.threshold}</span>{' '}
                      over {alert.timeWindow} minutes
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <label className="swap">
                      <input
                        type="checkbox"
                        checked={alert.isActive}
                        onChange={() => toggleMutation.mutate({
                          id: alert.id,
                          isActive: !alert.isActive,
                        })}
                      />
                      <span className="swap-on btn btn-sm btn-success">On</span>
                      <span className="swap-off btn btn-sm btn-ghost">Off</span>
                    </label>
                    <div className="dropdown dropdown-end">
                      <label tabIndex={0} className="btn btn-ghost btn-sm btn-square">
                        ⋮
                      </label>
                      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-300 rounded-box w-40">
                        <li>
                          <button onClick={() => {
                            setEditingAlert(alert);
                            setShowModal(true);
                          }}>
                            Edit
                          </button>
                        </li>
                        <li>
                          <button
                            className="text-error"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this alert?')) {
                                deleteMutation.mutate(alert.id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1">
                    {alert.channels.map((channel) => (
                      <span key={channel} className="badge badge-sm badge-outline capitalize">
                        {channel}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm text-base-content/60">
                    Last triggered: {formatDate(alert.lastTriggeredAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <AlertModal
          alert={editingAlert}
          onClose={() => {
            setShowModal(false);
            setEditingAlert(null);
          }}
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}

interface AlertModalProps {
  alert: Alert | null;
  onClose: () => void;
  onSave: (data: Partial<Alert>) => void;
  isLoading: boolean;
}

function AlertModal({ alert, onClose, onSave, isLoading }: AlertModalProps) {
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

  const selectedMetric = METRICS.find((m) => m.id === formData.metric);

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">{alert ? 'Edit Alert' : 'Create Alert'}</h3>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Alert Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="e.g., Low Player Count"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="card bg-base-300 p-4">
            <p className="text-sm mb-3">Trigger when:</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Metric</span>
                </label>
                <select
                  className="select select-bordered"
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

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Condition</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.condition}
                  onChange={(e) => setFormData({
                    ...formData,
                    condition: e.target.value as Alert['condition'],
                  })}
                >
                  {CONDITIONS.map((cond) => (
                    <option key={cond.id} value={cond.id}>
                      {cond.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">
                    Threshold {selectedMetric && `(${selectedMetric.unit})`}
                  </span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Time Window (minutes)</span>
              </label>
              <select
                className="select select-bordered w-full max-w-xs"
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
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Notification Channels</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CHANNELS.map((channel) => (
                <label
                  key={channel.id}
                  className="label cursor-pointer justify-start gap-2 bg-base-200 rounded-lg px-3"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={formData.channels.includes(channel.id)}
                    onChange={() => toggleChannel(channel.id)}
                  />
                  <div>
                    <span className="label-text font-medium">{channel.label}</span>
                    <p className="text-xs text-base-content/60">{channel.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || formData.channels.length === 0}
            >
              {isLoading ? <span className="loading loading-spinner loading-sm" /> : 'Save'}
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
