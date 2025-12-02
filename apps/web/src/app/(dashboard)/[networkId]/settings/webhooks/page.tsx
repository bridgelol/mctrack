'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string | null;
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
}

interface WebhooksResponse {
  webhooks: Webhook[];
}

const AVAILABLE_EVENTS = [
  { id: 'player.first_join', label: 'Player First Join', description: 'When a new player joins for the first time' },
  { id: 'player.session_start', label: 'Session Start', description: 'When a player starts a session' },
  { id: 'player.session_end', label: 'Session End', description: 'When a player ends a session' },
  { id: 'payment.completed', label: 'Payment Completed', description: 'When a payment is successfully processed' },
  { id: 'payment.refunded', label: 'Payment Refunded', description: 'When a payment is refunded' },
  { id: 'campaign.started', label: 'Campaign Started', description: 'When a campaign becomes active' },
  { id: 'campaign.ended', label: 'Campaign Ended', description: 'When a campaign ends' },
  { id: 'alert.triggered', label: 'Alert Triggered', description: 'When an alert condition is met' },
];

export default function WebhooksPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);

  const { data, isLoading } = useQuery<WebhooksResponse>({
    queryKey: ['webhooks', networkId],
    queryFn: () => api.get(`/networks/${networkId}/webhooks`),
  });

  const createMutation = useMutation({
    mutationFn: (webhook: { name: string; url: string; events: string[]; secret?: string }) =>
      editingWebhook
        ? api.patch(`/networks/${networkId}/webhooks/${editingWebhook.id}`, webhook)
        : api.post(`/networks/${networkId}/webhooks`, webhook),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', networkId] });
      setShowModal(false);
      setEditingWebhook(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (webhookId: string) =>
      api.delete(`/networks/${networkId}/webhooks/${webhookId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', networkId] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/networks/${networkId}/webhooks/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', networkId] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (webhookId: string) =>
      api.post(`/networks/${networkId}/webhooks/${webhookId}/test`, {}),
  });

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
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-base-content/60">
            Send real-time notifications to external services
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setEditingWebhook(null);
            setShowModal(true);
          }}
        >
          + Create Webhook
        </button>
      </div>

      {/* Webhooks List */}
      {data?.webhooks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-base-content/60 mb-4">No webhooks configured</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create your first webhook
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.webhooks.map((webhook) => (
            <div key={webhook.id} className="card bg-base-200">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      {webhook.name}
                      {webhook.isActive ? (
                        <span className="badge badge-success badge-sm">Active</span>
                      ) : (
                        <span className="badge badge-ghost badge-sm">Inactive</span>
                      )}
                      {webhook.failureCount > 0 && (
                        <span className="badge badge-error badge-sm">
                          {webhook.failureCount} failures
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-base-content/60 font-mono break-all">
                      {webhook.url}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => testMutation.mutate(webhook.id)}
                      disabled={testMutation.isPending}
                    >
                      {testMutation.isPending ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        'Test'
                      )}
                    </button>
                    <div className="dropdown dropdown-end">
                      <label tabIndex={0} className="btn btn-ghost btn-sm btn-square">
                        ⋮
                      </label>
                      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-300 rounded-box w-40">
                        <li>
                          <button onClick={() => {
                            setEditingWebhook(webhook);
                            setShowModal(true);
                          }}>
                            Edit
                          </button>
                        </li>
                        <li>
                          <button onClick={() => toggleMutation.mutate({
                            id: webhook.id,
                            isActive: !webhook.isActive,
                          })}>
                            {webhook.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </li>
                        <li>
                          <button
                            className="text-error"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this webhook?')) {
                                deleteMutation.mutate(webhook.id);
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

                <div className="flex flex-wrap gap-1 mt-2">
                  {webhook.events.map((event) => (
                    <span key={event} className="badge badge-sm badge-outline">
                      {event}
                    </span>
                  ))}
                </div>

                <div className="text-sm text-base-content/60 mt-2">
                  Last triggered: {formatDate(webhook.lastTriggeredAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <WebhookModal
          webhook={editingWebhook}
          onClose={() => {
            setShowModal(false);
            setEditingWebhook(null);
          }}
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}

interface WebhookModalProps {
  webhook: Webhook | null;
  onClose: () => void;
  onSave: (data: { name: string; url: string; events: string[]; secret?: string }) => void;
  isLoading: boolean;
}

function WebhookModal({ webhook, onClose, onSave, isLoading }: WebhookModalProps) {
  const [name, setName] = useState(webhook?.name || '');
  const [url, setUrl] = useState(webhook?.url || '');
  const [events, setEvents] = useState<string[]>(webhook?.events || []);
  const [secret, setSecret] = useState('');

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      url,
      events,
      secret: secret || undefined,
    });
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">{webhook ? 'Edit Webhook' : 'Create Webhook'}</h3>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="e.g., Discord Notifications"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">URL</span>
            </label>
            <input
              type="url"
              className="input input-bordered"
              placeholder="https://example.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Secret (optional)</span>
            </label>
            <input
              type="password"
              className="input input-bordered"
              placeholder={webhook?.secret ? '••••••••' : 'Enter a secret for signature verification'}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <label className="label">
              <span className="label-text-alt">
                {webhook ? 'Leave blank to keep existing secret' : 'Used to sign webhook payloads'}
              </span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Events</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {AVAILABLE_EVENTS.map((event) => (
                <label
                  key={event.id}
                  className="label cursor-pointer justify-start gap-2 bg-base-200 rounded-lg px-3"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={events.includes(event.id)}
                    onChange={() => toggleEvent(event.id)}
                  />
                  <div>
                    <span className="label-text font-medium">{event.label}</span>
                    <p className="text-xs text-base-content/60">{event.description}</p>
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
              disabled={isLoading || events.length === 0}
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
