import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { formatISODate, parseDate } from './date';
import { formatDateInTimeZone } from './localDate';

// Run west of UTC, where `new Date('YYYY-MM-DD')` (parsed as UTC midnight)
// falls on the previous local day. Node applies TZ changes at runtime.
describe('date helpers west of UTC', () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'America/New_York';
  });

  afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it('runs in a timezone where naive date-only parsing shifts the day', () => {
    expect(new Date('2025-03-31').getDate()).toBe(30);
  });

  it('round-trips YYYY-MM-DD strings without shifting the day', () => {
    for (const date of ['2025-03-31', '2025-01-01', '2024-02-29', '2025-11-02']) {
      expect(formatISODate(parseDate(date))).toBe(date);
    }
  });

  it('formats the local calendar day when no time zone is given', () => {
    expect(formatDateInTimeZone(new Date('2026-01-07T01:30:00Z'))).toBe('2026-01-06');
  });
});
