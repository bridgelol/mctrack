'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Loader2 } from 'lucide-react';

interface Network {
  id: string;
  name: string;
  timezone: string;
  settings: {
    currency?: string;
  };
  creationTime: string;
}

interface NetworkResponse {
  network: Network;
  isOwner: boolean;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const networkId = params.networkId as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<NetworkResponse>({
    queryKey: ['network', networkId],
    queryFn: () => api.get(`/networks/${networkId}`),
  });

  const [formData, setFormData] = useState<Partial<Network & { currency?: string }>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const updateMutation = useMutation({
    mutationFn: (updateData: Partial<Network>) =>
      api.patch(`/networks/${networkId}`, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', networkId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/networks/${networkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networks'] });
      router.push('/networks');
    },
  });

  const settings = data?.network;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Build the update payload
    const payload: Record<string, unknown> = {};
    if (formData.name) payload.name = formData.name;
    if (formData.timezone) payload.timezone = formData.timezone;
    if (formData.currency) {
      payload.settings = {
        ...settings?.settings,
        currency: formData.currency,
      };
    }
    updateMutation.mutate(payload as Partial<Network>);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-800/70 rounded-lg animate-pulse" />
        <div className="rounded-xl bg-gray-900 p-6 border border-gray-800">
          <div className="space-y-4">
            <div className="h-5 w-24 bg-gray-800/70 rounded animate-pulse" />
            <div className="space-y-2 max-w-md">
              <div className="h-4 w-28 bg-gray-800/70 rounded animate-pulse" />
              <div className="h-10 w-full bg-gray-800/70 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gray-900 p-6 border border-gray-800">
          <div className="space-y-4">
            <div className="h-5 w-24 bg-gray-800/70 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-20 bg-gray-800/70 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-800/70 rounded-lg animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-800/70 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-800/70 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentName = formData.name ?? settings?.name ?? '';
  const currentTimezone = formData.timezone ?? settings?.timezone ?? 'UTC';
  const currentCurrency = formData.currency ?? settings?.settings?.currency ?? 'USD';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-50">Network Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Input
                label="Network Name"
                type="text"
                value={currentName}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Regional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Timezone"
                value={currentTimezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (US)</option>
                <option value="America/Chicago">Central Time (US)</option>
                <option value="America/Denver">Mountain Time (US)</option>
                <option value="America/Los_Angeles">Pacific Time (US)</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Europe/Berlin">Berlin</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Asia/Shanghai">Shanghai</option>
                <option value="Australia/Sydney">Sydney</option>
              </Select>

              <Select
                label="Default Currency"
                value={currentCurrency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="JPY">JPY - Japanese Yen</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-error-500/30">
          <CardHeader>
            <CardTitle className="text-error-400">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-50">Delete Network</p>
                <p className="text-sm text-gray-400">
                  Permanently delete this network and all associated data.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Network
              </Button>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-gray-950/80"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                />
                <div className="relative bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-800 shadow-2xl">
                  <h3 className="text-lg font-bold text-error-400 mb-2">Delete Network</h3>
                  <p className="text-sm text-gray-300 mb-4">
                    This action cannot be undone. This will permanently delete the{' '}
                    <strong>{settings?.name}</strong> network and all associated data including
                    players, analytics, and settings.
                  </p>
                  <p className="text-sm text-gray-300 mb-3">
                    Please type <strong>delete {settings?.name}</strong> to confirm.
                  </p>
                  <input
                    type="text"
                    className="w-full h-10 px-3 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
                    placeholder={`delete ${settings?.name}`}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={
                        deleteConfirmText !== `delete ${settings?.name}` ||
                        deleteMutation.isPending
                      }
                      onClick={() => deleteMutation.mutate()}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Delete Network'
                      )}
                    </Button>
                  </div>
                  {deleteMutation.isError && (
                    <p className="text-sm text-error-400 mt-3">
                      Failed to delete network. Please try again.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending || Object.keys(formData).length === 0}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
