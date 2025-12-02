'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface PaymentProvider {
  id: string;
  provider: 'tebex' | 'paynow' | 'custom';
  name: string;
  isActive: boolean;
  lastSyncAt: string | null;
  config: {
    storeId?: string;
    secretConfigured?: boolean;
  };
  stats: {
    totalPayments: number;
    totalRevenue: number;
  };
}

interface ProvidersResponse {
  providers: PaymentProvider[];
}

export default function PaymentProvidersPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<PaymentProvider | null>(null);

  const { data, isLoading } = useQuery<ProvidersResponse>({
    queryKey: ['payment-providers', networkId],
    queryFn: () => api.get(`/networks/${networkId}/payment-providers`),
  });

  const createMutation = useMutation({
    mutationFn: (provider: { provider: string; name: string; config: Record<string, string> }) =>
      api.post(`/networks/${networkId}/payment-providers`, provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-providers', networkId] });
      setShowAddModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; isActive?: boolean; config?: Record<string, string> }) =>
      api.patch(`/networks/${networkId}/payment-providers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-providers', networkId] });
      setEditingProvider(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (providerId: string) =>
      api.delete(`/networks/${networkId}/payment-providers/${providerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-providers', networkId] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (providerId: string) =>
      api.post(`/networks/${networkId}/payment-providers/${providerId}/sync`, {}),
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
          <h1 className="text-2xl font-bold">Payment Providers</h1>
          <p className="text-base-content/60">
            Connect your payment processors to track revenue
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          + Add Provider
        </button>
      </div>

      {/* Providers List */}
      {data?.providers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-base-content/60 mb-4">No payment providers connected</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            Connect your first provider
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.providers.map((provider) => (
            <div key={provider.id} className="card bg-base-200">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <ProviderIcon provider={provider.provider} />
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        {provider.name}
                        {provider.isActive ? (
                          <span className="badge badge-success badge-sm">Active</span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">Inactive</span>
                        )}
                      </h3>
                      <p className="text-sm text-base-content/60 capitalize">
                        {provider.provider}
                        {provider.config.storeId && ` • Store: ${provider.config.storeId}`}
                      </p>
                    </div>
                  </div>

                  <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-ghost btn-sm btn-square">
                      ⋮
                    </label>
                    <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-300 rounded-box w-40">
                      <li>
                        <button onClick={() => setEditingProvider(provider)}>
                          Configure
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => syncMutation.mutate(provider.id)}
                          disabled={syncMutation.isPending}
                        >
                          {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => updateMutation.mutate({
                            id: provider.id,
                            isActive: !provider.isActive,
                          })}
                        >
                          {provider.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </li>
                      <li>
                        <button
                          className="text-error"
                          onClick={() => {
                            if (confirm('Are you sure you want to remove this provider?')) {
                              deleteMutation.mutate(provider.id);
                            }
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="text-sm text-base-content/60">Total Payments</div>
                    <div className="font-medium">{provider.stats.totalPayments.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-base-content/60">Total Revenue</div>
                    <div className="font-medium text-success">
                      ${provider.stats.totalRevenue.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-base-content/60">Last Sync</div>
                    <div className="font-medium text-sm">{formatDate(provider.lastSyncAt)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddProviderModal
          onClose={() => setShowAddModal(false)}
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingProvider && (
        <EditProviderModal
          provider={editingProvider}
          onClose={() => setEditingProvider(null)}
          onSave={(data) => updateMutation.mutate({ id: editingProvider.id, ...data })}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  const iconClass = "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold";

  switch (provider) {
    case 'tebex':
      return <div className={`${iconClass} bg-blue-600`}>T</div>;
    case 'paynow':
      return <div className={`${iconClass} bg-green-600`}>P</div>;
    default:
      return <div className={`${iconClass} bg-gray-600`}>C</div>;
  }
}

interface AddProviderModalProps {
  onClose: () => void;
  onSave: (data: { provider: string; name: string; config: Record<string, string> }) => void;
  isLoading: boolean;
}

function AddProviderModal({ onClose, onSave, isLoading }: AddProviderModalProps) {
  const [provider, setProvider] = useState<string>('tebex');
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ provider, name, config });
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Add Payment Provider</h3>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Provider</span>
            </label>
            <select
              className="select select-bordered"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setConfig({});
              }}
            >
              <option value="tebex">Tebex</option>
              <option value="paynow">PayNow</option>
              <option value="custom">Custom (Webhook)</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Display Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="e.g., Main Store"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {provider === 'tebex' && (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Store ID</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={config.storeId || ''}
                  onChange={(e) => setConfig({ ...config, storeId: e.target.value })}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">API Secret</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered"
                  value={config.apiSecret || ''}
                  onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                  required
                />
              </div>
            </>
          )}

          {provider === 'paynow' && (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">API Key</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Server ID</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={config.serverId || ''}
                  onChange={(e) => setConfig({ ...config, serverId: e.target.value })}
                  required
                />
              </div>
            </>
          )}

          {provider === 'custom' && (
            <div className="alert">
              <span>Custom providers receive payment data via webhooks. Configure your webhook endpoint after adding.</span>
            </div>
          )}

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? <span className="loading loading-spinner loading-sm" /> : 'Add Provider'}
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

interface EditProviderModalProps {
  provider: PaymentProvider;
  onClose: () => void;
  onSave: (data: { name?: string; config?: Record<string, string> }) => void;
  isLoading: boolean;
}

function EditProviderModal({ provider, onClose, onSave, isLoading }: EditProviderModalProps) {
  const [name, setName] = useState(provider.name);
  const [config, setConfig] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: { name?: string; config?: Record<string, string> } = {};
    if (name !== provider.name) updates.name = name;
    if (Object.keys(config).length > 0) updates.config = config;
    onSave(updates);
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure {provider.name}</h3>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Display Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {provider.provider === 'tebex' && (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Store ID</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder={provider.config.storeId || 'Enter new store ID'}
                  value={config.storeId || ''}
                  onChange={(e) => setConfig({ ...config, storeId: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">API Secret</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered"
                  placeholder={provider.config.secretConfigured ? '••••••••' : 'Enter API secret'}
                  value={config.apiSecret || ''}
                  onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                />
                <label className="label">
                  <span className="label-text-alt">Leave blank to keep existing secret</span>
                </label>
              </div>
            </>
          )}

          {provider.provider === 'paynow' && (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">API Key</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered"
                  placeholder={provider.config.secretConfigured ? '••••••••' : 'Enter API key'}
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                />
                <label className="label">
                  <span className="label-text-alt">Leave blank to keep existing key</span>
                </label>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Server ID</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="Enter new server ID"
                  value={config.serverId || ''}
                  onChange={(e) => setConfig({ ...config, serverId: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? <span className="loading loading-spinner loading-sm" /> : 'Save Changes'}
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
