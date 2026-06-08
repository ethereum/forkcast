import { describe, expect, it } from 'vitest';
import type {
  NetworkEntry,
  NetworkMetadataEntry,
  NetworkMetadataStats,
  NetworksJsonResponse,
} from '../../types/devnet-networks';
import { buildDevnetSeries } from './networks';

const meta = (
  displayName: string,
  activeNetworks: number,
  statsExtra: Partial<NetworkMetadataStats> = {},
): NetworkMetadataEntry => ({
  displayName,
  description: '',
  links: null,
  image: '',
  stats: { totalNetworks: 0, activeNetworks, inactiveNetworks: 0, networkNames: [], ...statsExtra },
});

const net = (status: NetworkEntry['status'], overrides: Partial<NetworkEntry> = {}): NetworkEntry => ({
  name: '',
  repository: '',
  path: '',
  url: '',
  status,
  ...overrides,
});

describe('buildDevnetSeries', () => {
  it('returns active keys version-descending, tracking the latest version + its serviceUrls', () => {
    const source: NetworksJsonResponse = {
      networkMetadata: { bal: meta('BAL', 2) },
      networks: {
        'bal-devnet-1': net('active', { serviceUrls: { faucet: 'f1' } }),
        'bal-devnet-3': net('active', { serviceUrls: { faucet: 'f3' } }),
        'bal-devnet-2': net('inactive'),
      },
    };

    const { activeSeries, inactiveSeries } = buildDevnetSeries(source);

    expect(inactiveSeries).toEqual([]);
    expect(activeSeries).toHaveLength(1);
    expect(activeSeries[0].activeKeys).toEqual(['bal-devnet-3', 'bal-devnet-1']);
    expect(activeSeries[0].latestActiveVersion).toBe(3);
    expect(activeSeries[0].serviceUrls).toEqual({ faucet: 'f3' });
  });

  it('routes a category with zero active networks to inactiveSeries with the highest known version', () => {
    const source: NetworksJsonResponse = {
      networkMetadata: { focil: meta('FOCIL', 0) },
      networks: {
        'focil-devnet-1': net('inactive'),
        'focil-devnet-4': net('inactive'),
      },
    };

    const { activeSeries, inactiveSeries } = buildDevnetSeries(source);

    expect(activeSeries).toEqual([]);
    expect(inactiveSeries).toEqual([
      expect.objectContaining({ categoryKey: 'focil', highestKnownVersion: 4 }),
    ]);
  });

  it('escapes the category key so a regex metacharacter cannot match another category\'s networks', () => {
    // Without escaping, the "a.b" matcher (`^a.b-.*-(\d+)$`) would also match
    // "axb-devnet-2" because `.` is any-char, contaminating the active key set.
    const source: NetworksJsonResponse = {
      networkMetadata: { 'a.b': meta('A dot B', 1), axb: meta('Axb', 1) },
      networks: {
        'a.b-devnet-1': net('active'),
        'axb-devnet-2': net('active'),
      },
    };

    const { activeSeries } = buildDevnetSeries(source);

    // Sorted by displayName: "A dot B" before "Axb".
    expect(activeSeries.map((s) => s.categoryKey)).toEqual(['a.b', 'axb']);
    expect(activeSeries[0].activeKeys).toEqual(['a.b-devnet-1']);
    expect(activeSeries[1].activeKeys).toEqual(['axb-devnet-2']);
  });
});
