import type {
  NetworksJsonResponse,
  ActiveDevnetSeries,
  InactiveDevnetSeries,
  NetworkEntry,
  NetworkServiceUrls,
} from '../types/devnet-networks';
import networksSnapshotRaw from '../data/generated/devnet-networks.json';

// The ethPandaOps cartographoor networks.json is runtime-discovered data. To keep
// Astro's getStaticPaths() and this hydrated island in agreement about which
// `/devnets/{id}` routes exist, both read a single build-time snapshot
// (src/data/generated/devnet-networks.json, refreshed by snapshot-runtime-routes.mjs)
// instead of live-fetching. That guarantees the index never links to a network-only
// route the static build didn't emit.
const snapshot = networksSnapshotRaw as unknown as NetworksJsonResponse;

interface UseDevnetNetworksResult {
  activeSeries: ActiveDevnetSeries[];
  inactiveSeries: InactiveDevnetSeries[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Lookup a specific network entry by key (e.g. "bal-devnet-3"). */
export function getNetworkEntry(id: string): NetworkEntry | null {
  return snapshot.networks[id] ?? null;
}

/** Lookup metadata for a category key (e.g. "bal"). */
export function getNetworkMetadata(categoryKey: string) {
  return snapshot.networkMetadata[categoryKey] ?? null;
}

/**
 * Given a category key (e.g. "bal") and the flat networks map,
 * find all active networks, sorted by version descending.
 */
function findActiveNetworks(
  categoryKey: string,
  networks: Record<string, NetworkEntry>,
): Array<{ key: string; version: number; serviceUrls: NetworkServiceUrls | null }> {
  const results: Array<{ key: string; version: number; serviceUrls: NetworkServiceUrls | null }> = [];

  for (const [key, entry] of Object.entries(networks)) {
    if (entry.status !== 'active') continue;
    const match = key.match(new RegExp(`^${categoryKey}-.*-(\\d+)$`));
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
  let max: number | null = null;
  for (const key of Object.keys(networks)) {
    const match = key.match(new RegExp(`^${categoryKey}-.*-(\\d+)$`));
    if (!match) continue;
    const version = parseInt(match[1], 10);
    if (max === null || version > max) max = version;
  }
  return max;
}

function buildSeries(): { activeSeries: ActiveDevnetSeries[]; inactiveSeries: InactiveDevnetSeries[] } {
  const activeSeries: ActiveDevnetSeries[] = [];
  const inactiveSeries: InactiveDevnetSeries[] = [];

  for (const [categoryKey, meta] of Object.entries(snapshot.networkMetadata)) {
    if (meta.stats.activeNetworks === 0) {
      inactiveSeries.push({
        categoryKey,
        displayName: meta.displayName,
        description: meta.description,
        highestKnownVersion: findHighestVersion(categoryKey, snapshot.networks),
      });
      continue;
    }

    const active = findActiveNetworks(categoryKey, snapshot.networks);
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
const { activeSeries, inactiveSeries } = buildSeries();

/**
 * All active devnet network keys the index can link to (e.g. "bal-devnet-3").
 * Astro's getStaticPaths() unions this with local spec IDs so every link the
 * island renders resolves to an emitted page. Network-only routes are the active
 * keys without a local spec.
 */
export function getActiveDevnetNetworkKeys(): string[] {
  return activeSeries.flatMap((series) => series.activeKeys);
}

export function useDevnetNetworks(): UseDevnetNetworksResult {
  // Backed by the build-time snapshot, so data is available synchronously on the
  // first render — no loading state, no runtime fetch.
  return {
    activeSeries,
    inactiveSeries,
    loading: false,
    error: null,
    refetch: () => {},
  };
}
