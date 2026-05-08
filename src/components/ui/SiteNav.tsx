import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import ThemeToggle from './ThemeToggle';
import { isPathActive, normalizePathname } from '../../utils/path';

const NavLinkItem: React.FC<{ to: string; label: string; active: boolean }> = ({ to, label, active }) => (
  <Link
    to={to}
    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active
        ? 'text-purple-700 dark:text-purple-300'
        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
    }`}
  >
    {label}
  </Link>
);

const NavMenuLink: React.FC<{ to: string; label: string; active: boolean; variant?: 'item' | 'index'; onClick: () => void }> = ({
  to,
  label,
  active,
  variant = 'item',
  onClick,
}) => (
  <Link
    to={to}
    onClick={onClick}
    className={`block rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 ${
      active
        ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 dark:bg-purple-500/10 dark:text-purple-200 dark:hover:bg-purple-500/15 dark:hover:text-purple-100'
        : variant === 'index'
          ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white'
          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-white'
    }`}
  >
    <span className={variant === 'index' ? 'font-medium' : 'font-semibold'}>{label}</span>
  </Link>
);

interface NavItem {
  to: string;
  label: string;
}

interface UpgradeNavItem extends NavItem {
  variant: 'item' | 'index';
}

const navItems: NavItem[] = [
  { to: '/eips', label: 'EIPs' },
  { to: '/calls', label: 'Calls' },
  { to: '/decisions', label: 'Decisions' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/devnets', label: 'Devnets' },
];

const upgradeNavItems: UpgradeNavItem[] = [
  { to: '/upgrade/glamsterdam', label: 'Glamsterdam', variant: 'item' },
  { to: '/upgrade/hegota', label: 'Hegota', variant: 'item' },
  { to: '/upgrades', label: 'View all upgrades', variant: 'index' },
];

export interface SiteNavCallActions {
  onSearch: () => void;
}

export interface SiteNavProps {
  variant?: 'default' | 'wide';
  callActions?: SiteNavCallActions;
}

const SiteNav: React.FC<SiteNavProps> = ({ variant = 'default', callActions }) => {
  const location = useLocation();
  const pathname = normalizePathname(location.pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [upgradeMenuOpen, setUpgradeMenuOpen] = useState(false);
  const upgradeMenuRef = useRef<HTMLDivElement | null>(null);
  // Wide pages use the broader app canvas; widen the nav so the logo / nav /
  // contextual actions align with the page below.
  const isWide = variant === 'wide';
  const headerPadding = isWide ? 'px-4 sm:px-6 xl:px-8 2xl:px-10' : 'px-6';
  const navMaxWidth = isWide ? 'max-w-[1800px]' : 'max-w-4xl';
  const desktopNavDisplay = isWide ? 'hidden lg:flex' : 'hidden md:flex';
  const compactNavDisplay = isWide ? 'lg:hidden' : 'md:hidden';

  useEffect(() => {
    setMobileOpen(false);
    setUpgradeMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!upgradeMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!upgradeMenuRef.current?.contains(event.target as Node)) {
        setUpgradeMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [upgradeMenuOpen]);

  const handleUpgradeMenuBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget;
    if (!(nextFocusedElement instanceof Node) || !event.currentTarget.contains(nextFocusedElement)) {
      setUpgradeMenuOpen(false);
    }
  };

  const handleUpgradeMenuMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.currentTarget.ownerDocument.activeElement)) {
      setUpgradeMenuOpen(false);
    }
  };

  const handleUpgradeMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;

    event.stopPropagation();
    setUpgradeMenuOpen(false);

    if (event.target instanceof HTMLElement) {
      event.target.blur();
    }
  };

  const upgradesActive = pathname === '/upgrades' || pathname.startsWith('/upgrade/');

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
      <div className={headerPadding}>
        <nav className={`relative ${navMaxWidth} mx-auto h-14 flex items-center justify-between gap-4`}>
          <Logo size="sm" />

          {/* Absolutely centered relative to the nav so widths of logo / right-cluster don't drift it. */}
          <div className={`${desktopNavDisplay} items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>
            <div
              className="relative"
              ref={upgradeMenuRef}
              onBlur={handleUpgradeMenuBlur}
              onFocus={() => setUpgradeMenuOpen(true)}
              onKeyDown={handleUpgradeMenuKeyDown}
              onMouseEnter={() => setUpgradeMenuOpen(true)}
              onMouseLeave={handleUpgradeMenuMouseLeave}
            >
              <button
                type="button"
                onClick={() => setUpgradeMenuOpen(true)}
                aria-haspopup="menu"
                aria-expanded={upgradeMenuOpen}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 ${
                  upgradesActive
                    ? 'text-purple-700 dark:text-purple-300'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Upgrades
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${upgradeMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div
                className={`invisible absolute left-0 top-full z-40 w-44 pt-2 opacity-0 transition-opacity ${
                  upgradeMenuOpen ? 'visible opacity-100' : ''
                }`}
              >
                <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
                  {upgradeNavItems.map((item) => (
                    <div
                      key={item.to}
                      className={item.variant === 'index' ? 'border-t border-slate-200 pt-1 dark:border-slate-700' : undefined}
                    >
                      <NavMenuLink
                        to={item.to}
                        label={item.label}
                        variant={item.variant}
                        active={isPathActive(pathname, item.to)}
                        onClick={() => setUpgradeMenuOpen(false)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {navItems.map((item) => (
              <NavLinkItem
                key={item.to}
                to={item.to}
                label={item.label}
                active={isPathActive(pathname, item.to)}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {callActions && (
              <>
                <Link
                  to="/calls"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
                >
                  ← All Calls
                </Link>
                <button
                  type="button"
                  onClick={callActions.onSearch}
                  aria-label="Search this call"
                  title="Search this call"
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </>
            )}
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              className={`${compactNavDisplay} p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>
      </div>

      {mobileOpen && (
        <div className={`${compactNavDisplay} border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 ${headerPadding}`}>
          <div className={`${navMaxWidth} mx-auto py-3`}>
            <div className="px-1 py-2 text-sm text-slate-700 dark:text-slate-200">
              Upgrades
            </div>
            <div className="mb-3 ml-2 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-700">
              {upgradeNavItems.map((item) => {
                const isIndexLink = item.variant === 'index';
                const active = isPathActive(pathname, item.to);

                return (
                  <div
                    key={item.to}
                    className={isIndexLink ? 'mt-2 border-t border-slate-200 pt-2 dark:border-slate-700' : undefined}
                  >
                    <Link
                      to={item.to}
                      className={`block rounded-md px-2 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 ${
                        active
                          ? 'font-medium text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-500/10'
                          : isIndexLink
                            ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </div>
                );
              })}
            </div>
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`block px-1 py-2 text-sm ${
                  isPathActive(pathname, item.to)
                    ? 'text-purple-700 dark:text-purple-300 font-medium'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default SiteNav;
