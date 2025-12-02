'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

export default function NewNetworkPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: { name: string; timezone: string }) =>
      api.post<{ network: { id: string } }>('/networks', data),
    onSuccess: (data) => {
      router.push(`/${data.network.id}/analytics`);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create network');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Network name is required');
      return;
    }

    createMutation.mutate({ name: name.trim(), timezone });
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link href="/networks" className="btn btn-ghost btn-sm gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Networks
        </Link>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h1 className="card-title text-2xl">Create New Network</h1>
          <p className="text-base-content/60 mb-4">
            A network represents your Minecraft server or server network. You can track players,
            analytics, and revenue across all servers in a network.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text">Network Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g., My Minecraft Network"
                className="input input-bordered"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoFocus
              />
              <label className="label">
                <span className="label-text-alt">This will be displayed throughout the dashboard</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Timezone</span>
              </label>
              <select
                className="select select-bordered"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <label className="label">
                <span className="label-text-alt">Used for date/time display and daily analytics rollups</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/networks" className="btn btn-ghost">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Creating...
                  </>
                ) : (
                  'Create Network'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
