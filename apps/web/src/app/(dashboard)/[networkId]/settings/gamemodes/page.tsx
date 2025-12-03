'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, EmptyState } from '@/components/ui';
import { Gamepad2, Plus, Pencil, Trash2, Server, Loader2, Key, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Gamemode {
  id: string;
  name: string;
  creationTime: string;
  _count?: {
    apiKeys: number;
  };
}

interface GamemodesResponse {
  gamemodes: Gamemode[];
}

interface NewKeyResponse {
  key: { id: string; name: string; keyPrefix: string };
  secret: string;
}

export default function GamemodesPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGamemode, setEditingGamemode] = useState<Gamemode | null>(null);
  const [creatingKeyForGamemode, setCreatingKeyForGamemode] = useState<Gamemode | null>(null);
  const [newApiKeySecret, setNewApiKeySecret] = useState<string | null>(null);

  const { data, isLoading } = useQuery<GamemodesResponse>({
    queryKey: ['gamemodes', networkId],
    queryFn: () => api.get(`/networks/${networkId}/gamemodes`),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      api.post(`/networks/${networkId}/gamemodes`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamemodes', networkId] });
      setShowCreateModal(false);
    },
    onError: (error: Error) => {
      console.error('Failed to create gamemode:', error);
      alert(`Failed to create gamemode: ${error.message}`);
    },
  });

  const createApiKeyMutation = useMutation({
    mutationFn: (data: { name: string; gamemodeId: string }) =>
      api.post<NewKeyResponse>(`/networks/${networkId}/api-keys`, {
        name: data.name,
        gamemodeId: data.gamemodeId,
        scopes: ['write:sessions', 'write:players'],
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['gamemodes', networkId] });
      queryClient.invalidateQueries({ queryKey: ['api-keys', networkId] });
      setCreatingKeyForGamemode(null);
      setNewApiKeySecret(response.secret);
    },
    onError: (error: Error) => {
      console.error('Failed to create API key:', error);
      alert(`Failed to create API key: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/networks/${networkId}/gamemodes/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamemodes', networkId] });
      setEditingGamemode(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/networks/${networkId}/gamemodes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamemodes', networkId] });
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-gray-800/70 rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-gray-800/70 rounded animate-pulse" />
          </div>
          <div className="h-9 w-36 bg-gray-800/70 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-gray-900 border border-gray-800 p-6">
              <div className="h-5 w-32 bg-gray-800/70 rounded animate-pulse mb-4" />
              <div className="h-4 w-24 bg-gray-800/70 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Gamemodes</h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure gamemodes for your network to track analytics per server type
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Gamemode
        </Button>
      </div>

      {/* New API Key Secret Display */}
      {newApiKeySecret && (
        <ApiKeySecretBanner
          secret={newApiKeySecret}
          onDismiss={() => setNewApiKeySecret(null)}
        />
      )}

      {/* Info Box */}
      <Card className="border-brand-500/30 bg-brand-500/5">
        <CardContent className="py-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Server className="h-5 w-5 text-brand-400" />
            </div>
            <div className="text-sm">
              <p className="text-gray-200 font-medium mb-1">What are Gamemodes?</p>
              <p className="text-gray-400">
                Gamemodes represent different server types in your network (e.g., SkyWars, BedWars, SMP).
                When players switch between servers, MCTrack tracks which gamemode they&apos;re playing.
                This enables per-gamemode analytics like playtime, retention, and revenue.
              </p>
              <p className="text-gray-400 mt-2">
                Create API keys scoped to specific gamemodes to organize your backend servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gamemodes Grid */}
      {!data?.gamemodes || data.gamemodes.length === 0 ? (
        <EmptyState
          icon={Gamepad2}
          title="No gamemodes yet"
          description="Create your first gamemode to start tracking per-server analytics"
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Gamemode
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.gamemodes.map((gamemode) => (
            <Card key={gamemode.id} className="group hover:border-gray-700 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-brand-500/20 flex items-center justify-center">
                      <Gamepad2 className="h-5 w-5 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-50">{gamemode.name}</h3>
                      <p className="text-xs text-gray-500">
                        Created {formatDate(gamemode.creationTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingGamemode(gamemode)}
                      className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
                      title="Edit gamemode"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${gamemode.name}"? This action cannot be undone.`)) {
                          deleteMutation.mutate(gamemode.id);
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-error-400 transition-colors"
                      title="Delete gamemode"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* API Key Section */}
                <div className="mt-4 pt-4 border-t border-gray-800">
                  {gamemode._count?.apiKeys !== undefined && gamemode._count.apiKeys > 0 ? (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        <Key className="h-3 w-3 inline mr-1" />
                        {gamemode._count.apiKeys} API key{gamemode._count.apiKeys !== 1 ? 's' : ''}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreatingKeyForGamemode(gamemode)}
                        className="text-xs h-7"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Key
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreatingKeyForGamemode(gamemode)}
                      className="w-full text-xs"
                    >
                      <Key className="h-3 w-3 mr-2" />
                      Create API Key
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <GamemodeModal
          title="Create Gamemode"
          onClose={() => setShowCreateModal(false)}
          onSave={(name) => createMutation.mutate(name)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingGamemode && (
        <GamemodeModal
          title="Edit Gamemode"
          initialName={editingGamemode.name}
          onClose={() => setEditingGamemode(null)}
          onSave={(name) => updateMutation.mutate({ id: editingGamemode.id, name })}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Create API Key Modal */}
      {creatingKeyForGamemode && (
        <CreateApiKeyModal
          gamemode={creatingKeyForGamemode}
          onClose={() => setCreatingKeyForGamemode(null)}
          onSave={(name) => createApiKeyMutation.mutate({ name, gamemodeId: creatingKeyForGamemode.id })}
          isLoading={createApiKeyMutation.isPending}
        />
      )}
    </div>
  );
}

interface GamemodeModalProps {
  title: string;
  initialName?: string;
  onClose: () => void;
  onSave: (name: string) => void;
  isLoading: boolean;
}

function GamemodeModal({ title, initialName = '', onClose, onSave, isLoading }: GamemodeModalProps) {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-950/80" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-800 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-50 mb-4">{title}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Gamemode Name"
            placeholder="e.g., SkyWars, BedWars, SMP"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <p className="text-xs text-gray-500">
            Choose a descriptive name that matches your server type. This will be visible in analytics.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {initialName ? 'Save Changes' : 'Create Gamemode'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CreateApiKeyModalProps {
  gamemode: Gamemode;
  onClose: () => void;
  onSave: (name: string) => void;
  isLoading: boolean;
}

function CreateApiKeyModal({ gamemode, onClose, onSave, isLoading }: CreateApiKeyModalProps) {
  const [name, setName] = useState(`${gamemode.name} Server`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-950/80" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-800 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-50 mb-4">Create API Key for {gamemode.name}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Key Name"
            placeholder="e.g., SkyWars Server 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-gray-400 font-medium">This key will have:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-success-400" />
                Write session data (player joins/leaves)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-success-400" />
                Write player data
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-success-400" />
                Scoped to <span className="text-brand-400 font-medium">{gamemode.name}</span> gamemode
              </li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Create API Key
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ApiKeySecretBannerProps {
  secret: string;
  onDismiss: () => void;
}

function ApiKeySecretBanner({ secret, onDismiss }: ApiKeySecretBannerProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-warning-500/50 bg-warning-500/10">
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-warning-500/20 flex items-center justify-center flex-shrink-0">
            <Key className="h-5 w-5 text-warning-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-warning-200 mb-1">Save your API key!</h3>
            <p className="text-sm text-gray-400 mb-3">
              This is the only time you&apos;ll see the full key. Copy it now and add it to your server&apos;s config.yml
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-900 px-3 py-2 rounded-lg text-sm text-gray-200 font-mono break-all">
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
          <Button variant="ghost" size="sm" onClick={onDismiss} className="flex-shrink-0">
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
