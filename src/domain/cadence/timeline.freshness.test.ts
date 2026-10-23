import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { eipsData } from '../../data/eips';
import { getForkRelationship } from '../../utils/eip';
import {
  FORK_EIP_COUNTS,
  FORK_SPEC_LINES,
  NEXT_FORK_EIP_COUNT,
  NEXT_FORK_SPEC_LINES,
  PLANNED_STATUSES,
  SHIPPED_STATUSES,
} from './timeline';

/**
 * Whether /cadence's hardcoded payload figures still match the data they describe.
 *
 * The counts are literals so the page doesn't pull in the 630 KB EIP chunk, but anything
 * Forkcast's own data covers has to keep matching it. Held apart from the unit suite
 * because the upcoming-fork figures move on every SFI and DFI, and the deploy workflow
 * gates on `test:unit` — a routine stage change must not stop the site rebuilding. A
 * failure here means the literals in timeline.ts need updating to the numbers printed
 * below, along with the assertions in timeline.test.ts that quote them.
 */

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
});
