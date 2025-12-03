'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Server,
  Clock,
  Cpu,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: Record<string, HealthCheck>;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function AdminHealthPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<HealthResponse>({
    queryKey: ['admin', 'health'],
    queryFn: () => api.get('/admin/health'),
    refetchInterval: 30000,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'unhealthy':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'degraded':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">System Health</h1>
          <p className="text-sm text-gray-400 mt-1">Monitor system status and performance</p>
        </div>
        <Card className="p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <div className="text-error-400 text-lg font-medium">Failed to connect to health endpoint</div>
          <p className="text-gray-500 mt-2">The API server may be unavailable.</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">System Health</h1>
          <p className="text-sm text-gray-400 mt-1">Monitor system status and performance</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={cn('p-6', data && getStatusColor(data.status))}>
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="w-12 h-12 bg-gray-800/50 animate-pulse rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10">
              {getStatusIcon(data?.status || 'unknown')}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold capitalize">
              {isLoading ? 'Checking...' : `System ${data?.status}`}
            </h2>
            <p className="text-sm opacity-75">
              {data?.timestamp && `Last checked: ${new Date(data.timestamp).toLocaleString()}`}
            </p>
          </div>
        </div>
      </Card>

      {/* Service Checks */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="h-20 bg-gray-800/50 animate-pulse rounded" />
            </Card>
          ))
        ) : (
          Object.entries(data?.checks || {}).map(([name, check]) => (
            <Card key={name} className="p-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  check.status === 'healthy' ? 'bg-green-500/10' : 'bg-red-500/10'
                )}>
                  <Database className={cn(
                    'h-5 w-5',
                    check.status === 'healthy' ? 'text-green-400' : 'text-red-400'
                  )} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-100 capitalize">{name}</h3>
                    <Badge variant={check.status === 'healthy' ? 'success' : 'error'}>
                      {check.status}
                    </Badge>
                  </div>
                  {check.latency !== undefined && (
                    <p className="text-sm text-gray-500 mt-1">
                      Latency: {check.latency}ms
                    </p>
                  )}
                  {check.error && (
                    <p className="text-sm text-red-400 mt-1">{check.error}</p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* System Info */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Uptime */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-16 bg-gray-800/50 animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-bold text-gray-100">
                {formatUptime(data?.uptime || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-16 bg-gray-800/50 animate-pulse rounded" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Heap Used</span>
                  <span className="text-sm font-medium text-gray-100">
                    {formatBytes(data?.memory.heapUsed || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Heap Total</span>
                  <span className="text-sm font-medium text-gray-100">
                    {formatBytes(data?.memory.heapTotal || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">RSS</span>
                  <span className="text-sm font-medium text-gray-100">
                    {formatBytes(data?.memory.rss || 0)}
                  </span>
                </div>
                {/* Memory bar */}
                <div className="pt-2">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{
                        width: `${data?.memory ? (data.memory.heapUsed / data.memory.heapTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {data?.memory
                      ? `${((data.memory.heapUsed / data.memory.heapTotal) * 100).toFixed(1)}% heap utilization`
                      : '—'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
