'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, Badge, EmptyState, SkeletonCard } from '@/components/ui';
import {
  Plus,
  Network,
  Globe,
  Crown,
  Users,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkItem {
  id: string;
  name: string;
  timezone: string;
  isOwner: boolean;
  memberCount?: number;
}

export default function NetworksPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['networks'],
    queryFn: () => api.get<{ networks: NetworkItem[] }>('/networks'),
  });

  const networks = data?.networks || [];

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 -mx-6 -mt-6 px-6 py-8 mb-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-50">Networks</h1>
              <p className="text-gray-400 mt-1">
                Select a network to view analytics or create a new one
              </p>
            </div>
            <Link href="/networks/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Network
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full flex-1">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <div className="text-error-400 mb-2">Failed to load networks</div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </Card>
        ) : networks.length === 0 ? (
          <Card className="p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-brand-500/10 via-brand-600/5 to-transparent p-12">
              <EmptyState
                icon={Network}
                title="No networks yet"
                description="Create your first network to start tracking player analytics, revenue, and campaigns for your Minecraft server."
                action={{
                  label: 'Create Network',
                  onClick: () => window.location.href = '/networks/new',
                }}
              />
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {networks.map((network) => (
              <Link
                key={network.id}
                href={`/${network.id}/analytics`}
                className="group"
              >
                <Card
                  hover
                  className="h-full transition-all duration-200 group-hover:border-brand-500/50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
                      <Network className="h-6 w-6 text-brand-500" />
                    </div>
                    {network.isOwner && (
                      <Badge variant="warning" size="sm">
                        <Crown className="h-3 w-3 mr-1" />
                        Owner
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-50 mb-1">
                    {network.name}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      {network.timezone}
                    </div>
                    {network.memberCount && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {network.memberCount}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center text-sm text-brand-500 font-medium group-hover:gap-2 transition-all">
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    View Dashboard
                    <ArrowRight className="h-4 w-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                </Card>
              </Link>
            ))}

            {/* Add Network Card */}
            <Link href="/networks/new" className="group">
              <Card className="h-full border-dashed hover:border-brand-500/50 hover:bg-gray-800/30 transition-all duration-200 flex flex-col items-center justify-center py-12">
                <div className="h-12 w-12 rounded-xl bg-gray-800 flex items-center justify-center mb-4 group-hover:bg-brand-500/10 transition-colors">
                  <Plus className="h-6 w-6 text-gray-500 group-hover:text-brand-500 transition-colors" />
                </div>
                <p className="font-medium text-gray-400 group-hover:text-gray-50 transition-colors">
                  Add Network
                </p>
              </Card>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
