/**
 * Pure derivation of the grouped devnet-series cards for the `/devnets` index.
 * Extracted from `DevnetsIndexPage.tsx` so the `.astro` page can render the cards as
 * static HTML at build time. The only runtime behavior left on the page (toggling
 * inactive series) is a small script — no React.
 */
import { activeSeries, inactiveSeries } from './networks';
import { getAllDevnetSpecIds } from '../../data/devnet-specs';
import type { ActiveDevnetSeries, InactiveDevnetSeries } from '../../types/devnet-networks';

const CATEGORY_TEXT_COLORS: Record<string, string> = {
  bal: 'text-violet-600 dark:text-violet-400',
  epbs: 'text-cyan-600 dark:text-cyan-400',
  glamsterdam: 'text-purple-600 dark:text-purple-400',
  berlinterop: 'text-fuchsia-600 dark:text-fuchsia-400',
  eof: 'text-fuchsia-600 dark:text-fuchsia-400',
  fusaka: 'text-fuchsia-600 dark:text-fuchsia-400',
  peerdas: 'text-fuchsia-600 dark:text-fuchsia-400',
  pectra: 'text-indigo-600 dark:text-indigo-400',
  mekong: 'text-indigo-600 dark:text-indigo-400',
  dencun: 'text-lime-600 dark:text-lime-400',
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

export const getCategoryTextColor = (key: string): string =>
  CATEGORY_TEXT_COLORS[key] || 'text-slate-500 dark:text-slate-400';

const GLAMSTERDAM_CATEGORIES = new Set(['bal', 'epbs', 'glamsterdam']);
const FUSAKA_CATEGORIES = new Set(['berlinterop', 'eof', 'fusaka', 'peerdas']);
const PECTRA_CATEGORIES = new Set(['mekong', 'pectra']);
const DENCUN_CATEGORIES = new Set(['dencun']);

/** Unified card data — active (from networks.json) and upcoming (spec-only) devnets. */
export interface DevnetCardItem {
  categoryKey: string;
  displayName: string;
  description: string;
  activeKeys: string[];
  upcomingSpecId: string | null;
}

const parseSpecId = (id: string): { category: string; version: number } | null => {
  const match = id.match(/^(.+)-devnet-(\d+)$/);
  if (!match) return null;
  return { category: match[1], version: parseInt(match[2], 10) };
};

/** Highest-version local spec ahead of the latest active version for a category. */
const findUpcomingSpec = (allSpecIds: string[], categoryKey: string, latestActiveVersion: number) => {
  let best: { id: string; version: number } | null = null;
  for (const specId of allSpecIds) {
    const parsed = parseSpecId(specId);
    if (!parsed || parsed.category !== categoryKey) continue;
    if (parsed.version <= latestActiveVersion) continue;
    if (best === null || parsed.version > best.version) best = { id: specId, version: parsed.version };
  }
  return best;
};

const buildCardItems = (
  active: ActiveDevnetSeries[],
  inactive: InactiveDevnetSeries[],
): DevnetCardItem[] => {
  const allSpecIds = getAllDevnetSpecIds();
  const items: DevnetCardItem[] = active.map((s) => ({
    categoryKey: s.categoryKey,
    displayName: s.displayName,
    description: s.description,
    activeKeys: s.activeKeys,
    upcomingSpecId: findUpcomingSpec(allSpecIds, s.categoryKey, s.latestActiveVersion ?? -1)?.id ?? null,
  }));
  for (const s of inactive) {
    const upcomingSpec = findUpcomingSpec(allSpecIds, s.categoryKey, s.highestKnownVersion ?? -1);
    if (upcomingSpec) {
      items.push({
        categoryKey: s.categoryKey,
        displayName: s.displayName,
        description: s.description,
        activeKeys: [],
        upcomingSpecId: upcomingSpec.id,
      });
    }
  }
  items.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return items;
};

export interface DevnetGroup {
  label: string;
  accent: string;
  active: DevnetCardItem[];
  inactive: InactiveDevnetSeries[];
}

/** Group cards into the fork sections rendered by the index, mirroring `DevnetsIndexPage`. */
export const groupDevnetCards = (): {
  groups: DevnetGroup[];
  hasInactive: boolean;
  isEmpty: boolean;
} => {
  const cardItems = buildCardItems(activeSeries, inactiveSeries);
  const isForkAffiliated = (key: string) =>
    GLAMSTERDAM_CATEGORIES.has(key) ||
    FUSAKA_CATEGORIES.has(key) ||
    PECTRA_CATEGORIES.has(key) ||
    DENCUN_CATEGORIES.has(key);

  const promotedKeys = new Set(
    cardItems.filter((c) => c.activeKeys.length === 0).map((c) => c.categoryKey),
  );
  const remainingInactive = inactiveSeries.filter((c) => !promotedKeys.has(c.categoryKey));

  const groups: DevnetGroup[] = [
    {
      label: 'Glamsterdam',
      accent: GROUP_ACCENT.glamsterdam,
      active: cardItems.filter((c) => GLAMSTERDAM_CATEGORIES.has(c.categoryKey)),
      inactive: remainingInactive.filter((c) => GLAMSTERDAM_CATEGORIES.has(c.categoryKey)),
    },
    {
      label: 'Fusaka',
      accent: GROUP_ACCENT.fusaka,
      active: cardItems.filter((c) => FUSAKA_CATEGORIES.has(c.categoryKey)),
      inactive: remainingInactive.filter((c) => FUSAKA_CATEGORIES.has(c.categoryKey)),
    },
    {
      label: 'Pectra',
      accent: GROUP_ACCENT.pectra,
      active: cardItems.filter((c) => PECTRA_CATEGORIES.has(c.categoryKey)),
      inactive: remainingInactive.filter((c) => PECTRA_CATEGORIES.has(c.categoryKey)),
    },
    {
      label: 'Dencun',
      accent: GROUP_ACCENT.dencun,
      active: cardItems.filter((c) => DENCUN_CATEGORIES.has(c.categoryKey)),
      inactive: remainingInactive.filter((c) => DENCUN_CATEGORIES.has(c.categoryKey)),
    },
    {
      label: 'Other',
      accent: GROUP_ACCENT.other,
      active: cardItems.filter((c) => !isForkAffiliated(c.categoryKey)),
      inactive: remainingInactive.filter((c) => !isForkAffiliated(c.categoryKey)),
    },
  ];

  return {
    groups,
    hasInactive: inactiveSeries.length > 0,
    isEmpty: cardItems.length === 0 && inactiveSeries.length === 0,
  };
};
