import { describe, expect, it } from 'vitest';
import type {
  NetworkEntry,
  NetworkMetadataEntry,
  NetworkMetadataStats,
  NetworksJsonResponse,
} from '../../types/networks';
import { buildDevnetSeries, buildPublicNetworks, isPublicNetworkKey } from './networks';
import { PROMOTED_DEVNETS } from './promotedDevnets';

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

describe('buildPublicNetworks', () => {
  const NOW = 2_000;

  it('keeps active networks no series claims, and drops the ones a series does', () => {
    const source: NetworksJsonResponse = {
      networkMetadata: { dencun: meta('Dencun', 1), fusaka: meta('Fusaka', 1) },
      networks: {
        // Series keys don't have to say "devnet" — the matcher is `{category}-*-{n}`.
        'dencun-gsf-1': net('active'),
        'fusaka-msf-0': net('active'),
        mainnet: net('active', { chainId: 1 }),
        sepolia: net('active', { chainId: 11155111 }),
        hoodi: net('active', { chainId: 560048 }),
      },
    };

    expect(buildPublicNetworks(source, NOW).map((n) => n.key)).toEqual([
      'mainnet',
      'hoodi',
      'sepolia',
    ]);
  });

  it('excludes retired networks, the same way devnet series do', () => {
    const source: NetworksJsonResponse = {
      networkMetadata: {},
      networks: { mainnet: net('active'), holesky: net('inactive') },
    };

    expect(buildPublicNetworks(source, NOW).map((n) => n.key)).toEqual(['mainnet']);
  });

  it('reports the last activated fork and the next scheduled one by combined name', () => {
    const source: NetworksJsonResponse = {
      networkMetadata: {},
      networks: {
        hoodi: net('active', {
          forks: {
            consensus: {
              deneb: { epoch: 0, timestamp: 500 },
              electra: { epoch: 10, timestamp: 1_500 },
              fulu: { epoch: 20, timestamp: 3_000 },
            },
          },
        }),
      },
    };

    const [hoodi] = buildPublicNetworks(source, NOW);
    expect(hoodi.latestFork).toBe('pectra');
    expect(hoodi.nextFork).toBe('fusaka');
  });

  const promotedSource = (): NetworksJsonResponse => ({
    networkMetadata: { glamsterdam: meta('Glamsterdam', 2) },
    networks: {
      mainnet: net('active'),
      sepolia: net('active'),
      'glamsterdam-devnet-7': net('active'),
      'glamsterdam-devnet-8': net('active', {
        chainId: 7091047534,
        forks: { consensus: { gloas: { epoch: 1536, timestamp: 3_000 } } },
      }),
    },
  });

  it('surfaces a promoted devnet as a public network even though a series claims its key', () => {
    const promoted = buildPublicNetworks(promotedSource(), NOW).find(
      (n) => n.key === 'glamsterdam-devnet-8',
    );

    expect(promoted).toMatchObject({
      displayName: PROMOTED_DEVNETS['glamsterdam-devnet-8'].name,
      promotedLabel: PROMOTED_DEVNETS['glamsterdam-devnet-8'].label,
      chainId: 7091047534,
      nextFork: 'glamsterdam',
    });
  });

  it('sorts promoted devnets after mainnet and the genuine public networks', () => {
    expect(buildPublicNetworks(promotedSource(), NOW).map((n) => n.key)).toEqual([
      'mainnet',
      'sepolia',
      'glamsterdam-devnet-8',
    ]);
  });

  it('keeps a promoted devnet off the public-network route list, so it renders its spec page', () => {
    expect(isPublicNetworkKey('glamsterdam-devnet-8')).toBe(false);
  });
});
