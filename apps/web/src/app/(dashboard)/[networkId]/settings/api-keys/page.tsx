'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Gamemode {
  id: string;
  name: string;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  gamemodeId: string | null;
  gamemode?: Gamemode | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ApiKeysResponse {
  keys: ApiKey[];
}

interface GamemodesResponse {
  gamemodes: Gamemode[];
}

interface NewKeyResponse {
  key: ApiKey;
  secret: string;
}

const AVAILABLE_SCOPES = [
  { id: 'read:players', label: 'Read Players', description: 'View player data' },
  { id: 'write:players', label: 'Write Players', description: 'Create/update player data' },
  { id: 'read:sessions', label: 'Read Sessions', description: 'View session data' },
  { id: 'write:sessions', label: 'Write Sessions', description: 'Create session events' },
  { id: 'read:payments', label: 'Read Payments', description: 'View payment data' },
  { id: 'write:payments', label: 'Write Payments', description: 'Create payment events' },
  { id: 'read:analytics', label: 'Read Analytics', description: 'Access analytics endpoints' },
  { id: 'manage:webhooks', label: 'Manage Webhooks', description: 'Configure webhooks' },
];

export default function ApiKeysPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ApiKeysResponse>({
    queryKey: ['api-keys', networkId],
    queryFn: () => api.get(`/networks/${networkId}/api-keys`),
  });

  const { data: gamemodesData } = useQuery<GamemodesResponse>({
    queryKey: ['gamemodes', networkId],
    queryFn: () => api.get(`/networks/${networkId}/gamemodes`),
  });

  const createMutation = useMutation({
    mutationFn: (keyData: { name: string; scopes: string[]; expiresAt?: string; gamemodeId?: string }) =>
      api.post<NewKeyResponse>(`/networks/${networkId}/api-keys`, keyData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', networkId] });
      setShowCreateModal(false);
      setNewKeySecret(data.secret);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (keyId: string) =>
      api.delete(`/networks/${networkId}/api-keys/${keyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', networkId] });
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-base-300/70 rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-base-300/70 rounded animate-pulse" />
          </div>
          <div className="h-9 w-36 bg-base-300/70 rounded-lg animate-pulse" />
        </div>
        <div className="rounded-xl bg-base-200 overflow-hidden">
          <div className="flex gap-4 p-4 border-b border-base-300 bg-base-300/30">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-4 flex-1 bg-base-300/70 rounded animate-pulse" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 p-4 border-b border-base-300 last:border-0">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="h-4 flex-1 bg-base-300/70 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-base-content/60">
            Manage API keys for server integrations
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          + Create API Key
        </button>
      </div>

      {/* Secret Display */}
      {newKeySecret && (
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <h3 className="font-bold">Save your API key!</h3>
            <p className="text-sm">This is the only time you&apos;ll see the full key:</p>
            <code className="bg-base-300 px-2 py-1 rounded text-sm block mt-2 break-all">
              {newKeySecret}
            </code>
          </div>
          <button className="btn btn-sm" onClick={() => setNewKeySecret(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Keys List */}
      {data?.keys.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-base-content/60 mb-4">No API keys yet</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Create your first API key
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Gamemode</th>
                <th>Scopes</th>
                <th>Last Used</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.keys.map((key) => (
                <tr key={key.id}>
                  <td className="font-medium">{key.name}</td>
                  <td>
                    <code className="bg-base-300 px-2 py-1 rounded text-sm">
                      {key.keyPrefix}...
                    </code>
                  </td>
                  <td>
                    {key.gamemode ? (
                      <span className="badge badge-sm badge-primary">
                        {key.gamemode.name}
                      </span>
                    ) : (
                      <span className="text-base-content/50 text-sm">All gamemodes</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(key.scopes || []).slice(0, 3).map((scope) => (
                        <span key={scope} className="badge badge-sm badge-outline">
                          {scope}
                        </span>
                      ))}
                      {(key.scopes?.length || 0) > 3 && (
                        <span className="badge badge-sm">+{key.scopes!.length - 3}</span>
                      )}
                      {!key.scopes?.length && (
                        <span className="text-base-content/50 text-sm">All permissions</span>
                      )}
                    </div>
                  </td>
                  <td className="text-sm text-base-content/60">{formatDate(key.lastUsedAt)}</td>
                  <td className="text-sm text-base-content/60">
                    {key.expiresAt ? formatDate(key.expiresAt) : 'Never'}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => {
                        if (confirm('Are you sure you want to revoke this API key?')) {
                          deleteMutation.mutate(key.id);
                        }
                      }}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateKeyModal
          onClose={() => setShowCreateModal(false)}
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
          gamemodes={gamemodesData?.gamemodes || []}
        />
      )}
    </div>
  );
}

interface CreateKeyModalProps {
  onClose: () => void;
  onSave: (data: { name: string; scopes: string[]; expiresAt?: string; gamemodeId?: string }) => void;
  isLoading: boolean;
  gamemodes: Gamemode[];
}

function CreateKeyModal({ onClose, onSave, isLoading, gamemodes }: CreateKeyModalProps) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [gamemodeId, setGamemodeId] = useState<string>('');

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let expiresAt: string | undefined;
    if (expiresIn !== 'never') {
      const days = parseInt(expiresIn);
      const date = new Date();
      date.setDate(date.getDate() + days);
      expiresAt = date.toISOString();
    }

    onSave({
      name,
      scopes,
      expiresAt,
      gamemodeId: gamemodeId || undefined,
    });
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">Create API Key</h3>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="e.g., Production Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {gamemodes.length > 0 && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Gamemode (optional)</span>
              </label>
              <select
                className="select select-bordered"
                value={gamemodeId}
                onChange={(e) => setGamemodeId(e.target.value)}
              >
                <option value="">All gamemodes (network-wide)</option>
                {gamemodes.map((gm) => (
                  <option key={gm.id} value={gm.id}>
                    {gm.name}
                  </option>
                ))}
              </select>
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  Scoping to a gamemode restricts this key to only submit data for that gamemode
                </span>
              </label>
            </div>
          )}

          <div className="form-control">
            <label className="label">
              <span className="label-text">Scopes</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <label
                  key={scope.id}
                  className="label cursor-pointer justify-start gap-2 bg-base-200 rounded-lg px-3"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={scopes.includes(scope.id)}
                    onChange={() => toggleScope(scope.id)}
                  />
                  <div>
                    <span className="label-text font-medium">{scope.label}</span>
                    <p className="text-xs text-base-content/60">{scope.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Expiration</span>
            </label>
            <select
              className="select select-bordered"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
            >
              <option value="never">Never</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
            </select>
          </div>

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || scopes.length === 0}
            >
              {isLoading ? <span className="loading loading-spinner loading-sm" /> : 'Create Key'}
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
