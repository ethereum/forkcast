import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { eipsData } from '../../data/eips';
import { getForkRelationship } from '../../utils/eip';
import { NetworkUpgrade } from '../../data/upgrades';
import {
  buildCadenceStats,
  buildCadenceTimeline,
  CadenceTimeline,
  FORK_EIP_COUNTS,
  FORK_SPEC_LINES,
  NEXT_FORK_EIP_COUNT,
  NEXT_FORK_SPEC_LINES,
  PLANNED_STATUSES,
  SHIPPED_STATUSES,
} from './timeline';

const upgrade = (
  id: string,
  name: string,
  activationDate: string,
  status: NetworkUpgrade['status'] = 'Live',
  projectedActivation?: string,
): NetworkUpgrade =>
  ({
    id,
    name,
    activationDate,
    status,
    projectedActivation,
    path: `/upgrade/${id}`,
  }) as NetworkUpgrade;

// The real post-Merge sequence, so the layout assertions are checked against the
// spacing the page actually renders.
const UPGRADES = [
  upgrade('the-merge', 'The Merge', 'Sep 15, 2022'),
  upgrade('shapella', 'Shapella Upgrade', 'Apr 12, 2023'),
  upgrade('dencun', 'Dencun Upgrade', 'Mar 13, 2024'),
  upgrade('pectra', 'Pectra Upgrade', 'May 7, 2025'),
  upgrade('fusaka', 'Fusaka Upgrade', 'Dec 3, 2025'),
  upgrade('glamsterdam', 'Glamsterdam Upgrade', '2026', 'Upcoming', '2026-11-18'),
  upgrade('hegota', 'Hegotá Upgrade', '2027', 'Planning', '2027-06-09'),
];

const NOW = new Date(2026, 7, 19); // Aug 19, 2026

// Frozen copies of the payload tables. The live ones move — the upcoming fork's
// especially, on every SFI/DFI — and the assertions below are about the layout
// and scale maths, not about today's counts. Pinning them here means a stage
// change touches only the drift tests at the bottom of this file, which exist to
// check the live tables against Forkcast's own data.
const EIP_COUNTS: Record<string, { eips: number }> = {
  Shapella: { eips: 5 },
  Dencun: { eips: 9 },
  Pectra: { eips: 12 },
  Fusaka: { eips: 13 },
};
const NEXT_EIP_COUNT: Record<string, number> = { Glamsterdam: 23 };
const SPEC_LINES: Record<string, number> = {
  Shapella: 385,
  Dencun: 1455,
  Pectra: 3354,
  Fusaka: 1943,
};
const NEXT_SPEC_LINES: Record<string, number> = { Glamsterdam: 4132 };

const timelineAt = (now: Date, upgrades: NetworkUpgrade[] = UPGRADES) =>
  buildCadenceTimeline(now, upgrades, EIP_COUNTS, NEXT_EIP_COUNT);

const statsFor = (timeline: CadenceTimeline) =>
  buildCadenceStats(timeline, SPEC_LINES, NEXT_SPEC_LINES);

describe('buildCadenceTimeline', () => {
  it('places forks in time order and drops non-Live upgrades', () => {
    const timeline = timelineAt(NOW)!;
    expect(timeline.forks.map((f) => f.name)).toEqual([
      'Shapella',
      'Dencun',
      'Pectra',
      'Fusaka',
    ]);
  });

  it('holds The Merge out of the bars as the axis origin', () => {
    const timeline = timelineAt(NOW)!;
    expect(timeline.origin).toMatchObject({ id: 'the-merge', name: 'The Merge' });
    // Drawing a bar for The Merge would invite a payload comparison it should
    // never be part of.
    expect(timeline.forks.some((f) => f.id === 'the-merge')).toBe(false);
  });

  it('measures each gap from the previous activation', () => {
    const timeline = timelineAt(NOW)!;
    expect(timeline.forks.map((f) => f.gapDays)).toEqual([209, 336, 420, 210]);
    expect(timeline.daysSinceLast).toBe(259);
  });

  it('measures the first gap from the origin', () => {
    const timeline = timelineAt(NOW)!;
    const first = timeline.gaps[0];
    expect(first).toMatchObject({ toFork: 'Shapella', days: 209 });
    expect(first.startPct).toBeCloseTo(timeline.origin.offsetPct, 5);
    expect(first.widthPct).toBeCloseTo(
      timeline.forks[0].offsetPct - timeline.origin.offsetPct,
      5,
    );
  });

  it('insets the origin so its label has room to centre on the mark', () => {
    const timeline = timelineAt(NOW)!;
    // At 0% the label would have to left-align off its mark and would then
    // collide with the first fork's.
    expect(timeline.origin.offsetPct).toBeGreaterThan(0);
    expect(timeline.forks[0].offsetPct).toBeGreaterThan(timeline.origin.offsetPct);
  });

  it('scales offsets to elapsed time, not to fork index', () => {
    const timeline = timelineAt(NOW)!;
    // The axis runs Merge -> Glamsterdam estimate (1525 days) across the span
    // between the leading and trailing margins, so Fusaka sits at its real
    // 1175-day offset along it.
    const { offsetPct: originPct } = timeline.origin;
    const span = 92 - originPct;
    expect(timeline.forks[3].offsetPct).toBeCloseTo(originPct + (1175 / 1525) * span, 5);
    // Evenly-spaced offsets would mean the axis is lying about time.
    expect(timeline.forks[1].offsetPct).not.toBeCloseTo(46, 1);
  });

  it('sizes bars by EIP payload against the biggest on the chart', () => {
    const timeline = timelineAt(NOW)!;
    const fusaka = timeline.forks.find((f) => f.name === 'Fusaka')!;
    const shapella = timeline.forks.find((f) => f.name === 'Shapella')!;
    // Glamsterdam's projected 23 is the largest payload, so it sets the scale.
    expect(fusaka.heightPct).toBeCloseTo((13 / 23) * 100, 5);
    expect(shapella.heightPct).toBeCloseTo((5 / 23) * 100, 5);
  });

  it('leaves the trailing gap open so it reads as still running', () => {
    const timeline = timelineAt(NOW)!;
    const open = timeline.gaps.filter((g) => g.open);
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ toFork: null, days: 259 });
    expect(timeline.gaps.filter((g) => !g.open).map((g) => g.days)).toEqual([209, 336, 420, 210]);
  });

  it('emits a year tick for each January inside the axis', () => {
    const timeline = timelineAt(NOW)!;
    expect(timeline.yearTicks.map((t) => t.year)).toEqual([2023, 2024, 2025, 2026]);
    expect(timeline.yearTicks[0].offsetPct).toBeGreaterThan(0);
  });

  it('returns null when there is nothing to compare', () => {
    expect(timelineAt(NOW, [UPGRADES[0]])).toBeNull();
  });
});

describe('next-fork projection', () => {
  it('takes the soonest upcoming estimate, not the furthest', () => {
    const projection = timelineAt(NOW)!.projection!;
    // Hegotá also carries an estimate; Glamsterdam comes first.
    expect(projection).toMatchObject({ id: 'glamsterdam', name: 'Glamsterdam' });
    expect(projection.date).toEqual(new Date(2026, 10, 18)); // Nov 18, 2026
    expect(projection.daysFromNow).toBe(91);
    expect(projection.overdue).toBe(false);
  });

  it('reports a longer gap that still carries a higher shipping rate', () => {
    const timeline = timelineAt(NOW)!;
    const projection = timeline.projection!;
    const fusaka = statsFor(timeline).rates.at(-1)!;

    // The point of plotting the estimate: the cycle is longer than Fusaka's and
    // longer than the median, but the payload grew faster than the gap did.
    expect(projection.gapDays).toBe(350);
    expect(projection.gapDays).toBeGreaterThan(timeline.medianGapDays);
    expect(projection.eips).toBe(23);
    expect(projection.perMonth).toBeCloseTo(2.0, 2);
    expect(projection.perMonth).toBeGreaterThan(fusaka.perMonth);
  });

  it('shares the bar scale with shipped forks', () => {
    const timeline = timelineAt(NOW)!;
    const projection = timeline.projection!;
    const fusaka = timeline.forks.at(-1)!;
    // 23 EIPs is the largest payload on the chart, so it defines full height and
    // Fusaka's 13 drops below it.
    expect(projection.heightPct).toBe(100);
    expect(fusaka.heightPct).toBeCloseTo((13 / 23) * 100, 5);
  });

  it('keeps the estimate on the axis while it is still ahead of today', () => {
    const timeline = timelineAt(NOW)!;
    expect(timeline.projection!.offsetPct).toBeCloseTo(92, 5);
    expect(timeline.nowPct).toBeLessThan(timeline.projection!.offsetPct);
  });

  it('keeps the estimate on the axis once it has slipped past today', () => {
    const late = new Date(2027, 0, 1); // past the Glamsterdam estimate
    const timeline = timelineAt(late)!;
    // Hegotá is still ahead, but the estimate that matters is the one measured
    // from the last shipped fork.
    expect(timeline.projection!.name).toBe('Glamsterdam');
    expect(timeline.projection!.overdue).toBe(true);
    expect(timeline.projection!.daysFromNow).toBeLessThan(0);
    expect(timeline.nowPct).toBeCloseTo(92, 5);
    expect(timeline.projection!.offsetPct).toBeLessThan(timeline.nowPct);
  });

  it('is null when no upcoming upgrade has an estimate', () => {
    const noEstimates = UPGRADES.map((u) => ({ ...u, projectedActivation: undefined }));
    expect(timelineAt(NOW, noEstimates)!.projection).toBeNull();
  });

  it('is null when the next upgrade has no EIP count yet', () => {
    expect(buildCadenceTimeline(NOW, UPGRADES, EIP_COUNTS, {})!.projection).toBeNull();
  });
});

describe('buildCadenceStats', () => {
  it('reports closed gaps only, excluding the open one', () => {
    const stats = statsFor(timelineAt(NOW)!);
    expect(stats.gapDays).toEqual([209, 336, 420, 210]);
  });

  it('computes per-fork shipping rate against that fork own gap', () => {
    const stats = statsFor(timelineAt(NOW)!);
    const byName = Object.fromEntries(stats.rates.map((r) => [r.name, r.perMonth]));
    expect(byName.Fusaka).toBeCloseTo(1.88, 2);
    expect(byName.Pectra).toBeCloseTo(0.87, 2);
    // The acceleration this page claims: Fusaka more than doubled the prior rate.
    expect(byName.Fusaka).toBeGreaterThan(byName.Pectra * 2);
  });
});

// The counts are literals so /cadence doesn't pull in the 630 KB EIP chunk, but
// anything Forkcast's own data covers has to keep matching it.
const eipsByStatus = (forkName: string, statuses: string[]) =>
  eipsData.filter((eip) => {
    const history = getForkRelationship(eip, forkName)?.statusHistory;
    const status = history?.[history.length - 1]?.status;
    return status != null && statuses.includes(status);
  });

const countByStatus = (forkName: string, statuses: string[]) =>
  eipsByStatus(forkName, statuses).length;

describe('EIP count tables', () => {
  it('matches the included-EIP count derived from the EIP dataset', () => {
    for (const [forkName, entry] of Object.entries(FORK_EIP_COUNTS)) {
      if (!entry.derivable) continue;
      expect(countByStatus(forkName, SHIPPED_STATUSES), `${forkName} included`).toBe(entry.eips);
    }
  });

  it('matches the scheduled-EIP count for the upcoming fork', () => {
    // This one moves as EIPs are scheduled or dropped, so it drifts far more
    // readily than the shipped counts above.
    for (const [forkName, eips] of Object.entries(NEXT_FORK_EIP_COUNT)) {
      expect(countByStatus(forkName, PLANNED_STATUSES), `${forkName} scheduled`).toBe(eips);
    }
  });

  it('excludes Informational EIPs, which are process docs rather than changes', () => {
    expect(PLANNED_STATUSES).not.toContain('Informational');
    expect(countByStatus('Glamsterdam', ['Informational'])).toBeGreaterThan(0);
  });
});

// Shapella and Dencun predate Forkcast's EIP dataset, so their EIP sets are
// literals, taken from ethereum.org and EIP-7569 respectively.
const PRE_COVERAGE_EIP_IDS: Record<string, number[]> = {
  Shapella: [3651, 3855, 3860, 4895, 6049],
  Dencun: [1153, 4788, 4844, 5656, 6780, 7044, 7045, 7514, 7516],
};

const sumSpecLines = (ids: number[]) =>
  ids.reduce(
    (total, id) => total + fs.readFileSync(`public/eips/${id}.md`, 'utf8').split('\n').length,
    0,
  );

describe('spec line tables', () => {
  it('matches the shipped line counts in the EIP spec markdown', () => {
    for (const [forkName, lines] of Object.entries(FORK_SPEC_LINES)) {
      const ids =
        PRE_COVERAGE_EIP_IDS[forkName] ?? eipsByStatus(forkName, SHIPPED_STATUSES).map((e) => e.id);
      expect(sumSpecLines(ids), forkName).toBe(lines);
    }
  });

  it('matches the scheduled line count for the upcoming fork', () => {
    for (const [forkName, lines] of Object.entries(NEXT_FORK_SPEC_LINES)) {
      const ids = eipsByStatus(forkName, PLANNED_STATUSES).map((e) => e.id);
      expect(sumSpecLines(ids), forkName).toBe(lines);
    }
  });

  it('reports spec volume absolutely and per month', () => {
    const stats = statsFor(timelineAt(NOW)!);
    const byName = Object.fromEntries(stats.spec.map((s) => [s.name, s]));
    // Fusaka shipped more EIPs than Pectra on less spec text, which is the
    // whole reason this chart exists alongside the EIP counts.
    expect(byName.Pectra.lines).toBeGreaterThan(byName.Fusaka.lines);
    // Normalised for cycle length it still comes out ahead.
    expect(byName.Fusaka.linesPerMonth).toBeGreaterThan(byName.Pectra.linesPerMonth);
    expect(byName.Fusaka.linesPerMonth).toBeCloseTo(281.6, 1);
  });

  it('projects the next fork onto both spec measures', () => {
    const stats = statsFor(timelineAt(NOW)!);
    expect(stats.specProjection).toMatchObject({ name: 'Glamsterdam', lines: 4132 });
    expect(stats.specProjection!.linesPerMonth).toBeCloseTo(359.3, 1);
    // It outsizes every shipped fork on both, so the page must not let it take
    // the highlight that marks the leading *shipped* fork.
    expect(stats.spec.every((s) => s.lines < stats.specProjection!.lines)).toBe(true);
    expect(stats.spec.every((s) => s.linesPerMonth < stats.specProjection!.linesPerMonth)).toBe(
      true,
    );
  });

  it('has no spec projection when the next fork has no scheduled specs', () => {
    const stats = buildCadenceStats(timelineAt(NOW)!, SPEC_LINES, {});
    expect(stats.specProjection).toBeNull();
  });
});
