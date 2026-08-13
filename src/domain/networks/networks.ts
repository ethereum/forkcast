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

// Network keys look like "{categoryKey}-{label}-{version}", e.g. "bal-devnet-3".
// The category key comes from externally-discovered cartographoor metadata, so it
// is escaped before being interpolated into the matcher — otherwise a key with a
// regex metacharacter could match the wrong networks (or throw). Built once per
// category rather than per network key.
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const versionMatcher = (categoryKey: string): RegExp =>
  new RegExp(`^${escapeRegExp(categoryKey)}-.*-(\\d+)$`);

/**
 * Given a category key (e.g. "bal") and the flat networks map,
 * find all active networks, sorted by version descending.
 */
function findActiveNetworks(
  categoryKey: string,
  networks: Record<string, NetworkEntry>,
): Array<{ key: string; version: number; serviceUrls: NetworkServiceUrls | null }> {
  const matcher = versionMatcher(categoryKey);
  const results: Array<{ key: string; version: number; serviceUrls: NetworkServiceUrls | null }> = [];

  for (const [key, entry] of Object.entries(networks)) {
    if (entry.status !== 'active') continue;
    const match = key.match(matcher);
    if (!match) continue;
    results.push({ key, version: parseInt(match[1], 10), serviceUrls: entry.serviceUrls ?? null });
  }

  results.sort((a, b) => b.version - a.version);
  return results;
}

/** Find the highest version number across all networks (any status) for a category. */
function findHighestVersion(
  categoryKey: string,
  networks: Record<string, NetworkEntry>,
): number | null {
  const matcher = versionMatcher(categoryKey);
  let max: number | null = null;
  for (const key of Object.keys(networks)) {
    const match = key.match(matcher);
    if (!match) continue;
    const version = parseInt(match[1], 10);
    if (max === null || version > max) max = version;
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
    const latest = active[0] ?? null;
    activeSeries.push({
      categoryKey,
      displayName: meta.displayName,
      description: meta.description,
      links: meta.links,
      activeKeys: active.map((a) => a.key),
      latestActiveVersion: latest?.version ?? null,
      serviceUrls: latest?.serviceUrls ?? null,
    });
  }

  activeSeries.sort((a, b) => a.displayName.localeCompare(b.displayName));
  inactiveSeries.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return { activeSeries, inactiveSeries };
}

// Derived once from the static snapshot.
export const { activeSeries, inactiveSeries } = buildDevnetSeries(snapshot);

/**
 * All active devnet network keys the index can link to (e.g. "bal-devnet-3").
 * Astro's getStaticPaths() unions this with local spec IDs so every link the
 * island renders resolves to an emitted page. Network-only routes are the active
 * keys without a local spec.
 */
export function getActiveDevnetNetworkKeys(): string[] {
  return activeSeries.flatMap((series) => series.activeKeys);
}

/** Every network key claimed by a devnet series, using the same matcher the series do. */
function seriesClaimedKeys(source: NetworksJsonResponse): Set<string> {
  const claimed = new Set<string>();
  for (const categoryKey of Object.keys(source.networkMetadata)) {
    const matcher = versionMatcher(categoryKey);
    for (const key of Object.keys(source.networks)) {
      if (matcher.test(key)) claimed.add(key);
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

/** Route ids for the public-network detail pages. */
export function getPublicNetworkKeys(): string[] {
  return Array.from(publicNetworkKeys);
}

export function isPublicNetworkKey(id: string): boolean {
  return publicNetworkKeys.has(id);
}
