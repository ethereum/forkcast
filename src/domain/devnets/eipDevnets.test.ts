import { describe, it, expect } from 'vitest';
import { devnetsForEip, devnetStanding, upcomingLabel } from './eipDevnets';
import type { DevnetSpec } from '../../types';

const NOW = Date.UTC(2026, 9, 23) / 1000;

const spec = (
  id: string,
  eips: { number: number; status?: string }[],
  genesisTime?: number
): DevnetSpec =>
  ({
    id,
    eips: eips.map((eip) => ({ number: eip.number, status: eip.status ?? null })),
    ...(genesisTime !== undefined ? { genesisTime } : {}),
  }) as unknown as DevnetSpec;

const SPECS = [
  spec('bogota-devnet-10', [{ number: 1 }], NOW - 86400),
  spec('bogota-devnet-2', [{ number: 1, status: 'updated' }, { number: 2, status: 'new' }]),
  spec('bogota-devnet-1', [{ number: 1, status: 'new' }], NOW - 864000),
  spec('heze-devnet-0', [{ number: 1 }], NOW - 864000),
];

describe('devnetsForEip', () => {
  it('returns one series only, oldest first, numerically rather than alphabetically', () => {
    expect(devnetsForEip(1, ['bogota-devnet'], SPECS, NOW * 1000).map((d) => d.id)).toEqual([
      'bogota-devnet-1',
      'bogota-devnet-2',
      'bogota-devnet-10',
    ]);
  });

  it('keeps the series in the label, dropping only the redundant word', () => {
    const [appearance] = devnetsForEip(2, ['bogota-devnet'], SPECS, NOW * 1000);
    expect(appearance.label).toBe('bogota-2');
    expect(appearance.series).toBe('bogota-devnet');
    expect(appearance.number).toBe(2);
  });

  it('spans the series a fork moves through, in the order they are declared', () => {
    // Numbering restarts at zero on the merged series, so declaration order has to win.
    const merged = [
      spec('hegota-devnet-0', [{ number: 1 }]),
      spec('bogota-devnet-2', [{ number: 1 }], NOW - 86400),
    ];
    expect(
      devnetsForEip(1, ['bogota-devnet', 'hegota-devnet'], merged, NOW * 1000).map((d) => d.id)
    ).toEqual(['bogota-devnet-2', 'hegota-devnet-0']);
  });

  it('ignores a series the fork does not ship on', () => {
    expect(devnetsForEip(1, ['heze-devnet'], SPECS, NOW * 1000).map((d) => d.id)).toEqual([
      'heze-devnet-0',
    ]);
  });

  it('carries the status the devnet spec gives the EIP', () => {
    const [first, second] = devnetsForEip(1, ['bogota-devnet'], SPECS, NOW * 1000);
    expect(first.status).toBe('new');
    expect(second.status).toBe('updated');
  });

  it('counts a devnet as launched only once its genesis has passed', () => {
    const upcoming = [spec('bogota-devnet-3', [{ number: 1 }], NOW + 86400)];
    expect(devnetsForEip(1, ['bogota-devnet'], upcoming, NOW * 1000)[0].launched).toBe(false);
    // No genesis time at all is a devnet cartographoor has not seen start.
    expect(devnetsForEip(2, ['bogota-devnet'], SPECS, NOW * 1000)[0].launched).toBe(false);
    expect(devnetsForEip(1, ['bogota-devnet'], SPECS, NOW * 1000)[0].launched).toBe(true);
  });

  it('returns nothing for an EIP no devnet in the series carries', () => {
    expect(devnetsForEip(99, ['bogota-devnet'], SPECS, NOW * 1000)).toEqual([]);
  });
});

describe('devnetStanding', () => {
  const standing = (eipId: number, specs = SPECS) =>
    devnetStanding(devnetsForEip(eipId, ['bogota-devnet'], specs, NOW * 1000));

  it('names the newest launched devnet, not the newest overall', () => {
    // EIP-1 runs in devnet-1 and devnet-10, and is also booked onto the unlaunched devnet-2.
    const result = standing(1)!;
    expect(result.state).toBe('running');
    expect(result.shown.id).toBe('bogota-devnet-10');
  });

  it('carries a planned devnet alongside one the EIP already runs in', () => {
    const carried = [
      spec('bogota-devnet-1', [{ number: 5 }], NOW - 86400),
      spec('bogota-devnet-2', [{ number: 5 }]),
    ];
    const result = standing(5, carried)!;
    expect(result.state).toBe('running');
    expect(result.shown.id).toBe('bogota-devnet-1');
    expect(result.upcoming?.id).toBe('bogota-devnet-2');
  });

  it('reads as planned while every devnet carrying it is still to come', () => {
    const result = standing(2)!;
    expect(result.state).toBe('planned');
    expect(result.shown.id).toBe('bogota-devnet-2');
    expect(result.upcoming).toBeNull();
  });

  it('has nothing to say about an EIP no devnet carries', () => {
    expect(standing(99)).toBeNull();
  });
});

describe('upcomingLabel', () => {
  const standingOf = (specs: DevnetSpec[], series: string[]) =>
    devnetStanding(devnetsForEip(1, series, specs, NOW * 1000))!;

  it('gives just the number while the fork stays on one series', () => {
    const same = [
      spec('bogota-devnet-1', [{ number: 1 }], NOW - 86400),
      spec('bogota-devnet-2', [{ number: 1 }]),
    ];
    expect(upcomingLabel(standingOf(same, ['bogota-devnet']))).toBe('→2');
  });

  it('names the series once the fork has moved on, so it cannot read as going backwards', () => {
    const moved = [
      spec('bogota-devnet-2', [{ number: 1 }], NOW - 86400),
      spec('hegota-devnet-0', [{ number: 1 }]),
    ];
    expect(upcomingLabel(standingOf(moved, ['bogota-devnet', 'hegota-devnet']))).toBe(
      '→ hegota-0'
    );
  });

  it('has no label when nothing is upcoming', () => {
    const launchedOnly = [spec('bogota-devnet-1', [{ number: 1 }], NOW - 86400)];
    expect(upcomingLabel(standingOf(launchedOnly, ['bogota-devnet']))).toBeNull();
  });
});
