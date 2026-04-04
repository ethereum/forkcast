import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import ThemeToggle from './ThemeToggle';
import { networkUpgrades } from '../../data/upgrades';

const activeUpgrades = networkUpgrades.filter(u => !u.disabled).reverse();

const STATUS_COLORS: Record<string, string> = {
  Live: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Planning: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Research: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

interface PlanningItem {
  path: string;
  label: string;
  title: string;
  glamsterdam?: boolean;
}

const planningItems: PlanningItem[] = [
  { path: '/schedule', label: 'Schedule', title: 'ACD Planning Sandbox' },
  { path: '/priority', label: 'Client Priority', title: 'Client team stances on EIPs', glamsterdam: true },
  { path: '/complexity', label: 'Test Complexity', title: 'STEEL testing effort scores', glamsterdam: true },
];

interface MeetingsItem {
  path: string;
  label: string;
  title: string;
}

const meetingsItems: MeetingsItem[] = [
  { path: '/calls', label: 'Calls', title: 'Protocol Calendar' },
  { path: '/decisions', label: 'Decisions', title: 'Key decisions from ACD meetings' },
];

const btnClass = (active: boolean) =>
  `px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1 ${
    active
      ? 'bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300'
      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
  }`;

const directLinkClass = (active: boolean) =>
  `px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
    active
      ? 'bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300'
      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
  }`;

const dropdownItemClass = (active: boolean) =>
  `flex items-center justify-between px-3 py-2 text-sm transition-colors ${
    active
      ? 'bg-slate-50 dark:bg-slate-700/50 text-purple-700 dark:text-purple-300'
      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
  }`;

const chevron = (open: boolean) => (
  <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return { open, setOpen, ref };
}

const GlobalNav: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/$/, '') || '/';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const upgrades = useDropdown();
  const meetings = useDropdown();
  const planning = useDropdown();

  // Close everything on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    upgrades.setOpen(false);
    meetings.setOpen(false);
    planning.setOpen(false);
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isUpgradePage = pathname.startsWith('/upgrade/');
  const isMeetingsPage = meetingsItems.some(i => isActive(i.path));
  const isPlanningPage = planningItems.some(i => isActive(i.path));

  const divider = <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />;

  return (
    <nav className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-12">
          <Logo size="sm" className="flex-shrink-0" />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5 ml-6 flex-1">
            {/* Upgrades dropdown */}
            <div className="relative" ref={upgrades.ref}>
              <button
                onClick={() => upgrades.setOpen(!upgrades.open)}
                className={btnClass(isUpgradePage)}
                type="button"
              >
                Upgrades
                {chevron(upgrades.open)}
              </button>
              {upgrades.open && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50">
                  {activeUpgrades.map((u) => (
                    <Link key={u.id} to={u.path} className={dropdownItemClass(pathname === u.path)}>
                      <span className="font-medium">{u.name.replace(' Upgrade', '')}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${STATUS_COLORS[u.status] || ''}`}>
                        {u.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {divider}

            {/* EIPs - direct link */}
            <Link to="/eips" title="EIP Directory" className={directLinkClass(isActive('/eips'))}>
              EIPs
            </Link>

            {divider}

            {/* Meetings dropdown */}
            <div className="relative" ref={meetings.ref}>
              <button
                onClick={() => meetings.setOpen(!meetings.open)}
                className={btnClass(isMeetingsPage)}
                type="button"
              >
                Meetings
                {chevron(meetings.open)}
              </button>
              {meetings.open && (
                <div className="absolute top-full left-0 mt-1 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50">
                  {meetingsItems.map((item) => (
                    <Link key={item.path} to={item.path} className={dropdownItemClass(isActive(item.path))}>
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{item.title}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {divider}

            {/* ACD Planning dropdown */}
            <div className="relative" ref={planning.ref}>
              <button
                onClick={() => planning.setOpen(!planning.open)}
                className={btnClass(isPlanningPage)}
                type="button"
              >
                ACD Planning
                {chevron(planning.open)}
              </button>
              {planning.open && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50">
                  {planningItems.map((item) => (
                    <Link key={item.path} to={item.path} className={dropdownItemClass(isActive(item.path))}>
                      <div>
                        <div className="font-medium inline-flex items-center gap-1.5">
                          {item.label}
                          {item.glamsterdam && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                              Glamsterdam
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{item.title}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {divider}

            {/* Devnets - direct link */}
            <Link to="/devnets" title="Devnet Tracker" className={directLinkClass(isActive('/devnets'))}>
              Devnets
            </Link>
          </div>

          {/* Right: Theme + Mobile menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle navigation menu"
              type="button"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="max-w-5xl mx-auto px-4 py-3 space-y-1">
            {/* Upgrades */}
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 pt-1 pb-1">
              Upgrades
            </div>
            {activeUpgrades.map((u) => (
              <Link
                key={u.id}
                to={u.path}
                className={`flex items-center justify-between px-2.5 py-2 rounded-md transition-colors ${
                  pathname === u.path
                    ? 'bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="text-sm font-medium">{u.name.replace(' Upgrade', '')}</span>
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${STATUS_COLORS[u.status] || ''}`}>
                  {u.status}
                </span>
              </Link>
            ))}

            {/* EIPs */}
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 pt-3 pb-1">
              EIPs
            </div>
            <Link
              to="/eips"
              className={`block px-2.5 py-2 rounded-md transition-colors ${
                isActive('/eips')
                  ? 'bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="text-sm font-medium">EIP Directory</span>
              <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5">Browse all Ethereum Improvement Proposals</span>
            </Link>

            {/* Meetings */}
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 pt-3 pb-1">
              Meetings
            </div>
            {meetingsItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-2.5 py-2 rounded-md transition-colors ${
                  isActive(item.path)
                    ? 'bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.title}</span>
              </Link>
            ))}

            {/* ACD Planning */}
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 pt-3 pb-1">
              ACD Planning
            </div>
            {planningItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-2.5 py-2 rounded-md transition-colors ${
                  isActive(item.path)
                    ? 'bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="text-sm font-medium inline-flex items-center gap-1.5">
                  {item.label}
                  {item.glamsterdam && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                      Glamsterdam
                    </span>
                  )}
                </span>
                <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.title}</span>
              </Link>
            ))}

            {/* Devnets */}
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 pt-3 pb-1">
              Devnets
            </div>
            <Link
              to="/devnets"
              className={`block px-2.5 py-2 rounded-md transition-colors ${
                isActive('/devnets')
                  ? 'bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="text-sm font-medium">Devnet Tracker</span>
              <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5">Active devnet series, specs, and client support</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default GlobalNav;
