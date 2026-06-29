import { describe, expect, it } from 'vitest';
import type { ForkRelationship } from '../../types/eip';
import { buildEipTimelineForkGroup } from './eipTimeline';

type StatusEntry = ForkRelationship['statusHistory'][number];
type DiscussionEntry = NonNullable<ForkRelationship['discussionHistory']>[number];

const status = (
  statusValue: StatusEntry['status'],
  date: string | null,
  call: StatusEntry['call'] = null,
  timestamp?: number,
): StatusEntry => ({
  status: statusValue,
  date,
  call,
  timestamp,
});

const discussion = (
  date: string,
  values: Omit<DiscussionEntry, 'date'>,
): DiscussionEntry => ({
  date,
  ...values,
});

const fork = (overrides: Partial<ForkRelationship>): ForkRelationship => ({
  forkName: 'Glamsterdam',
  statusHistory: [],
  ...overrides,
});

describe('buildEipTimelineForkGroup', () => {
  it('dedupes a discussion with the same call and date as a status item', () => {
    const group = buildEipTimelineForkGroup(fork({
      statusHistory: [status('Proposed', '2026-05-21', 'acde/237', 4148)],
      discussionHistory: [
        discussion('2026-05-21', { call: 'acde/237', timestamp: 3352 }),
      ],
    }));

    expect(group.items).toEqual([
      {
        type: 'status',
        status: 'Proposed',
        date: '2026-05-21',
        call: 'acde/237',
        timestamp: 4148,
        isCurrentStatus: true,
      },
    ]);
  });

  it('keeps independent discussion references without inventing status transitions', () => {
    const group = buildEipTimelineForkGroup(fork({
      statusHistory: [status('Considered', '2026-06-18', 'acde/239')],
      discussionHistory: [
        discussion('2026-06-11', { call: 'acdc/180' }),
        discussion('2026-06-15', { call: 'acdt/83' }),
      ],
    }));

    expect(group.items).toMatchObject([
      { type: 'status', status: 'Considered', date: '2026-06-18', isCurrentStatus: true },
      { type: 'event', kind: 'discussion', date: '2026-06-15', call: 'acdt/83' },
      { type: 'event', kind: 'discussion', date: '2026-06-11', call: 'acdc/180' },
    ]);
  });

  it('preserves headliner lifecycle context as standalone timeline items', () => {
    const group = buildEipTimelineForkGroup(
      fork({
        statusHistory: [status('Scheduled', null)],
        headlinerHistory: [
          { type: 'proposed', link: 'https://example.com/forum', date: '2025-05-22' },
          { type: 'presented', call: 'acdc/158', date: '2025-05-29' },
        ],
      }),
      {
        eipId: 7732,
        headlinerSelection: {
          status: 'finalized',
          selected: { CL: 7732 },
        },
      },
    );

    expect(group.isHeadliner).toBe(true);
    expect(group.items).toEqual([
      {
        type: 'status',
        status: 'Scheduled',
        date: null,
        call: null,
        timestamp: undefined,
        isCurrentStatus: true,
      },
      {
        type: 'event',
        kind: 'headlinerPresented',
        date: '2025-05-29',
        call: 'acdc/158',
        link: undefined,
        timestamp: undefined,
      },
      {
        type: 'event',
        kind: 'headlinerProposed',
        date: '2025-05-22',
        call: undefined,
        link: 'https://example.com/forum',
        timestamp: undefined,
      },
    ]);
  });

  it('dedupes a headliner presentation with the same call and date as a status item', () => {
    const group = buildEipTimelineForkGroup(fork({
      statusHistory: [status('Proposed', '2026-02-12', 'acde/230')],
      headlinerHistory: [
        { type: 'proposed', link: 'https://example.com/forum', date: '2026-02-05' },
        { type: 'presented', call: 'acde/230', date: '2026-02-12' },
      ],
    }));

    expect(group.items).toMatchObject([
      { type: 'status', status: 'Proposed', date: '2026-02-12', call: 'acde/230' },
      { type: 'event', kind: 'headlinerProposed', date: '2026-02-05' },
    ]);
  });

  it('keeps the champion-inferred Proposed item when no presentation exists', () => {
    const group = buildEipTimelineForkGroup(fork({
      statusHistory: [status('Considered', '2026-01-01')],
      champions: [{ name: 'Ada' }],
    }));

    expect(group.items.map((item) =>
      item.type === 'status' ? `${item.status}:${item.date ?? 'undated'}` : item.kind
    )).toEqual(['Considered:2026-01-01', 'Proposed:undated']);
  });
});
