import { describe, expect, it } from 'vitest';
import { isSeriesMember, parseNetworkKey, shadowForkLabel } from './networkKeys';

describe('parseNetworkKey', () => {
  it('splits a devnet key into series, kind and version', () => {
    expect(parseNetworkKey('bal-devnet-3')).toEqual({
      categoryKey: 'bal',
      kind: 'devnet',
      version: 3,
    });
  });

  it('reads a shadow fork as its own kind, not as a devnet version', () => {
    expect(parseNetworkKey('glamsterdam-msf-2')).toEqual({
      categoryKey: 'glamsterdam',
      kind: 'msf',
      version: 2,
    });
    expect(parseNetworkKey('fusaka-holsf-1')?.kind).toBe('holsf');
    expect(parseNetworkKey('glamsterdam-sepsf-1')?.kind).toBe('sepsf');
    expect(parseNetworkKey('dencun-gsf-2')?.kind).toBe('gsf');
  });

  it('returns null for keys that belong to no series', () => {
    expect(parseNetworkKey('mainnet')).toBeNull();
    expect(parseNetworkKey('dencun-devnet-p')).toBeNull();
    expect(parseNetworkKey('dencun-sepolia-sf1')).toBeNull();
  });
});

describe('isSeriesMember', () => {
  it('claims a series\' devnets and shadow forks alike', () => {
    expect(isSeriesMember('glamsterdam-devnet-8', 'glamsterdam')).toBe(true);
    expect(isSeriesMember('glamsterdam-msf-2', 'glamsterdam')).toBe(true);
  });

  it('matches the series exactly, so a category cannot claim a neighbour', () => {
    expect(isSeriesMember('glamsterdam-msf-2', 'glam')).toBe(false);
    expect(isSeriesMember('axb-devnet-2', 'a.b')).toBe(false);
  });
});

describe('shadowForkLabel', () => {
  it('names the network a shadow fork copies', () => {
    expect(shadowForkLabel('glamsterdam-msf-2')).toBe('Mainnet shadow fork');
    expect(shadowForkLabel('glamsterdam-sepsf-1')).toBe('Sepolia shadow fork');
    expect(shadowForkLabel('fusaka-holsf-0')).toBe('Holešky shadow fork');
    expect(shadowForkLabel('dencun-gsf-1')).toBe('Goerli shadow fork');
  });

  it('is null for a devnet and for an unparseable key', () => {
    expect(shadowForkLabel('bal-devnet-3')).toBeNull();
    expect(shadowForkLabel('mainnet')).toBeNull();
  });
});
