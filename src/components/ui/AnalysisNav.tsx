import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  description: string;
}

const navItems: NavItem[] = [
  { path: '/schedule', label: 'Schedule', description: 'ACD planning' },
  { path: '/priority', label: 'Client Priority', description: 'Team stances' },
  { path: '/complexity', label: 'Test Complexity', description: 'STEEL scores' },
  { path: '/devnets', label: 'Devnet Tracker', description: 'Combined view' },
];

const AnalysisNav: React.FC = () => {
  const location = useLocation();
  // Normalize pathname by removing trailing slash
  const pathname = location.pathname.replace(/\/$/, '') || '/';

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
};

export default AnalysisNav;
