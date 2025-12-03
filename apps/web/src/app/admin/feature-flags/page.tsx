'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { Flag, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlagsResponse {
  flags: Record<string, boolean>;
}

const FLAG_DESCRIPTIONS: Record<string, string> = {
  webhooks_enabled: 'Allow networks to configure webhook notifications',
  alerts_enabled: 'Allow networks to set up metric alerts',
  export_enabled: 'Allow networks to export their data',
  campaigns_enabled: 'Allow networks to create marketing campaigns',
  bedrock_tracking: 'Track Bedrock (mobile/console) player sessions',
};

export default function AdminFeatureFlagsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<FlagsResponse>({
    queryKey: ['admin', 'feature-flags'],
    queryFn: () => api.get('/admin/feature-flags'),
  });

  const updateFlagMutation = useMutation({
    mutationFn: ({ flag, enabled }: { flag: string; enabled: boolean }) =>
      api.patch(`/admin/feature-flags/${flag}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-50">Feature Flags</h1>
        <p className="text-sm text-gray-400 mt-1">
          Enable or disable platform features globally
        </p>
      </div>

      {/* Info Banner */}
      <Card className="p-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <Flag className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm text-blue-200">
              Feature flags control which features are available across the platform.
              Changes take effect immediately for all users.
            </p>
          </div>
        </div>
      </Card>

      {/* Flags List */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Features</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-800/50 animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(data?.flags || {}).map(([flag, enabled]) => (
                <div
                  key={flag}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg border transition-colors',
                    enabled
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-gray-900/50 border-gray-800'
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-100">
                        {flag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </h3>
                      <Badge variant={enabled ? 'success' : 'secondary'}>
                        {enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {FLAG_DESCRIPTIONS[flag] || 'No description available'}
                    </p>
                  </div>
                  <button
                    onClick={() => updateFlagMutation.mutate({ flag, enabled: !enabled })}
                    disabled={updateFlagMutation.isPending}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      enabled
                        ? 'text-green-400 hover:bg-green-500/10'
                        : 'text-gray-500 hover:bg-gray-800'
                    )}
                  >
                    {enabled ? (
                      <ToggleRight className="h-8 w-8" />
                    ) : (
                      <ToggleLeft className="h-8 w-8" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note */}
      <Card className="p-4 bg-yellow-500/5 border-yellow-500/20">
        <div className="flex items-start gap-3">
          <Flag className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-200">
              <strong>Note:</strong> Feature flags are currently stored in memory and will reset when the server restarts.
              For production use, consider persisting flags to the database.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
