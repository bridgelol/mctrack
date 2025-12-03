'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, StatCard, SkeletonStatCard } from '@/components/ui';
import { AreaChart, BarChart } from '@/components/charts';
import {
  Users,
  Network,
  CreditCard,
  Gamepad2,
  DollarSign,
  TrendingUp,
  Activity,
  Key,
} from 'lucide-react';
import { formatCompact, formatCurrency } from '@/lib/utils';

interface PlatformStats {
  users: {
    total: number;
    newThisWeek: number;
  };
  networks: {
    total: number;
    newThisWeek: number;
  };
  subscriptions: {
    active: number;
  };
  apiKeys: {
    total: number;
  };
  analytics: {
    totalSessions: number;
    totalPlayers: number;
    totalRevenue: number;
    sessionsToday: number;
    playersToday: number;
    revenueToday: number;
    currentCcu: number;
  };
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading, error } = useQuery<PlatformStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/admin/stats'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-6 text-center">
          <div className="text-error-400 mb-2">Failed to load admin statistics</div>
          <p className="text-gray-500 text-sm">Please check your permissions and try again.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-50">Admin Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">
          Platform-wide statistics and management
        </p>
      </div>

      {/* Real-time Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              title="Current CCU"
              value={formatCompact(stats?.analytics.currentCcu || 0)}
              icon={Activity}
              iconColor="success"
              description="Players online now"
            />
            <StatCard
              title="Players Today"
              value={formatCompact(stats?.analytics.playersToday || 0)}
              icon={Users}
              iconColor="primary"
            />
            <StatCard
              title="Sessions Today"
              value={formatCompact(stats?.analytics.sessionsToday || 0)}
              icon={Gamepad2}
              iconColor="secondary"
            />
            <StatCard
              title="Revenue Today"
              value={formatCurrency(stats?.analytics.revenueToday || 0)}
              icon={DollarSign}
              iconColor="success"
            />
          </>
        )}
      </div>

      {/* Platform Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              title="Total Users"
              value={formatCompact(stats?.users.total || 0)}
              icon={Users}
              iconColor="info"
              description={`+${stats?.users.newThisWeek || 0} this week`}
            />
            <StatCard
              title="Total Networks"
              value={formatCompact(stats?.networks.total || 0)}
              icon={Network}
              iconColor="primary"
              description={`+${stats?.networks.newThisWeek || 0} this week`}
            />
            <StatCard
              title="Active Subscriptions"
              value={formatCompact(stats?.subscriptions.active || 0)}
              icon={CreditCard}
              iconColor="success"
            />
            <StatCard
              title="API Keys"
              value={formatCompact(stats?.apiKeys.total || 0)}
              icon={Key}
              iconColor="warning"
            />
          </>
        )}
      </div>

      {/* Lifetime Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              title="Total Players (All Time)"
              value={formatCompact(stats?.analytics.totalPlayers || 0)}
              icon={Users}
              iconColor="primary"
            />
            <StatCard
              title="Total Sessions (All Time)"
              value={formatCompact(stats?.analytics.totalSessions || 0)}
              icon={Gamepad2}
              iconColor="secondary"
            />
            <StatCard
              title="Total Revenue (All Time)"
              value={formatCurrency(stats?.analytics.totalRevenue || 0)}
              icon={TrendingUp}
              iconColor="success"
            />
          </>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickLinkCard
          title="Manage Users"
          description="View and manage all platform users"
          href="/admin/users"
          icon={Users}
          color="blue"
        />
        <QuickLinkCard
          title="Manage Networks"
          description="View and manage all networks"
          href="/admin/networks"
          icon={Network}
          color="purple"
        />
        <QuickLinkCard
          title="System Health"
          description="Monitor system status"
          href="/admin/health"
          icon={Activity}
          color="green"
        />
        <QuickLinkCard
          title="Audit Logs"
          description="View platform-wide audit logs"
          href="/admin/audit-logs"
          icon={Key}
          color="orange"
        />
      </div>
    </div>
  );
}

interface QuickLinkCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'green' | 'orange';
}

function QuickLinkCard({ title, description, href, icon: Icon, color }: QuickLinkCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  return (
    <a
      href={href}
      className="block p-4 rounded-xl border border-gray-800 bg-gray-900 hover:bg-gray-800 transition-colors group"
    >
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} border flex items-center justify-center mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-medium text-gray-100 group-hover:text-white transition-colors">
        {title}
      </h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </a>
  );
}
