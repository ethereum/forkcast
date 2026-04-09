import { describe, expect, it } from 'vitest';
import {
  formatDateInTimeZone,
  getTodayDateString,
  getUtcDateString,
  isOnOrAfterLocalToday,
  isOnOrAfterUtcToday
} from './localDate';

describe('localDate', () => {
  it('formats time-zone dates as stable ISO keys', () => {
    expect(formatDateInTimeZone(new Date('2026-01-07T01:30:00Z'), 'America/New_York')).toBe('2026-01-06');
    expect(formatDateInTimeZone(new Date('2026-03-11T15:00:00Z'), 'Asia/Tokyo')).toBe('2026-03-12');
  });

  it('formats today from the viewer local day instead of UTC', () => {
    const now = new Date('2026-01-07T01:30:00Z');

    expect(getTodayDateString(now, 'America/New_York')).toBe('2026-01-06');
    expect(getTodayDateString(now, 'Pacific/Auckland')).toBe('2026-01-07');
  });

  it('keeps UTC-day checks separate from local-day checks', () => {
    const now = new Date('2026-01-07T01:30:00Z');

    expect(getUtcDateString(now)).toBe('2026-01-07');
    expect(isOnOrAfterUtcToday('2026-01-06', now)).toBe(false);
    expect(isOnOrAfterUtcToday('2026-01-07', now)).toBe(true);
  });

  it('keeps same-day calls available for viewers west of UTC', () => {
    const now = new Date('2026-01-07T01:30:00Z');

    expect(isOnOrAfterLocalToday('2026-01-06', now, 'America/New_York')).toBe(true);
    expect(isOnOrAfterLocalToday('2026-01-06', now, 'UTC')).toBe(false);
  });
});
