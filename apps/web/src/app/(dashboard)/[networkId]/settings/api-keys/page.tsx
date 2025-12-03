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
import { Key, Plus, Copy, Check, Trash2, AlertTriangle, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
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
          <h1 className="text-2xl font-bold text-gray-50">API Keys</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage API keys for your Minecraft server plugins
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      {/* New Key Secret Display */}
      {newKeySecret && (
        <SecretBanner
          secret={newKeySecret}
          onDismiss={() => setNewKeySecret(null)}
        />
      )}

      {/* Keys List */}
      {data?.keys.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API keys yet"
          description="Create an API key to connect your Minecraft server plugins to MCTrack"
          action={{
            label: 'Create API Key',
            onClick: () => setShowCreateModal(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {data?.keys.map((key) => (
            <Card key={key.id} padding="none" className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-50">{key.name}</h3>
                        {key.gamemode && (
                          <Badge variant="brand" size="sm">
                            {key.gamemode.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-sm">
                        <code className="px-2 py-0.5 bg-gray-800 rounded text-gray-400 font-mono text-xs">
                          {key.keyPrefix}...
                        </code>
                        <span className="text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : 'Never used'}
                        </span>
                      </div>
                      {key.scopes && key.scopes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {key.scopes.slice(0, 4).map((scope) => (
                            <Badge key={scope} variant="outline" size="sm">
                              {scope}
                            </Badge>
                          ))}
                          {key.scopes.length > 4 && (
                            <Badge variant="gray" size="sm">
                              +{key.scopes.length - 4} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.expiresAt && (
                      <span className="text-xs text-gray-500">
                        Expires {formatDate(key.expiresAt)}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-error-400 hover:text-error-300 hover:bg-error-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
                          deleteMutation.mutate(key.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
        gamemodes={gamemodesData?.gamemodes || []}
      />
    </div>
  );
}

interface SecretBannerProps {
  secret: string;
  onDismiss: () => void;
}

function SecretBanner({ secret, onDismiss }: SecretBannerProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-warning-500/30 bg-warning-500/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-warning-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-warning-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-warning-200 mb-1">Save your API key!</h3>
            <p className="text-sm text-gray-400 mb-3">
              This is the only time you&apos;ll see the full key. Copy it now and add it to your server&apos;s config.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-900 px-3 py-2 rounded-lg text-sm text-gray-200 font-mono break-all border border-gray-800">
                {secret}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="flex-shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-success-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface CreateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; scopes: string[]; expiresAt?: string; gamemodeId?: string }) => void;
  isLoading: boolean;
  gamemodes: Gamemode[];
}

function CreateKeyModal({ isOpen, onClose, onSave, isLoading, gamemodes }: CreateKeyModalProps) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [gamemodeId, setGamemodeId] = useState<string>('');

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const selectAllScopes = () => {
    setScopes(AVAILABLE_SCOPES.map(s => s.id));
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

  const handleClose = () => {
    setName('');
    setScopes([]);
    setExpiresIn('never');
    setGamemodeId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create API Key" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Name"
          placeholder="e.g., Production Server, SkyBlock Plugin"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {gamemodes.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Gamemode (optional)
            </label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            <p className="text-xs text-gray-500">
              Scope this key to a specific gamemode for per-server tracking
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">
              Permissions
            </label>
            <button
              type="button"
              onClick={selectAllScopes}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              Select all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_SCOPES.map((scope) => (
              <label
                key={scope.id}
                className={cn(
                  'cursor-pointer flex items-start gap-3 rounded-lg px-3 py-2.5 border transition-colors',
                  scopes.includes(scope.id)
                    ? 'border-brand-500/30 bg-brand-500/10'
                    : 'border-gray-800 bg-gray-900 hover:bg-gray-800/50'
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-gray-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-gray-900"
                  checked={scopes.includes(scope.id)}
                  onChange={() => toggleScope(scope.id)}
                />
                <div>
                  <span className="text-sm font-medium text-gray-200">{scope.label}</span>
                  <p className="text-xs text-gray-500">{scope.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Expiration
          </label>
          <select
            className="w-full h-10 px-3 rounded-lg border border-gray-700 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
          >
            <option value="never">Never expires</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">1 year</option>
          </select>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || scopes.length === 0 || !name.trim()}
            isLoading={isLoading}
          >
            <Shield className="h-4 w-4 mr-2" />
            Create Key
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
