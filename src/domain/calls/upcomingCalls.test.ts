import { describe, expect, it } from 'vitest';
import { isUpcomingCallStillRelevant, hasUpcomingWatchPage } from './upcomingCalls';
import {
  resolveUpcomingCallSchedule,
  resolveUpcomingCallSeries,
  resolveUpcomingCallType,
  resolveUpcomingCallNumber,
  parseUpcomingCallFromIssue,
  extractYouTubeUrl
} from './upcomingCallParsing';

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

describe('resolveUpcomingCallNumber', () => {
  it('zero-pads the first #number in the title to match the emitted call path', () => {
    expect(resolveUpcomingCallNumber('FOCIL Breakout #22, October 21, 2025')).toBe('022');
    expect(resolveUpcomingCallNumber('All Core Devs - Consensus (ACDC) #166, October 2, 2025')).toBe('166');
  });

  it('returns undefined when the title has no #number', () => {
    expect(resolveUpcomingCallNumber('FOCIL Breakout, October 21, 2025')).toBeUndefined();
  });
});

describe('extractYouTubeUrl', () => {
  it('extracts the watch URL from the ACDbot YouTube Live comment', () => {
    const comments = [
      { body: 'Some unrelated comment' },
      { body: '✅ **YouTube Live**: [Watch Live](https://www.youtube.com/watch?v=abc123)' },
    ];
    expect(extractYouTubeUrl(comments)).toBe('https://www.youtube.com/watch?v=abc123');
  });

  it('returns undefined when no comment carries a YouTube link', () => {
    expect(extractYouTubeUrl([{ body: 'just chatting' }, {}])).toBeUndefined();
    expect(extractYouTubeUrl([])).toBeUndefined();
  });
});

describe('hasUpcomingWatchPage', () => {
  // Shared predicate that keeps getStaticPaths() and the call index's internal-vs-external
  // link decision in agreement: an internal /calls/{type}/{number} page exists only when
  // there's a video to watch.
  it('is true only when the call has a video', () => {
    expect(hasUpcomingWatchPage({ youtubeUrl: 'https://youtu.be/x' })).toBe(true);
    expect(hasUpcomingWatchPage({ youtubeUrl: undefined })).toBe(false);
  });
});

describe('parseUpcomingCallFromIssue', () => {
  const scheduledBody = `### Call Series

All Core Devs - Consensus

### UTC Date & Time

[October 2, 2025, 14:00 UTC](https://savvytime.com/converter/utc/oct-2-2025/2pm)`;

  it('parses a scheduled issue into an upcoming call', () => {
    expect(
      parseUpcomingCallFromIssue({
        title: 'All Core Devs - Consensus (ACDC) #166, October 2, 2025',
        html_url: 'https://github.com/ethereum/pm/issues/1700',
        number: 1700,
        body: scheduledBody,
      })
    ).toEqual({
      type: 'acdc',
      title: 'All Core Devs - Consensus (ACDC) #166, October 2, 2025',
      date: '2025-10-02',
      startTimeUtc: '2025-10-02T14:00:00Z',
      number: '166',
      githubUrl: 'https://github.com/ethereum/pm/issues/1700',
      issueNumber: 1700,
    });
  });

  it('returns null without a UTC Date & Time section', () => {
    expect(
      parseUpcomingCallFromIssue({
        title: 'All Core Devs - Consensus (ACDC) #166, October 2, 2025',
        html_url: 'https://github.com/ethereum/pm/issues/1700',
        number: 1700,
        body: 'Agenda only, no schedule yet.',
      })
    ).toBeNull();
  });

  it('returns null when neither the body series nor the title yields a known type', () => {
    expect(
      parseUpcomingCallFromIssue({
        title: 'Random community sync #5',
        html_url: 'https://github.com/ethereum/pm/issues/9001',
        number: 9001,
        body: `### UTC Date & Time

[October 2, 2025, 14:00 UTC](https://example.com)`,
      })
    ).toBeNull();
  });

  it('returns null when the title has no call number', () => {
    expect(
      parseUpcomingCallFromIssue({
        title: 'All Core Devs - Consensus (ACDC), October 2, 2025',
        html_url: 'https://github.com/ethereum/pm/issues/1700',
        number: 1700,
        body: `### UTC Date & Time

[October 2, 2025, 14:00 UTC](https://example.com)`,
      })
    ).toBeNull();
  });
});
