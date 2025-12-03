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
import { Webhook, Plus, MoreVertical, Play, Pencil, Trash2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebhookData {
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
  webhooks: WebhookData[];
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
  const [editingWebhook, setEditingWebhook] = useState<WebhookData | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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
            <div className="h-8 w-32 bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
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
          <h1 className="text-2xl font-bold text-gray-50">Webhooks</h1>
          <p className="text-sm text-gray-400 mt-1">
            Send real-time notifications to external services
          </p>
        </div>
        <Button onClick={() => { setEditingWebhook(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Webhook
        </Button>
      </div>

      {/* Webhooks List */}
      {data?.webhooks.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No webhooks configured"
          description="Create a webhook to send real-time event notifications to your services"
          action={{
            label: 'Create Webhook',
            onClick: () => setShowModal(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {data?.webhooks.map((webhook) => (
            <Card key={webhook.id} padding="none" className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      webhook.isActive ? "bg-success-500/20" : "bg-gray-800"
                    )}>
                      <Webhook className={cn(
                        "h-5 w-5",
                        webhook.isActive ? "text-success-400" : "text-gray-500"
                      )} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-50">{webhook.name}</h3>
                        <Badge variant={webhook.isActive ? 'success' : 'gray'} size="sm" dot>
                          {webhook.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {webhook.failureCount > 0 && (
                          <Badge variant="error" size="sm">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {webhook.failureCount} failures
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-mono mt-1 truncate">
                        {webhook.url}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {webhook.events.slice(0, 3).map((event) => (
                          <Badge key={event} variant="outline" size="sm">
                            {AVAILABLE_EVENTS.find(e => e.id === event)?.label || event}
                          </Badge>
                        ))}
                        {webhook.events.length > 3 && (
                          <Badge variant="gray" size="sm">
                            +{webhook.events.length - 3} more
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last triggered: {formatDate(webhook.lastTriggeredAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testMutation.mutate(webhook.id)}
                      disabled={testMutation.isPending}
                      isLoading={testMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setOpenDropdown(openDropdown === webhook.id ? null : webhook.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {openDropdown === webhook.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute right-0 mt-1 w-40 z-50 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1">
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                              onClick={() => {
                                setEditingWebhook(webhook);
                                setShowModal(true);
                                setOpenDropdown(null);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                              onClick={() => {
                                toggleMutation.mutate({ id: webhook.id, isActive: !webhook.isActive });
                                setOpenDropdown(null);
                              }}
                            >
                              {webhook.isActive ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-400 hover:bg-gray-800"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this webhook?')) {
                                  deleteMutation.mutate(webhook.id);
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
      <WebhookModal
        isOpen={showModal}
        webhook={editingWebhook}
        onClose={() => { setShowModal(false); setEditingWebhook(null); }}
        onSave={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}

interface WebhookModalProps {
  isOpen: boolean;
  webhook: WebhookData | null;
  onClose: () => void;
  onSave: (data: { name: string; url: string; events: string[]; secret?: string }) => void;
  isLoading: boolean;
}

function WebhookModal({ isOpen, webhook, onClose, onSave, isLoading }: WebhookModalProps) {
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

  const handleClose = () => {
    setName(webhook?.name || '');
    setUrl(webhook?.url || '');
    setEvents(webhook?.events || []);
    setSecret('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={webhook ? 'Edit Webhook' : 'Create Webhook'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Name"
          placeholder="e.g., Discord Notifications"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="URL"
          type="url"
          placeholder="https://example.com/webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />

        <Input
          label="Secret (optional)"
          type="password"
          placeholder={webhook?.secret ? '••••••••' : 'Enter a secret for signature verification'}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          hint={webhook ? 'Leave blank to keep existing secret' : 'Used to sign webhook payloads'}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Events
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {AVAILABLE_EVENTS.map((event) => (
              <label
                key={event.id}
                className={cn(
                  'cursor-pointer flex items-start gap-3 rounded-lg px-3 py-2.5 border transition-colors',
                  events.includes(event.id)
                    ? 'border-brand-500/30 bg-brand-500/10'
                    : 'border-gray-800 bg-gray-900 hover:bg-gray-800/50'
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-gray-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-gray-900"
                  checked={events.includes(event.id)}
                  onChange={() => toggleEvent(event.id)}
                />
                <div>
                  <span className="text-sm font-medium text-gray-200">{event.label}</span>
                  <p className="text-xs text-gray-500">{event.description}</p>
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
            disabled={isLoading || events.length === 0 || !name.trim() || !url.trim()}
            isLoading={isLoading}
          >
            {webhook ? 'Save Changes' : 'Create Webhook'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
