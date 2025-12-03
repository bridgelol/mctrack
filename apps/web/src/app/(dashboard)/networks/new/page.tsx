'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';

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
        <Link href="/networks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Networks
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Network</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 mb-6">
            A network represents your Minecraft server or server network. You can track players,
            analytics, and revenue across all servers in a network.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-error-500/10 border border-error-500/20">
                <p className="text-sm text-error-400">{error}</p>
              </div>
            )}

            <Input
              label="Network Name"
              type="text"
              placeholder="e.g., My Minecraft Network"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
              hint="This will be displayed throughout the dashboard"
            />

            <Select
              label="Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              hint="Used for date/time display and daily analytics rollups"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </Select>

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/networks">
                <Button variant="ghost">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Network'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
