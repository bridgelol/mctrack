'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function NetworksPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['networks'],
    queryFn: () => api.get<{ networks: any[] }>('/networks'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Failed to load networks</span>
      </div>
    );
  }

  const networks = data?.networks || [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Networks</h1>
        <Link href="/networks/new" className="btn btn-primary">
          Create Network
        </Link>
      </div>

      {networks.length === 0 ? (
        <div className="card bg-base-200">
          <div className="card-body items-center text-center">
            <h2 className="card-title">No networks yet</h2>
            <p className="text-base-content/60">
              Create your first network to start tracking your Minecraft server.
            </p>
            <Link href="/networks/new" className="btn btn-primary mt-4">
              Create Network
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {networks.map((network: any) => (
            <Link
              key={network.id}
              href={`/${network.id}/analytics`}
              className="card bg-base-200 hover:bg-base-300 transition-colors"
            >
              <div className="card-body">
                <h2 className="card-title">{network.name}</h2>
                <p className="text-sm text-base-content/60">
                  {network.isOwner ? 'Owner' : 'Member'}
                </p>
                <div className="flex items-center gap-2 mt-2 text-sm text-base-content/60">
                  <span>🌍 {network.timezone}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
