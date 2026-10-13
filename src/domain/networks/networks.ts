import type {
  NetworksJsonResponse,
  ActiveDevnetSeries,
  InactiveDevnetSeries,
  NetworkEntry,
  NetworkServiceUrls,
  PublicNetworkSummary,
} from '../../types/networks';
import networksSnapshotRaw from '../../data/generated/networks.json';
import { buildForkRows, type ForkRow } from './forkSchedule';
import { isSeriesMember, parseNetworkKey } from './networkKeys';
import { PROMOTED_DEVNETS } from './promotedDevnets';

// The ethPandaOps cartographoor networks.json is runtime-discovered data. To keep
// Astro's getStaticPaths() and the hydrated network islands in agreement about which
// `/networks/{id}` routes exist, both read this single build-time snapshot
// (src/data/generated/networks.json, refreshed by snapshot-runtime-routes.mjs)
// instead of live-fetching. That guarantees the index never links to a network-only
// route the static build didn't emit. This module is the one pure home for the
// snapshot derivation; the React hook (useNetworks) is a thin wrapper over it.
const snapshot = networksSnapshotRaw as unknown as NetworksJsonResponse;

/** Lookup a specific network entry by key (e.g. "bal-devnet-3"). */
export function getNetworkEntry(id: string): NetworkEntry | null {
  return snapshot.networks[id] ?? null;
}

/** Lookup metadata for a category key (e.g. "bal"). */
export function getNetworkMetadata(categoryKey: string) {
  return snapshot.networkMetadata[categoryKey] ?? null;
}

interface ActiveNetwork {
  key: string;
  version: number;
  isDevnet: boolean;
  serviceUrls: NetworkServiceUrls | null;
}

/**
 * Given a category key (e.g. "bal") and the flat networks map, find all active
 * networks in that series: devnets first, each sorted by version descending, with
 * the series' shadow forks after them.
 */
function findActiveNetworks(
  categoryKey: string,
  networks: Record<string, NetworkEntry>,
): ActiveNetwork[] {
  const results: ActiveNetwork[] = [];

  for (const [key, entry] of Object.entries(networks)) {
    if (entry.status !== 'active') continue;
    const parsed = parseNetworkKey(key);
    if (!parsed || parsed.categoryKey !== categoryKey) continue;
    results.push({
      key,
      version: parsed.version,
      isDevnet: parsed.kind === 'devnet',
      serviceUrls: entry.serviceUrls ?? null,
    });
  }

  results.sort((a, b) => Number(b.isDevnet) - Number(a.isDevnet) || b.version - a.version);
  return results;
}

/**
 * Find the highest devnet version across all networks (any status) for a category.
 * Shadow forks are numbered in their own sequence, so they are left out: the index
 * compares this against the local spec files, which only ever describe devnets.
 */
function findHighestVersion(
  categoryKey: string,
  networks: Record<string, NetworkEntry>,
): number | null {
  let max: number | null = null;
  for (const key of Object.keys(networks)) {
    const parsed = parseNetworkKey(key);
    if (!parsed || parsed.categoryKey !== categoryKey || parsed.kind !== 'devnet') continue;
    if (max === null || parsed.version > max) max = parsed.version;
  }
  return max;
}

/**
 * Pure derivation of the active/inactive devnet series from a networks snapshot.
 * Exported so the route-shaping rules (version-descending sort, the inactive
 * branch, version-key matching) can be unit-tested against a fixture; the
 * module-level `activeSeries`/`inactiveSeries` apply it to the committed snapshot.
 */
export function buildDevnetSeries(
  source: NetworksJsonResponse,
): { activeSeries: ActiveDevnetSeries[]; inactiveSeries: InactiveDevnetSeries[] } {
  const activeSeries: ActiveDevnetSeries[] = [];
  const inactiveSeries: InactiveDevnetSeries[] = [];

  for (const [categoryKey, meta] of Object.entries(source.networkMetadata)) {
    if (meta.stats.activeNetworks === 0) {
      inactiveSeries.push({
        categoryKey,
        displayName: meta.displayName,
        description: meta.description,
        highestKnownVersion: findHighestVersion(categoryKey, source.networks),
      });
      continue;
    }

    const active = findActiveNetworks(categoryKey, source.networks);
    const latestDevnet = active.find((network) => network.isDevnet) ?? null;
    activeSeries.push({
      categoryKey,
      displayName: meta.displayName,
      description: meta.description,
      links: meta.links,
      activeKeys: active.map((a) => a.key),
      latestActiveVersion: latestDevnet?.version ?? null,
      highestKnownVersion: findHighestVersion(categoryKey, source.networks),
      serviceUrls: latestDevnet?.serviceUrls ?? null,
    });
  }

  activeSeries.sort((a, b) => a.displayName.localeCompare(b.displayName));
  inactiveSeries.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return { activeSeries, inactiveSeries };
}

// Derived once from the static snapshot.
export const { activeSeries, inactiveSeries } = buildDevnetSeries(snapshot);

/** Every network key claimed by a devnet series, by the same parse the series use. */
function seriesClaimedKeys(source: NetworksJsonResponse): Set<string> {
  const claimed = new Set<string>();
  for (const categoryKey of Object.keys(source.networkMetadata)) {
    for (const key of Object.keys(source.networks)) {
      if (isSeriesMember(key, categoryKey)) claimed.add(key);
    }
  }
  return claimed;
}

/** Latest activated / next scheduled fork names for a network entry. */
function forkSummary(entry: NetworkEntry, now: number): { latestFork: string | null; nextFork: string | null } {
  const rows = buildForkRows(entry.forks, now);
  const activated = rows.filter((row) => row.activated);
  const forkLabel = (row: ForkRow | undefined) =>
    row ? (row.upgradeName ?? row.consensus?.name ?? row.execution?.name ?? null) : null;

  return {
    latestFork: forkLabel(activated[activated.length - 1]),
    nextFork: forkLabel(rows.find((row) => !row.activated)),
  };
}

/**
 * The active networks no devnet series claims — mainnet, sepolia, hoodi, and any
 * public testnet that appears later. Derived rather than listed so a new testnet
 * shows up on its own and a retired one (holesky) drops out, with no code change.
 *
 * Devnets that are really public testnets (PROMOTED_DEVNETS) are appended after
 * those, since a series always claims their key and cartographoor carries no
 * signal that they're public.
 */
export function buildPublicNetworks(
  source: NetworksJsonResponse,
  now: number = Date.now(),
): PublicNetworkSummary[] {
  const claimed = seriesClaimedKeys(source);
  const summaries: PublicNetworkSummary[] = [];

  for (const [key, entry] of Object.entries(source.networks)) {
    if (entry.status !== 'active' || claimed.has(key)) continue;

    summaries.push({
      key,
      displayName: key,
      description: entry.description ?? '',
      chainId: entry.chainId ?? null,
      genesisTime: entry.genesisConfig?.genesisTime ?? null,
      ...forkSummary(entry, now),
      promotedLabel: null,
    });
  }

  // Mainnet leads; the testnets follow alphabetically.
  summaries.sort((a, b) => {
    if (a.key === 'mainnet') return -1;
    if (b.key === 'mainnet') return 1;
    return a.key.localeCompare(b.key);
  });

  const promoted: PublicNetworkSummary[] = [];
  for (const [key, info] of Object.entries(PROMOTED_DEVNETS)) {
    const entry = source.networks[key];
    if (!entry || entry.status !== 'active') continue;

    promoted.push({
      key,
      displayName: info.name,
      // Cartographoor carries no description for devnets, so the curated label doubles as one.
      description: info.label,
      chainId: entry.chainId ?? null,
      genesisTime: entry.genesisConfig?.genesisTime ?? null,
      ...forkSummary(entry, now),
      promotedLabel: info.label,
    });
  }
  promoted.sort((a, b) => a.key.localeCompare(b.key));

  return [...summaries, ...promoted];
}

export const publicNetworks = buildPublicNetworks(snapshot);

// Only the genuine cartographoor public networks — promoted devnets are index
// cards, but their routes must stay on the devnet-spec branch (see the detail
// page and getStaticPaths), and siteSearch already emits them as devnet entities.
const publicNetworkKeys = new Set(
  publicNetworks.filter((network) => network.promotedLabel === null).map((network) => network.key),
);

/**
 * Every network key in the snapshot, active or not. A devnet keeps its page after
 * it is torn down: cartographoor keeps serving the entry (stripped back to its
 * name, repo and status), and a link that was published while the devnet ran
 * should not start 404ing the day it is shut down.
 */
export function getKnownNetworkKeys(): string[] {
  return Object.keys(snapshot.networks);
}

/** Route ids for the public-network detail pages. */
export function getPublicNetworkKeys(): string[] {
  return Array.from(publicNetworkKeys);
}

export function isPublicNetworkKey(id: string): boolean {
  return publicNetworkKeys.has(id);
}
