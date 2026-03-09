import { useState } from 'react';
import { BellIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { useAppSelector } from '@/store/hooks';
import clsx from 'clsx';

export default function Header() {
  const { user, logout } = useAuth();
  const unreadCount = useAppSelector((s) => s.alerts.unreadCount);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-dark-700 bg-dark-900/80 px-6 backdrop-blur-sm">
      {/* Left – page title placeholder filled by pages */}
      <div id="header-left" />

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-dark-300 hover:bg-dark-800 hover:text-white">
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg p-2 text-dark-300 hover:bg-dark-800 hover:text-white"
          >
            <UserCircleIcon className="h-6 w-6" />
            <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 animate-fade-in rounded-lg border border-dark-700 bg-dark-800 py-1 shadow-xl">
              <div className="border-b border-dark-700 px-4 py-2">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-dark-400">{user?.email}</p>
                <span
                  className={clsx(
                    'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                    user?.role === 'admin' && 'bg-primary-600/20 text-primary-400',
                    user?.role === 'operator' && 'bg-emerald-600/20 text-emerald-400',
                    user?.role === 'viewer' && 'bg-dark-600/50 text-dark-300',
                  )}
                >
                  {user?.role}
                </span>
              </div>
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-dark-700"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
