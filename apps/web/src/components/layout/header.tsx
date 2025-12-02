'use client';

import { signOut } from 'next-auth/react';

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="h-16 border-b border-base-300 bg-base-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </div>

      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
          <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
          </div>
        </label>
        <ul
          tabIndex={0}
          className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-200 rounded-box w-52"
        >
          <li className="menu-title">
            <span>{user.name || user.email}</span>
          </li>
          <li>
            <a href="/profile">Profile</a>
          </li>
          <li>
            <button onClick={() => signOut({ callbackUrl: '/login' })}>
              Sign out
            </button>
          </li>
        </ul>
      </div>
    </header>
  );
}
