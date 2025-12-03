'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Network,
  Shield,
  Activity,
  Settings,
  Flag,
  ScrollText,
  ChevronLeft,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const adminNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Networks', href: '/admin/networks', icon: Network },
  { name: 'System Health', href: '/admin/health', icon: Activity },
  { name: 'Feature Flags', href: '/admin/feature-flags', icon: Flag },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Logo & Title */}
      <div className="p-4 border-b border-gray-800">
        <Link
          href="/admin"
          className="flex items-center gap-3 group"
        >
          <div className="h-9 w-9 rounded-lg bg-red-600 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-50 text-sm">MCTrack Admin</h1>
            <p className="text-xs text-red-400">Platform Management</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {adminNavigation.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800">
        <Link
          href="/networks"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Exit Admin</span>
        </Link>
      </div>
    </aside>
  );
}
