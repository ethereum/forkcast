import { describe, it, expect } from 'vitest';
import { acdCallsBetween } from './acdCalls';

const d = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

describe('acdCallsBetween', () => {
  it('places the calls that actually happened', () => {
    // ACDC #186, ACDE #245, ACDC #187.
    expect(acdCallsBetween(d('2026-09-03'), d('2026-09-17')).map((c) => [iso(c.date), c.series])).toEqual([
      ['2026-09-03', 'ACDC'],
      ['2026-09-10', 'ACDE'],
      ['2026-09-17', 'ACDC'],
    ]);
  });

  it('alternates backwards through the anchor too', () => {
    // ACDE #244 and ACDC #185, both on disk.
    expect(acdCallsBetween(d('2026-08-20'), d('2026-08-27')).map((c) => [iso(c.date), c.series])).toEqual([
      ['2026-08-20', 'ACDC'],
      ['2026-08-27', 'ACDE'],
    ]);
  });

  it('lands on a Thursday every time, across a year of daylight-saving changes', () => {
    const calls = acdCallsBetween(d('2026-01-01'), d('2027-12-31'));
    expect(calls.length).toBeGreaterThan(100);
    for (const call of calls) expect(call.date.getDay()).toBe(4);
  });

  it('includes a call landing on either endpoint', () => {
    expect(acdCallsBetween(d('2026-09-10'), d('2026-09-10')).map((c) => c.series)).toEqual(['ACDE']);
  });

  it('excludes the Thursday before a range that opens mid-week', () => {
    expect(acdCallsBetween(d('2026-09-11'), d('2026-09-16'))).toEqual([]);
  });

  it('is empty when the range is inverted', () => {
    expect(acdCallsBetween(d('2026-12-01'), d('2026-01-01'))).toEqual([]);
  });

  it('never repeats a series on consecutive weeks', () => {
    const calls = acdCallsBetween(d('2025-01-01'), d('2027-12-31'));
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i].series).not.toBe(calls[i - 1].series);
    }
  });
});
