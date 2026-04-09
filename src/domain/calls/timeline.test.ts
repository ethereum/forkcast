import { describe, expect, it } from 'vitest';
import {
  buildTimelineDateSections,
  getItemBucketDate,
  getItemCalendarDate,
  getItemDateSection,
  getTimelineItemKey,
  type DateSectionId,
  type TimelineItem
} from './timeline';

const getSectionItemKeys = (items: TimelineItem[], todayDateString: string, timeZone: string, sectionId: DateSectionId): string[] =>
  (buildTimelineDateSections(items, todayDateString, false, timeZone)
    .find((section) => section.id === sectionId)
    ?.monthGroups.flatMap((group) => group.items.map(getTimelineItemKey))) ?? [];

describe('callsIndexTimeline', () => {
  it('keeps the stored event date for display while bucketing by local day', () => {
    const item: TimelineItem = {
      type: 'event',
      date: '2026-01-07',
      datetime: '2026-01-07 01:01:11',
      title: 'BPO2 on Mainnet (14/21 blobs)',
      category: 'mainnet'
    };

    expect(getItemCalendarDate(item)).toBe('2026-01-07');
    expect(getItemBucketDate(item, 'America/New_York')).toBe('2026-01-06');
    expect(getItemDateSection(item, '2026-01-06', 'America/New_York')).toBe('today');
  });

  it('falls back to the stored date when an event datetime is invalid', () => {
    const item: TimelineItem = {
      type: 'event',
      date: '2026-01-07',
      datetime: 'not-a-date',
      title: 'Invalid timestamp event',
      category: 'mainnet'
    };

    expect(getItemBucketDate(item, 'America/New_York')).toBe('2026-01-07');
    expect(getItemDateSection(item, '2026-01-07', 'America/New_York')).toBe('today');
  });

  it('keeps same-day GitHub-backed calls in Today', () => {
    const item: TimelineItem = {
      type: 'acde',
      title: 'All Core Devs - Execution (ACDE) #222',
      date: '2026-01-06',
      startTimeUtc: '2026-01-06T14:00:00Z',
      number: '222',
      githubUrl: 'https://github.com/ethereum/pm/issues/12345',
      issueNumber: 12345
    };

    expect(getItemDateSection(item, '2026-01-06')).toBe('today');
  });

  it('keeps future-day calls in Future Dates', () => {
    const item: TimelineItem = {
      type: 'acdc',
      title: 'All Core Devs - Consensus (ACDC) #168',
      date: '2026-01-07',
      startTimeUtc: '2026-01-07T14:00:00Z',
      number: '168',
      githubUrl: 'https://github.com/ethereum/pm/issues/54321',
      issueNumber: 54321
    };

    expect(getItemDateSection(item, '2026-01-06')).toBe('future');
  });

  it('keeps a 15:00 UTC GitHub-backed call in Today for viewers in UTC+9', () => {
    const item: TimelineItem = {
      type: 'zkevm',
      title: 'L1-zkEVM breakout #02, March 11, 2026',
      date: '2026-03-11',
      startTimeUtc: '2026-03-11T15:00:00Z',
      number: '002',
      githubUrl: 'https://github.com/ethereum/pm/issues/1960',
      issueNumber: 1960
    };

    expect(getItemBucketDate(item, 'Asia/Tokyo')).toBe('2026-03-12');
    expect(getItemDateSection(item, '2026-03-12', 'Asia/Tokyo')).toBe('today');
  });

  it('shows calls in today, future, and previous sections and moves same-day calls after the local day passes', () => {
    const items: TimelineItem[] = [
      {
        type: 'acdc',
        date: '2026-01-05',
        number: '167',
        path: 'acdc/167'
      },
      {
        type: 'acde',
        title: 'All Core Devs - Execution (ACDE) #222',
        date: '2026-01-06',
        startTimeUtc: '2026-01-06T14:00:00Z',
        number: '222',
        githubUrl: 'https://github.com/ethereum/pm/issues/12345',
        issueNumber: 12345
      },
      {
        type: 'acdt',
        date: '2026-01-07',
        number: '056',
        path: 'acdt/056'
      }
    ];

    expect(getSectionItemKeys(items, '2026-01-06', 'America/New_York', 'today')).toEqual(['upcoming-acde-222']);
    expect(getSectionItemKeys(items, '2026-01-06', 'America/New_York', 'future')).toEqual(['acdt/056']);
    expect(getSectionItemKeys(items, '2026-01-06', 'America/New_York', 'previous')).toEqual(['acdc/167']);

    expect(getSectionItemKeys(items, '2026-01-07', 'America/New_York', 'previous')).toEqual([
      'upcoming-acde-222',
      'acdc/167'
    ]);
  });
});
