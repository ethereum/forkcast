import { describe, expect, it } from 'vitest';
import {
  legacyDevnetId,
  renameDevnetSeries,
  renameDevnetSeriesDeep,
  renameDevnetSeriesKey,
} from './devnet-renames.mjs';

describe('renameDevnetSeries', () => {
  it('renames network keys, repo slugs and the hostnames built from them', () => {
    expect(renameDevnetSeries('focil-devnet-1')).toBe('heze-devnet-1');
    expect(renameDevnetSeries('ethpandaops/frames-devnets')).toBe('ethpandaops/bogota-devnets');
    expect(renameDevnetSeries('https://config.focil-devnet-1.ethpandaops.io/cl/config.yaml')).toBe(
      'https://config.heze-devnet-1.ethpandaops.io/cl/config.yaml',
    );
  });

  it('leaves the feature names in prose alone', () => {
    expect(renameDevnetSeries('FOCIL (EIP-7805) enforces inclusion lists')).toBe(
      'FOCIL (EIP-7805) enforces inclusion lists',
    );
    expect(renameDevnetSeries('a transaction made of frames')).toBe('a transaction made of frames');
  });

  it('leaves ethereum-org URLs alone, since their tags kept the old series name', () => {
    expect(
      renameDevnetSeries(
        'https://github.com/ethereum/execution-specs/releases/tag/tests-focil-devnet%40v0.3.0',
      ),
    ).toBe('https://github.com/ethereum/execution-specs/releases/tag/tests-focil-devnet%40v0.3.0');
  });

  it('still renames around a protected URL', () => {
    expect(
      renameDevnetSeries(
        'focil-devnet-1 pins https://github.com/ethereum/consensus-specs/tree/focil-devnet and ethpandaops/focil-devnets',
      ),
    ).toBe(
      'heze-devnet-1 pins https://github.com/ethereum/consensus-specs/tree/focil-devnet and ethpandaops/heze-devnets',
    );
  });

  it('renames ethPandaOps repo URLs, which did move', () => {
    expect(renameDevnetSeries('https://github.com/ethpandaops/frames-devnets/tree/master')).toBe(
      'https://github.com/ethpandaops/bogota-devnets/tree/master',
    );
  });

  it('is a no-op on the current names, so it survives upstream catching up', () => {
    expect(renameDevnetSeries('heze-devnet-2')).toBe('heze-devnet-2');
    expect(renameDevnetSeriesKey('bogota')).toBe('bogota');
  });
});

describe('renameDevnetSeriesKey', () => {
  it('renames a category key and passes every other series through', () => {
    expect(renameDevnetSeriesKey('focil')).toBe('heze');
    expect(renameDevnetSeriesKey('frames')).toBe('bogota');
    expect(renameDevnetSeriesKey('bal')).toBe('bal');
  });
});

describe('renameDevnetSeriesDeep', () => {
  it('rewrites every string in a nested value', () => {
    expect(
      renameDevnetSeriesDeep({
        repository: 'ethpandaops/focil-devnets',
        serviceUrls: { dora: 'https://dora.focil-devnet-1.ethpandaops.io' },
        names: ['focil-devnet-0', 'frames-devnet-0'],
        chainId: 7084864608,
      }),
    ).toEqual({
      repository: 'ethpandaops/heze-devnets',
      serviceUrls: { dora: 'https://dora.heze-devnet-1.ethpandaops.io' },
      names: ['heze-devnet-0', 'bogota-devnet-0'],
      chainId: 7084864608,
    });
  });
});

describe('legacyDevnetId', () => {
  it('maps a renamed devnet back to the key upstream still publishes', () => {
    expect(legacyDevnetId('bogota-devnet-0')).toBe('frames-devnet-0');
    expect(legacyDevnetId('heze-devnet-2')).toBe('focil-devnet-2');
  });

  it('returns null for a devnet that was never renamed', () => {
    expect(legacyDevnetId('bal-devnet-1')).toBeNull();
    expect(legacyDevnetId('mainnet')).toBeNull();
  });
});
