'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

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
  const networkId = params.networkId as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<NetworkResponse>({
    queryKey: ['network', networkId],
    queryFn: () => api.get(`/networks/${networkId}`),
  });

  const [formData, setFormData] = useState<Partial<Network & { currency?: string }>>({});

  const updateMutation = useMutation({
    mutationFn: (updateData: Partial<Network>) =>
      api.patch(`/networks/${networkId}`, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', networkId] });
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
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  const currentName = formData.name ?? settings?.name ?? '';
  const currentTimezone = formData.timezone ?? settings?.timezone ?? 'UTC';
  const currentCurrency = formData.currency ?? settings?.settings?.currency ?? 'USD';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Network Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title text-lg">General</h2>

            <div className="form-control max-w-md">
              <label className="label">
                <span className="label-text">Network Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={currentName}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title text-lg">Regional</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Timezone</span>
                </label>
                <select
                  className="select select-bordered"
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
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Default Currency</span>
                </label>
                <select
                  className="select select-bordered"
                  value={currentCurrency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card bg-error/10 border border-error/30">
          <div className="card-body">
            <h2 className="card-title text-lg text-error">Danger Zone</h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Network</p>
                <p className="text-sm text-base-content/60">
                  Permanently delete this network and all associated data.
                </p>
              </div>
              <button type="button" className="btn btn-error btn-outline btn-sm">
                Delete Network
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={updateMutation.isPending || Object.keys(formData).length === 0}
          >
            {updateMutation.isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
