import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  MapIcon,
  TruckIcon,
  ShieldExclamationIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import clsx from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: HomeIcon, roles: ['admin', 'operator', 'viewer'] },
  { to: '/map', label: 'Live Map', icon: MapIcon, roles: ['admin', 'operator', 'viewer'] },
  { to: '/vehicles', label: 'Vehicle Tracking', icon: TruckIcon, roles: ['admin', 'operator'] },
  { to: '/lost-vehicles', label: 'Lost Vehicles', icon: MagnifyingGlassIcon, roles: ['admin', 'operator'] },
  { to: '/violations', label: 'Violations', icon: ShieldExclamationIcon, roles: ['admin', 'operator'] },
  { to: '/analytics', label: 'Analytics', icon: ChartBarIcon, roles: ['admin'] },
  { to: '/signals', label: 'Signals', icon: SignalIcon, roles: ['admin'] },
] as const;

export default function Sidebar() {
  const { hasRole } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-dark-700 bg-dark-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-dark-700 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
          <SignalIcon className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">TrafficOS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems
          .filter((item) => hasRole(...(item.roles as unknown as ('admin' | 'operator' | 'viewer')[])))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600/10 text-primary-400'
                    : 'text-dark-300 hover:bg-dark-800 hover:text-white',
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-dark-700 p-4">
        <p className="text-xs text-dark-500">© 2026 TrafficOS v1.0</p>
      </div>
    </aside>
  );
}
