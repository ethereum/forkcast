import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './ui/Logo';
import ThemeToggle from './ui/ThemeToggle';
import AnalysisNav from './ui/AnalysisNav';
import { useMetaTags } from '../hooks/useMetaTags';
import { useDevnetNetworks } from '../hooks/useDevnetNetworks';
import { getAllDevnetSpecIds } from '../data/devnet-specs';
import type { ActiveDevnetSeries, InactiveDevnetSeries } from '../types/devnet-networks';

const CATEGORY_TEXT_COLORS: Record<string, string> = {
  // Glamsterdam — active fork, unique colors per series
  bal: 'text-violet-600 dark:text-violet-400',
  epbs: 'text-cyan-600 dark:text-cyan-400',
  glamsterdam: 'text-purple-600 dark:text-purple-400',
  // Fusaka — deployed, uniform color
  berlinterop: 'text-fuchsia-600 dark:text-fuchsia-400',
  eof: 'text-fuchsia-600 dark:text-fuchsia-400',
  fusaka: 'text-fuchsia-600 dark:text-fuchsia-400',
  peerdas: 'text-fuchsia-600 dark:text-fuchsia-400',
  // Pectra — deployed, uniform color
  pectra: 'text-indigo-600 dark:text-indigo-400',
  mekong: 'text-indigo-600 dark:text-indigo-400',
  // Dencun — deployed, uniform color
  dencun: 'text-lime-600 dark:text-lime-400',
  // Other — unique colors per series
  blob: 'text-amber-600 dark:text-amber-400',
  perf: 'text-rose-600 dark:text-rose-400',
  nft: 'text-emerald-600 dark:text-emerald-400',
  ssz: 'text-blue-600 dark:text-blue-400',
};

const GROUP_ACCENT: Record<string, string> = {
  glamsterdam: 'border-purple-300 dark:border-purple-700',
  fusaka: 'border-fuchsia-300 dark:border-fuchsia-700',
  pectra: 'border-indigo-300 dark:border-indigo-700',
  dencun: 'border-lime-300 dark:border-lime-700',
  other: 'border-slate-300 dark:border-slate-600',
};

function getCategoryTextColor(key: string): string {
  return CATEGORY_TEXT_COLORS[key] || 'text-slate-500 dark:text-slate-400';
}

const GLAMSTERDAM_CATEGORIES = new Set(['bal', 'epbs', 'glamsterdam']);
const FUSAKA_CATEGORIES = new Set(['berlinterop', 'eof', 'fusaka', 'peerdas']);
const PECTRA_CATEGORIES = new Set(['mekong', 'pectra']);
const DENCUN_CATEGORIES = new Set(['dencun']);

/** Unified card data — covers both active (from networks.json) and upcoming (spec-only) devnets. */
interface DevnetCardItem {
  categoryKey: string;
  displayName: string;
  description: string;
  /** All active network keys, sorted by version descending. */
  activeKeys: string[];
  /** Non-null when there's an upcoming devnet with a spec that's ahead of (or not covered by) the active network data. */
  upcomingSpecId: string | null;
}

/** Parse "epbs-devnet-0" → { category: "epbs", version: 0 } */
function parseSpecId(id: string): { category: string; version: number } | null {
  const match = id.match(/^(.+)-devnet-(\d+)$/);
  if (!match) return null;
  return { category: match[1], version: parseInt(match[2], 10) };
}

/**
 * Merge active series from networks.json with upcoming-only specs into one list.
 * - Active series get an upcomingSpecId if a local spec exists with a higher version.
 * - Spec-only series (no active networks at all) are synthesised as upcoming cards.
 */
function buildCardItems(activeSeries: ActiveDevnetSeries[]): DevnetCardItem[] {
  const allSpecIds = getAllDevnetSpecIds();

  // Start with a copy of every active series, enriched with upcoming spec info
  const items: DevnetCardItem[] = activeSeries.map((s) => {
    const upcomingSpec = findUpcomingSpec(allSpecIds, s.categoryKey, s.latestActiveVersion ?? -1);
    return {
      categoryKey: s.categoryKey,
      displayName: s.displayName,
      description: s.description,
      activeKeys: s.activeKeys,
      upcomingSpecId: upcomingSpec?.id ?? null,
    };
  });

  items.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return items;
}

/** Find the highest-version local spec that's ahead of the latest active version for a category. */
function findUpcomingSpec(allSpecIds: string[], categoryKey: string, latestActiveVersion: number) {
  let best: { id: string; version: number } | null = null;

  for (const specId of allSpecIds) {
    const parsed = parseSpecId(specId);
    if (!parsed || parsed.category !== categoryKey) continue;
    if (parsed.version <= latestActiveVersion) continue;
    if (best === null || parsed.version > best.version) {
      best = { id: specId, version: parsed.version };
    }
  }

  return best;
}

function SeriesCard({ item }: { item: DevnetCardItem }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 flex flex-col gap-2">
      <h4 className={`text-sm font-semibold uppercase tracking-wide ${getCategoryTextColor(item.categoryKey)}`}>
        {item.categoryKey}
      </h4>
      {item.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed" title={item.description}>
          {item.description}
        </p>
      )}
      <div className="space-y-1 mt-auto pt-1 border-t border-slate-100 dark:border-slate-700/50">
        {item.upcomingSpecId && (
          <div className="flex items-center gap-1.5">
            <Link
              to={`/devnets/${item.upcomingSpecId}`}
              className="text-xs font-mono font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
            >
              {item.upcomingSpecId}
            </Link>
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 rounded">
              upcoming
            </span>
          </div>
        )}
        {item.activeKeys.map((key) => (
          <div key={key}>
            <Link
              to={`/devnets/${key}`}
              className="text-xs font-mono font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
            >
              {key}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function InactiveCard({ item }: { item: InactiveDevnetSeries }) {
  return (
    <div className="bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 flex flex-col gap-2 opacity-60">
      <h4 className={`text-sm font-semibold uppercase tracking-wide ${getCategoryTextColor(item.categoryKey)}`}>
        {item.categoryKey}
      </h4>
      {item.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed" title={item.description}>
          {item.description}
        </p>
      )}
      <div className="mt-auto pt-1 border-t border-slate-100 dark:border-slate-700/50">
        <span className="text-xs text-slate-400 dark:text-slate-500 italic">
          No active networks
        </span>
      </div>
    </div>
  );
}

const DevnetsIndexPage: React.FC = () => {
  const { activeSeries, inactiveSeries, loading, error } = useDevnetNetworks();
  const [showInactive, setShowInactive] = useState(false);
  const cardItems = buildCardItems(activeSeries);
  const isForkAffiliated = (key: string) =>
    GLAMSTERDAM_CATEGORIES.has(key) || FUSAKA_CATEGORIES.has(key) || PECTRA_CATEGORIES.has(key) || DENCUN_CATEGORIES.has(key);
  const glamsterdamCards = cardItems.filter((c) => GLAMSTERDAM_CATEGORIES.has(c.categoryKey));
  const fusakaCards = cardItems.filter((c) => FUSAKA_CATEGORIES.has(c.categoryKey));
  const pectraCards = cardItems.filter((c) => PECTRA_CATEGORIES.has(c.categoryKey));
  const dencunCards = cardItems.filter((c) => DENCUN_CATEGORIES.has(c.categoryKey));
  const generalCards = cardItems.filter((c) => !isForkAffiliated(c.categoryKey));
  const glamsterdamInactive = inactiveSeries.filter((c) => GLAMSTERDAM_CATEGORIES.has(c.categoryKey));
  const fusakaInactive = inactiveSeries.filter((c) => FUSAKA_CATEGORIES.has(c.categoryKey));
  const pectraInactive = inactiveSeries.filter((c) => PECTRA_CATEGORIES.has(c.categoryKey));
  const dencunInactive = inactiveSeries.filter((c) => DENCUN_CATEGORIES.has(c.categoryKey));
  const generalInactive = inactiveSeries.filter((c) => !isForkAffiliated(c.categoryKey));

  useMetaTags({
    title: 'Devnet Tracker - Forkcast',
    description: 'Track active Ethereum devnet series, explore specs, and monitor Glamsterdam EIP prioritization.',
    url: 'https://forkcast.org/devnets',
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
              Devnet Tracker
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Active devnet series from ethPandaOps and Glamsterdam EIP prioritization data.
          </p>
          <div className="mt-4">
            <AnalysisNav />
          </div>
        </div>

        {/* Devnet Series */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Devnet Series
            </h2>
            {inactiveSeries.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!showInactive}
                  onChange={(e) => setShowInactive(!e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">Active only</span>
              </label>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              Failed to load network data.
            </div>
          )}

          {loading && cardItems.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
                  <div className="w-14 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                  <div className="w-full h-8 bg-slate-100 dark:bg-slate-700/50 rounded mb-2" />
                  <div className="w-28 h-3.5 bg-slate-100 dark:bg-slate-700/50 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {([
                { label: 'Glamsterdam', accent: GROUP_ACCENT.glamsterdam, active: glamsterdamCards, inactive: glamsterdamInactive },
                { label: 'Fusaka', accent: GROUP_ACCENT.fusaka, active: fusakaCards, inactive: fusakaInactive },
                { label: 'Pectra', accent: GROUP_ACCENT.pectra, active: pectraCards, inactive: pectraInactive },
                { label: 'Dencun', accent: GROUP_ACCENT.dencun, active: dencunCards, inactive: dencunInactive },
                { label: 'Other', accent: GROUP_ACCENT.other, active: generalCards, inactive: generalInactive },
              ] as const).map(({ label, accent, active, inactive }) => {
                if (active.length === 0 && !(showInactive && inactive.length > 0)) return null;
                return (
                  <div key={label}>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 pl-3 border-l-2 ${accent}`}>
                      {label}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {active.map((item) => (
                        <SeriesCard key={item.categoryKey} item={item} />
                      ))}
                      {showInactive && inactive.map((item) => (
                        <InactiveCard key={item.categoryKey} item={item} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && cardItems.length === 0 && inactiveSeries.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
              No devnet series found.
            </p>
          )}

        </div>

      </div>
    </div>
  );
};

export default DevnetsIndexPage;
