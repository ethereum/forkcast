import React from 'react';
import { Link } from './navigation';
import {
  networkUpgrades,
  bpoUpgrades,
  NetworkUpgrade,
  BpoUpgrade,
  shortUpgradeName,
} from '../data/upgrades';
import { parseShortDate } from './schedule/forkDateCalculator';
import UpgradeCard from './ui/UpgradeCard';
import { UpgradeMascot, Tooltip } from './ui';

const isInProgress = (u: NetworkUpgrade) => !u.disabled && u.status !== 'Live';

const inProgressOrder: Partial<Record<NetworkUpgrade['status'], number>> = {
  Upcoming: 0,
  Planning: 1,
  Research: 2,
};

const activationTimestamp = (activationDate?: string): number => {
  const d = activationDate ? parseShortDate(activationDate) : null;
  return d ? d.getTime() : -Infinity;
};

const inProgressUpgrades = networkUpgrades
  .filter(isInProgress)
  .sort((a, b) => (inProgressOrder[a.status] ?? 99) - (inProgressOrder[b.status] ?? 99));

type LiveEntry =
  | { kind: 'upgrade'; key: string; at: number; upgrade: NetworkUpgrade }
  | { kind: 'bpo'; key: string; at: number; bpo: BpoUpgrade };

// Majors and BPOs share one chronology: a BPO lands between the upgrade that
// introduced it and the next one, which is the order a reader expects.
const liveEntries: LiveEntry[] = [
  ...networkUpgrades
    .filter((u) => !isInProgress(u))
    .map<LiveEntry>((upgrade) => ({
      kind: 'upgrade',
      key: upgrade.id,
      at: activationTimestamp(upgrade.activationDate),
      upgrade,
    })),
  ...bpoUpgrades.map<LiveEntry>((bpo) => ({
    kind: 'bpo',
    key: bpo.id,
    at: activationTimestamp(bpo.activationDate),
    bpo,
  })),
].sort((a, b) => b.at - a.at);

const ExternalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ChevronIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const BpoBadge = () => (
  <Tooltip
    content={
      <span className="block">
        <span className="font-medium">Blob-parameter-only fork</span>
        <span className="block mt-0.5 text-slate-600 dark:text-slate-300">
          Raises blob capacity between major upgrades, per EIP-7892.
        </span>
      </span>
    }
  >
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
      BPO
    </span>
  </Tooltip>
);

interface RowProps {
  name: string;
  /** Rendered beside the name — a mascot, a badge. Must not contain an anchor. */
  accessory?: React.ReactNode;
  tagline: string;
  activationDate?: string;
  /** Omitted for an upgrade with nowhere to link, which renders as plain text. */
  href?: string;
  external?: boolean;
  muted?: boolean;
}

const Row: React.FC<RowProps> = ({
  name,
  accessory,
  tagline,
  activationDate,
  href,
  external = false,
  muted = false,
}) => {
  const inner = (
    <div
      className={`flex items-center gap-4 px-5 py-4 transition-colors ${
        href ? 'group hover:bg-slate-50 dark:hover:bg-slate-700/40' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-medium ${
              muted ? 'text-slate-600 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {name}
          </span>
          {accessory}
          {activationDate && (
            <span className="sm:hidden text-xs text-slate-500 dark:text-slate-400">
              · {activationDate}
            </span>
          )}
        </div>
        <p
          className={`text-sm truncate mt-1 ${
            muted ? 'text-slate-500 dark:text-slate-400' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {tagline}
        </p>
      </div>

      <span className="hidden sm:inline-block w-24 text-right text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
        {activationDate ?? ''}
      </span>

      {href && (
        <span
          className={`shrink-0 ${
            muted ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 group-hover:text-purple-500'
          }`}
        >
          {external ? <ExternalIcon /> : <ChevronIcon />}
        </span>
      )}
    </div>
  );

  if (!href) {
    return <div className="opacity-70">{inner}</div>;
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return (
    <Link to={href} className="block">
      {inner}
    </Link>
  );
};

const UpgradeRow: React.FC<{ upgrade: NetworkUpgrade }> = ({ upgrade }) => {
  const isExternal = Boolean(upgrade.disabled && upgrade.externalLink);
  return (
    <Row
      name={shortUpgradeName(upgrade.name)}
      accessory={<UpgradeMascot upgradeId={upgrade.id} size="text-base" linked={false} />}
      tagline={upgrade.tagline}
      activationDate={upgrade.activationDate}
      href={upgrade.disabled ? upgrade.externalLink : upgrade.path}
      external={isExternal}
      muted={upgrade.disabled}
    />
  );
};

// A BPO's meta EIP is its only page, so the row links there rather than to an
// `/upgrade/{id}` route that doesn't exist.
const BpoRow: React.FC<{ bpo: BpoUpgrade }> = ({ bpo }) => (
  <Row
    name={bpo.name}
    accessory={<BpoBadge />}
    tagline={bpo.tagline}
    activationDate={bpo.activationDate}
    href={`/eips/${bpo.metaEipId}`}
  />
);

const UpgradesIndexPage: React.FC = () => {
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

        {liveEntries.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Live</h2>
            <ul className="divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
              {liveEntries.map((entry) => (
                <li key={entry.key}>
                  {entry.kind === 'bpo' ? (
                    <BpoRow bpo={entry.bpo} />
                  ) : (
                    <UpgradeRow upgrade={entry.upgrade} />
                  )}
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
