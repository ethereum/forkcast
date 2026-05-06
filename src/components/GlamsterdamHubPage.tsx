import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Logo } from './ui/Logo';
import ThemeToggle from './ui/ThemeToggle';
import AnalysisNav from './ui/AnalysisNav';
import { useMetaTags } from '../hooks/useMetaTags';

interface TabItem {
  path: string;
  label: string;
}

const tabs: TabItem[] = [
  { path: '/glamsterdam', label: 'EIP Candidates' },
  { path: '/glamsterdam/priority', label: 'Client Priority' },
  { path: '/glamsterdam/complexity', label: 'Test Complexity' },
];

const GlamsterdamHubPage: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/$/, '') || '/';

  useMetaTags({
    title: 'Glamsterdam Analysis - Forkcast',
    description: 'EIP candidates, client prioritization, and test complexity analysis for the Glamsterdam network upgrade.',
    url: 'https://forkcast.org/glamsterdam',
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <Logo size="md" className="mb-8" />
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Glamsterdam
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Fork analysis: EIP candidates, client team stances, and testing complexity.
          </p>
          <div className="mt-4">
            <AnalysisNav />
          </div>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex items-center gap-1 p-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Tab content */}
        <Outlet />
      </div>
    </div>
  );
};

export default GlamsterdamHubPage;
