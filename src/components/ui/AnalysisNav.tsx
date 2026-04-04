import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  glamsterdam?: boolean;
}

const navItems: NavItem[] = [
  { path: '/schedule', label: 'Schedule' },
  { path: '/devnets', label: 'Devnet Tracker' },
  { path: '/priority', label: 'Client Priority', glamsterdam: true },
  { path: '/complexity', label: 'Test Complexity', glamsterdam: true },
];

const AnalysisNav: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/$/, '') || '/';

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
              isActive
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {item.label}
            {item.glamsterdam && (
              <span className="px-1 py-0.5 text-[9px] font-semibold leading-none rounded bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                Glamsterdam
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default AnalysisNav;
