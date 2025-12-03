'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import {
  ChevronDown,
  LogOut,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// Map paths to readable titles
const pathTitles: Record<string, string> = {
  analytics: 'Analytics',
  players: 'Players',
  campaigns: 'Campaigns',
  team: 'Team',
  settings: 'Settings',
  'api-keys': 'API Keys',
  webhooks: 'Webhooks',
  alerts: 'Alerts',
  payments: 'Payment Providers',
  'audit-log': 'Audit Log',
  export: 'Data Export',
};

function Breadcrumbs() {
  const pathname = usePathname();
  const params = useParams();
  const networkId = params.networkId as string;

  // Parse the path after the networkId
  const pathAfterNetwork = pathname.split(`/${networkId}/`)[1] || '';
  const segments = pathAfterNetwork.split('/').filter(Boolean);

  if (segments.length === 0) {
    return <span className="text-gray-50 font-medium">Dashboard</span>;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const title = pathTitles[segment] || segment;
        const href = `/${networkId}/${segments.slice(0, index + 1).join('/')}`;

        return (
          <span key={segment} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-gray-600">/</span>
            )}
            {isLast ? (
              <span className="text-gray-50 font-medium">{title}</span>
            ) : (
              <Link
                href={href}
                className="text-gray-400 hover:text-gray-100 transition-colors"
              >
                {title}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function Header({ user }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="h-16 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-6">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-4">
        <Breadcrumbs />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              'flex items-center gap-3 p-1.5 pr-3 rounded-lg transition-colors',
              userMenuOpen
                ? 'bg-gray-800'
                : 'hover:bg-gray-800'
            )}
          >
            <Avatar
              src={user.image}
              name={user.name || user.email || 'User'}
              size="sm"
            />
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-100 leading-none">
                {user.name || 'User'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {user.email}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-500 transition-transform',
                userMenuOpen && 'rotate-180'
              )}
            />
          </button>

          {userMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />

              {/* Dropdown */}
              <div className="absolute right-0 mt-2 w-56 z-50 rounded-xl border border-gray-800 bg-gray-900 shadow-xl py-1">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-800">
                  <p className="text-sm font-medium text-gray-100">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </Link>
                  <a
                    href="https://docs.mctrack.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Documentation
                  </a>
                </div>

                {/* Sign Out */}
                <div className="border-t border-gray-800 py-1">
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error-400 hover:bg-error-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
