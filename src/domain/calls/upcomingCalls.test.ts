import { describe, expect, it } from 'vitest';
import {
  isUpcomingCallStillRelevant,
  resolveUpcomingCallSchedule,
  resolveUpcomingCallSeries,
  resolveUpcomingCallType
} from './upcomingCalls';

describe('resolveUpcomingCallSchedule', () => {
  it('parses date and time from the body UTC Date & Time section', () => {
    const body = `### UTC Date & Time

[March 11, 2026, 15:00 UTC](https://savvytime.com/converter/utc/mar-11-2026/3pm)`;

    expect(resolveUpcomingCallSchedule(body)).toEqual({
      date: '2026-03-11',
      startTimeUtc: '2026-03-11T15:00:00Z'
    });
  });

  it('requires the body to be present', () => {
    expect(resolveUpcomingCallSchedule()).toBeUndefined();
  });

  it('requires the UTC Date & Time section in the body', () => {
    const legacyBody = `## E. Schedule / Next Steps

- **Next call**: February 18, 2026 (Wednesday)`;

    expect(resolveUpcomingCallSchedule(legacyBody)).toBeUndefined();
    expect(resolveUpcomingCallSchedule('Agenda only')).toBeUndefined();
  });

  it('tracks call-series time changes from the body', () => {
    const body = `### UTC Date & Time

[April 14, 2026, 12:00 UTC](https://savvytime.com/converter/utc/apr-14-2026/12pm)

**Bi-weekly, Tuesdays @ 12:00 UTC** [NEW TIME]`;

    expect(resolveUpcomingCallSchedule(body)).toEqual({
      date: '2026-04-14',
      startTimeUtc: '2026-04-14T12:00:00Z'
    });
  });

  it('uses the date from the body section (not the title)', () => {
    const body = `### UTC Date & Time

[March 5, 2026, 14:00 UTC](https://savvytime.com/converter/utc/mar-5-2026/2pm)`;

    expect(resolveUpcomingCallSchedule(body)).toEqual({
      date: '2026-03-05',
      startTimeUtc: '2026-03-05T14:00:00Z'
    });
  });

  it('rejects an unparseable date in the section', () => {
    const body = `### UTC Date & Time

[Smarch 5, 2026, 14:00 UTC](https://example.com)`;

    expect(resolveUpcomingCallSchedule(body)).toBeUndefined();
  });
});

describe('resolveUpcomingCallSeries', () => {
  it('normalizes the call series from the body', () => {
    const body = `### Call Series

All Wallet Devs`;

    expect(resolveUpcomingCallSeries(body)).toBe('all wallet devs');
  });
});

describe('resolveUpcomingCallType', () => {
  it('prefers the body call series for PQ Interop issues', () => {
    const body = `### Call Series

PQ Interop`;

    expect(
      resolveUpcomingCallType('Post-Quantum (PQ) Interop #34, April 8, 2026', body)
    ).toBe('pqi');
  });

  it('maps All Wallet Devs from the body call series', () => {
    const body = `### Call Series

All Wallet Devs`;

    expect(
      resolveUpcomingCallType('AllWalletDevs #39, April 15, 2026', body)
    ).toBe('awd');
  });

  it('falls back to the title when the body series is missing', () => {
    expect(resolveUpcomingCallType('FOCIL Breakout #32, April 07, 2026')).toBe('focil');
  });
});

describe('isUpcomingCallStillRelevant', () => {
  it('keeps same-local-day calls visible for viewers west of UTC', () => {
    expect(
      isUpcomingCallStillRelevant({
        date: '2026-01-06',
        startTimeUtc: '2026-01-06T14:00:00Z',
      }, new Date('2026-01-07T01:30:00Z'), 'America/New_York')
    ).toBe(true);
    expect(
      isUpcomingCallStillRelevant({
        date: '2026-01-06',
        startTimeUtc: '2026-01-06T14:00:00Z',
      }, new Date('2026-01-07T01:30:00Z'), 'UTC')
    ).toBe(false);
  });
});
