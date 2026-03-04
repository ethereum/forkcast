import { useState, useEffect, useCallback } from 'react';
import type {
  NetworksJsonResponse,
  ActiveDevnetSeries,
  InactiveDevnetSeries,
  NetworkEntry,
  NetworkServiceUrls,
} from '../types/devnet-networks';

const NETWORKS_URL =
  'https://ethpandaops-platform-production-cartographoor.ams3.digitaloceanspaces.com/networks.json';

interface UseDevnetNetworksResult {
  activeSeries: ActiveDevnetSeries[];
  inactiveSeries: InactiveDevnetSeries[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Lookup a specific network entry by key (e.g. "bal-devnet-3"). */
export function getNetworkEntry(id: string): NetworkEntry | null {
  return cachedRaw?.networks[id] ?? null;
}

/** Lookup metadata for a category key (e.g. "bal"). */
export function getNetworkMetadata(categoryKey: string) {
  return cachedRaw?.networkMetadata[categoryKey] ?? null;
}

// Module-level caches
let cachedSeries: ActiveDevnetSeries[] | null = null;
let cachedInactive: InactiveDevnetSeries[] | null = null;
let cachedRaw: NetworksJsonResponse | null = null;

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

export function useDevnetNetworks(): UseDevnetNetworksResult {
  const [activeSeries, setActiveSeries] = useState<ActiveDevnetSeries[]>(cachedSeries || []);
  const [inactiveSeries, setInactiveSeries] = useState<InactiveDevnetSeries[]>(cachedInactive || []);
  const [loading, setLoading] = useState(!cachedSeries);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(NETWORKS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch networks: ${response.status}`);
      }

      const data: NetworksJsonResponse = await response.json();
      const series: ActiveDevnetSeries[] = [];
      const inactive: InactiveDevnetSeries[] = [];

      for (const [categoryKey, meta] of Object.entries(data.networkMetadata)) {
        if (meta.stats.activeNetworks === 0) {
          inactive.push({
            categoryKey,
            displayName: meta.displayName,
            description: meta.description,
          });
          continue;
        }

        const active = findActiveNetworks(categoryKey, data.networks);
        const latest = active[0] ?? null;
        series.push({
          categoryKey,
          displayName: meta.displayName,
          description: meta.description,
          links: meta.links,
          activeKeys: active.map((a) => a.key),
          latestActiveVersion: latest?.version ?? null,
          serviceUrls: latest?.serviceUrls ?? null,
        });
      }

      series.sort((a, b) => a.displayName.localeCompare(b.displayName));
      inactive.sort((a, b) => a.displayName.localeCompare(b.displayName));

      setActiveSeries(series);
      setInactiveSeries(inactive);
      cachedSeries = series;
      cachedInactive = inactive;
      cachedRaw = data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedSeries) {
      fetchData();
    }
  }, [fetchData]);

  const refetch = useCallback(() => {
    cachedSeries = null;
    cachedInactive = null;
    cachedRaw = null;
    fetchData();
  }, [fetchData]);

  return { activeSeries, inactiveSeries, loading, error, refetch };
}
