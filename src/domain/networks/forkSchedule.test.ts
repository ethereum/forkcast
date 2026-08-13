import { describe, expect, it } from 'vitest';
import { buildForkRows } from './forkSchedule';

const NOW = 2_000;

describe('buildForkRows', () => {
  it('collapses the duplicate fulu/fusaka listing into one row', () => {
    // hoodi and sepolia report the same activation twice, once under the CL fork
    // name and once under the combined upgrade name.
    const rows = buildForkRows(
      {
        consensus: {
          fulu: { epoch: 50688, timestamp: 1_000, minClientVersions: { prysm: '6.1.3' } },
          fusaka: { epoch: 50688, timestamp: 1_000, minClientVersions: { teku: '25.10.0' } },
        },
      },
      NOW,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].upgradeName).toBe('fusaka');
    expect(rows[0].upgradePath).toBe('/upgrade/fusaka');
    expect(rows[0].consensus).toEqual({ name: 'fulu', epoch: 50688 });
    expect(rows[0].minClientVersions).toEqual({ prysm: '6.1.3', teku: '25.10.0' });
  });

  it('merges the consensus and execution halves of an upgrade by timestamp', () => {
    const rows = buildForkRows(
      {
        consensus: { deneb: { epoch: 269568, timestamp: 1_000 } },
        execution: { cancun: { block: 19426587, timestamp: 1_000 } },
      },
      NOW,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].consensus).toEqual({ name: 'deneb', epoch: 269568 });
    expect(rows[0].execution).toEqual({ name: 'cancun', block: 19426587 });
  });

  it('names a genesis row after the newest fork it turns on, not the oldest', () => {
    // hoodi launched with everything through Deneb active at epoch 0.
    const rows = buildForkRows(
      {
        consensus: {
          altair: { epoch: 0, timestamp: 1_000 },
          bellatrix: { epoch: 0, timestamp: 1_000 },
          capella: { epoch: 0, timestamp: 1_000 },
          deneb: { epoch: 0, timestamp: 1_000 },
        },
      },
      NOW,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].upgradeName).toBe('dencun');
    expect(rows[0].consensus).toEqual({ name: 'deneb', epoch: 0 });
  });

  it('names Dencun but does not link it — the upgrade has no public page', () => {
    const rows = buildForkRows({ consensus: { deneb: { epoch: 0, timestamp: 1_000 } } }, NOW);

    expect(rows[0].upgradeName).toBe('dencun');
    expect(rows[0].upgradePath).toBeNull();
  });

  it('leaves forks that predate combined naming without an upgrade name', () => {
    const rows = buildForkRows({ execution: { london: { block: 12965000, timestamp: 1_000 } } }, NOW);

    expect(rows[0].upgradeName).toBeNull();
    expect(rows[0].execution).toEqual({ name: 'london', block: 12965000 });
  });

  it('orders rows chronologically and splits activated from upcoming', () => {
    const rows = buildForkRows(
      {
        consensus: {
          gloas: { epoch: 30, timestamp: 3_000 },
          electra: { epoch: 10, timestamp: 1_000 },
          fulu: { epoch: 20, timestamp: 2_000 },
        },
      },
      NOW,
    );

    expect(rows.map((row) => row.upgradeName)).toEqual(['pectra', 'fusaka', 'glamsterdam']);
    // `now` itself counts as activated.
    expect(rows.map((row) => row.activated)).toEqual([true, true, false]);
  });

  it('returns nothing when the network reports no forks', () => {
    expect(buildForkRows(undefined, NOW)).toEqual([]);
  });
});
