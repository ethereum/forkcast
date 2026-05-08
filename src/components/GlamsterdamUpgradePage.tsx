import React, { useLayoutEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useMetaTags } from '../hooks/useMetaTags';
import { getUpgradeById } from '../data/upgrades';
import { getUpgradeStatusColor } from '../utils/colors';
import { isPathActive, normalizePathname } from '../utils/path';

const upgrade = getUpgradeById('glamsterdam')!;

interface TabItem {
  path: string;
  label: string;
}

const tabs: TabItem[] = [
  { path: '/upgrade/glamsterdam', label: 'Overview' },
  { path: '/upgrade/glamsterdam/stakeholders', label: 'Stakeholders' },
  { path: '/upgrade/glamsterdam/devnet-inclusion', label: 'Devnet Inclusion' },
  { path: '/upgrade/glamsterdam/client-priority', label: 'Client Priority' },
  { path: '/upgrade/glamsterdam/test-complexity', label: 'Test Complexity' },
];

const isTabActive = (pathname: string, tabPath: string) =>
  tabPath === '/upgrade/glamsterdam' ? pathname === tabPath : isPathActive(pathname, tabPath);

const GlamsterdamUpgradePage: React.FC = () => {
  const location = useLocation();
  const pathname = normalizePathname(location.pathname);
  const activeTabRef = useRef<HTMLAnchorElement>(null);

  useMetaTags({
    title: 'Glamsterdam Upgrade - Forkcast',
    description: 'Glamsterdam network upgrade: overview, stakeholder impact, EIP candidates, client prioritization, and test complexity.',
    url: 'https://forkcast.org/upgrade/glamsterdam',
  });

  useLayoutEffect(() => {
    const activeEl = activeTabRef.current;
    activeEl?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/upgrades" className="text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 mb-6 inline-block text-sm font-medium">
            ← All Network Upgrades
          </Link>

          <div className="pb-0">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between lg:justify-start gap-3 mb-3">
                  <h1 className="text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">
                    <span className="lg:hidden">Glamsterdam</span>
                    <span className="hidden lg:inline">{upgrade.name}</span>
                  </h1>
                  <span className={`lg:hidden px-3 py-1 text-xs font-medium rounded ${getUpgradeStatusColor(upgrade.status)}`}>
                    {upgrade.status}
                  </span>
                </div>
                <p className="text-base text-slate-600 dark:text-slate-300 mb-2 leading-relaxed max-w-2xl">{upgrade.description}</p>
                {upgrade.metaEipLink && (
                  <div className="mb-4">
                    <a
                      href={upgrade.metaEipLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2 transition-colors"
                    >
                      View Meta EIP Discussion
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
              <div className="hidden lg:block">
                <span className={`px-3 py-1 text-xs font-medium rounded ${getUpgradeStatusColor(upgrade.status)}`}>
                  {upgrade.status}
                </span>
              </div>
            </div>
          </div>

          <div className="-mx-6 mt-4">
            <div className="overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-6 border-b border-slate-200 dark:border-slate-700 min-w-max">
                {tabs.map((tab) => {
                  const active = isTabActive(pathname, tab.path);
                  return (
                    <Link
                      key={tab.path}
                      to={tab.path}
                      ref={active ? activeTabRef : undefined}
                      className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                        active
                          ? 'border-purple-600 dark:border-purple-400 text-purple-700 dark:text-purple-300'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <Outlet />
      </div>
    </div>
  );
};

export default GlamsterdamUpgradePage;
