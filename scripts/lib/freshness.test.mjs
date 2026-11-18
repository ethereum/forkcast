import { describe, expect, it } from 'vitest';
import {
  callDates,
  checkCallSeries,
  checkLatestRun,
  checkMaxAge,
  formatSummary,
} from './freshness.mjs';

const now = Date.parse('2026-10-10T12:00:00Z');
const weekly = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'];
const biweekly = ['2026-08-13', '2026-08-27', '2026-09-10', '2026-09-24', '2026-10-08'];

describe('callDates', () => {
  it('keeps only call directories, sorted by date', () => {
    expect(callDates(['plan', '2026-10-08_247', '2026-09-24_246', 'notes.json'])).toEqual([
      '2026-09-24',
      '2026-10-08',
    ]);
  });
});

describe('checkCallSeries', () => {
  it('passes a weekly series that is on schedule', () => {
    const result = checkCallSeries('acdt', weekly, now);
    expect(result.ok).toBe(true);
    expect(result.detail).toBe('latest 2026-10-05 (5d ago); usual gap 7d, limit 17d');
  });

  it('derives a longer limit for a biweekly series', () => {
    expect(checkCallSeries('acde', biweekly, now).detail).toContain('usual gap 14d, limit 31d');
  });

  it('tolerates one skipped call but flags a series that has stopped', () => {
    expect(checkCallSeries('acdt', weekly, Date.parse('2026-10-20T12:00:00Z')).ok).toBe(true);
    expect(checkCallSeries('acdt', weekly, Date.parse('2026-10-23T12:00:00Z')).ok).toBe(false);
  });

  it('uses only recent gaps, so an old cadence change does not skew the limit', () => {
    const dates = ['2025-01-01', '2025-06-01', ...weekly];
    expect(checkCallSeries('acdt', dates, now, { lookback: 4 }).detail).toContain('usual gap 7d');
  });

  it('fails when there is too little data to infer a cadence', () => {
    expect(checkCallSeries('new', ['2026-10-01'], now).ok).toBe(false);
  });
});

describe('checkMaxAge', () => {
  it('compares a timestamp against the limit', () => {
    expect(checkMaxAge('plan', '2026-10-05', now, 10).ok).toBe(true);
    expect(checkMaxAge('plan', '2026-09-29', now, 10).ok).toBe(false);
    expect(checkMaxAge('run', '2026-10-09T06:00:00Z', now, 1).ok).toBe(true);
  });

  it('fails when there is no timestamp', () => {
    expect(checkMaxAge('run', undefined, now, 1)).toEqual({
      name: 'run',
      ok: false,
      detail: 'no timestamp found',
    });
  });
});

describe('checkLatestRun', () => {
  const run = (conclusion) => ({ conclusion, updated_at: 't', html_url: 'u' });

  it('skips cancelled and skipped runs', () => {
    expect(checkLatestRun('deploy', [run('cancelled'), run('skipped'), run('success')]).ok).toBe(true);
    expect(checkLatestRun('deploy', [run('cancelled'), run('failure'), run('success')]).ok).toBe(false);
  });

  it('fails when there are no decisive runs', () => {
    expect(checkLatestRun('deploy', [run('cancelled')]).ok).toBe(false);
  });
});

describe('formatSummary', () => {
  it('headlines the number of problems', () => {
    const summary = formatSummary([
      { name: 'a', ok: true, detail: 'fine' },
      { name: 'b', ok: false, detail: 'old' },
    ]);
    expect(summary).toContain('## Data freshness: 1 problem(s)');
    expect(summary).toContain('| b | **FAIL** | old |');
  });
});
