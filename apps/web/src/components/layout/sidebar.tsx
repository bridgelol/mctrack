'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  BarChart3,
  Users,
  Megaphone,
  UsersRound,
  Settings,
  ChevronLeft,
  Layers,
  ChevronDown,
  Bell,
  Key,
  Webhook,
  Database,
  CreditCard,
  Shield,
  Network,
  Gamepad2,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const mainNavigation: NavItem[] = [
  { name: 'Network Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Gamemode Analytics', href: '/gamemodes', icon: Gamepad2 },
  { name: 'Players', href: '/players', icon: Users },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Team', href: '/team', icon: UsersRound },
];

const settingsNavigation: NavItem[] = [
  { name: 'General', href: '/settings', icon: Settings },
  { name: 'Gamemodes', href: '/settings/gamemodes', icon: Gamepad2 },
  { name: 'API Keys', href: '/settings/api-keys', icon: Key },
  { name: 'Webhooks', href: '/settings/webhooks', icon: Webhook },
  { name: 'Alerts', href: '/settings/alerts', icon: Bell },
  { name: 'Payment Providers', href: '/settings/payments', icon: CreditCard },
  { name: 'Audit Log', href: '/settings/audit-log', icon: Shield },
  { name: 'Data Export', href: '/settings/export', icon: Database },
];

interface NetworkResponse {
  network: {
    id: string;
    name: string;
  };
}

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const networkId = params.networkId as string;
  const [settingsExpanded, setSettingsExpanded] = useState(
    pathname.includes('/settings')
  );

  const { data: networkData } = useQuery<NetworkResponse>({
    queryKey: ['network', networkId],
    queryFn: () => api.get(`/networks/${networkId}`),
    enabled: !!networkId,
  });

  const isActive = (href: string) => {
    const fullPath = `/${networkId}${href}`;
    if (href === '/settings') {
      return pathname === fullPath;
    }
    return pathname.startsWith(fullPath);
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Logo & Network Selector */}
      <div className="p-4 border-b border-gray-800">
        <Link
          href="/"
          className="group flex items-center gap-3"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-brand-500 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg group-hover:shadow-brand-500/25 group-hover:scale-105 transition-all duration-200">
              <Network className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-50 tracking-tight group-hover:text-brand-400 transition-colors">
              MCTrack
            </h1>
            {networkData?.network && (
              <p className="text-xs text-gray-500 truncate">
                {networkData.network.name}
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {networkId ? (
          <>
            {/* Main Navigation */}
            <div className="space-y-1">
              {mainNavigation.map((item) => {
                const href = `/${networkId}${item.href}`;
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      active
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.name}</span>
                    {item.badge !== undefined && (
                      <span
                        className={cn(
                          'ml-auto text-xs font-medium px-2 py-0.5 rounded-full',
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-800 text-gray-400'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Divider */}
            <div className="my-4 border-t border-gray-800" />

            {/* Settings Section */}
            <div>
              <button
                onClick={() => setSettingsExpanded(!settingsExpanded)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  pathname.includes('/settings')
                    ? 'text-gray-100'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                )}
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span>Settings</span>
                <ChevronDown
                  className={cn(
                    'ml-auto h-4 w-4 transition-transform',
                    settingsExpanded && 'rotate-180'
                  )}
                />
              </button>

              {settingsExpanded && (
                <div className="mt-1 ml-3 pl-4 border-l border-gray-800 space-y-1">
                  {settingsNavigation.map((item) => {
                    const href = `/${networkId}${item.href}`;
                    const active = isActive(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.name}
                        href={href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                          active
                            ? 'bg-gray-800 text-gray-100 font-medium'
                            : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="px-3 py-8 text-center">
            <Layers className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">Select a network</p>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800">
        <Link
          href="/networks"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>All Networks</span>
        </Link>
      </div>
    </aside>
  );
}
