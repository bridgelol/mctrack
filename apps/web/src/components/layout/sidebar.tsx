'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Analytics', href: '/analytics', icon: '📊' },
  { name: 'Players', href: '/players', icon: '👥' },
  { name: 'Campaigns', href: '/campaigns', icon: '📢' },
  { name: 'Team', href: '/team', icon: '🤝' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const networkId = params.networkId as string;

  return (
    <aside className="w-64 bg-base-200 border-r border-base-300 flex flex-col">
      <div className="p-4 border-b border-base-300">
        <Link href="/networks" className="text-xl font-bold text-primary">
          MCTrack
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {networkId ? (
          <>
            {navigation.map((item) => {
              const href = `/${networkId}${item.href}`;
              const isActive = pathname.startsWith(href);

              return (
                <Link
                  key={item.name}
                  href={href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-primary-content'
                      : 'hover:bg-base-300'
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </>
        ) : (
          <p className="text-sm text-base-content/60">Select a network</p>
        )}
      </nav>

      <div className="p-4 border-t border-base-300">
        <Link
          href="/networks"
          className="flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content"
        >
          ← All Networks
        </Link>
      </div>
    </aside>
  );
}
