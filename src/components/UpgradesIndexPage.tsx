import React from 'react';
import { Link } from 'react-router-dom';
import { networkUpgrades, NetworkUpgrade } from '../data/upgrades';
import { useMetaTags } from '../hooks/useMetaTags';
import { parseShortDate } from './schedule/forkDateCalculator';
import UpgradeCard from './ui/UpgradeCard';

const isInProgress = (u: NetworkUpgrade) => !u.disabled && u.status !== 'Live';

const inProgressOrder: Partial<Record<NetworkUpgrade['status'], number>> = {
  Upcoming: 0,
  Planning: 1,
  Research: 2,
};

const activationTimestamp = (u: NetworkUpgrade): number => {
  const d = u.activationDate ? parseShortDate(u.activationDate) : null;
  return d ? d.getTime() : -Infinity;
};

const inProgressUpgrades = networkUpgrades
  .filter(isInProgress)
  .sort((a, b) => (inProgressOrder[a.status] ?? 99) - (inProgressOrder[b.status] ?? 99));

const liveUpgrades = networkUpgrades
  .filter((u) => !isInProgress(u))
  .sort((a, b) => activationTimestamp(b) - activationTimestamp(a));

interface UpgradeRowProps {
  upgrade: NetworkUpgrade;
}

const UpgradeRow: React.FC<UpgradeRowProps> = ({ upgrade }) => {
  const isExternal = Boolean(upgrade.disabled && upgrade.externalLink);
  const isInteractive = !upgrade.disabled || isExternal;

  const inner = (
    <div
      className={`flex items-center gap-4 px-5 py-4 transition-colors ${
        isInteractive ? 'group hover:bg-slate-50 dark:hover:bg-slate-700/40' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-medium ${
              upgrade.disabled
                ? 'text-slate-600 dark:text-slate-300'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {upgrade.name}
          </span>
          {upgrade.activationDate && (
            <span className="sm:hidden text-xs text-slate-500 dark:text-slate-400">
              · {upgrade.activationDate}
            </span>
          )}
        </div>
        <p
          className={`text-sm truncate mt-1 ${
            upgrade.disabled ? 'text-slate-500 dark:text-slate-400' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {upgrade.tagline}
        </p>
      </div>

      <span className="hidden sm:inline-block w-24 text-right text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
        {upgrade.activationDate ?? ''}
      </span>

      {isInteractive && (
        <span
          className={`shrink-0 ${
            upgrade.disabled
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-400 group-hover:text-purple-500'
          }`}
        >
          {isExternal ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </span>
      )}
    </div>
  );

  if (isExternal) {
    return (
      <a href={upgrade.externalLink} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  if (upgrade.disabled) {
    return <div className="opacity-70">{inner}</div>;
  }
  return (
    <Link to={upgrade.path} className="block">
      {inner}
    </Link>
  );
};

const UpgradesIndexPage: React.FC = () => {
  useMetaTags({
    title: 'Network Upgrades — Forkcast',
    description: 'Catalog of Ethereum network upgrades — in progress, live, and historical.',
    url: 'https://forkcast.org/upgrades',
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Network Upgrades
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Every Ethereum network upgrade Forkcast tracks — what's currently being scoped, what's live, and the historical record.
          </p>
        </div>

        {inProgressUpgrades.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              In Progress
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {inProgressUpgrades.map((u) => (
                <UpgradeCard key={u.id} upgrade={u} />
              ))}
            </div>
          </section>
        )}

        {liveUpgrades.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Live</h2>
            <ul className="divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
              {liveUpgrades.map((u) => (
                <li key={u.id}>
                  <UpgradeRow upgrade={u} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default UpgradesIndexPage;
