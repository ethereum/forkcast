import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '../../data/events';
import type { FeedConfig } from '../../data/feed';
import type { EipStageChange } from '../eips/stageChanges';
import {
  buildFeedItems,
  buildRssXml,
  escapeXml,
  stageChangeToFeedItem,
  timelineEventToFeedItem,
  toRssDate,
} from './feed';

const makeStageChange = (overrides: Partial<EipStageChange> = {}): EipStageChange => ({
  id: 7732,
  title: 'Enshrined Proposer-Builder Separation',
  prefix: 'EIP',
  status: 'Draft',
  description: 'Separates block proposal from block building.',
  lastStageChange: '2026-01-08',
  lastStageChangeFork: 'Glamsterdam',
  currentStage: 'Scheduled for Inclusion',
  url: '/eips/7732',
  ...overrides,
});

const makeEvent = (overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
  type: 'event',
  date: '2025-12-03',
  title: 'Fusaka Live on Mainnet',
  category: 'mainnet',
  ...overrides,
});

const config = (overrides: Partial<FeedConfig> = {}): FeedConfig => ({
  eipStageChanges: { enabled: true },
  networkActivations: { enabled: true },
  ...overrides,
});

describe('stageChangeToFeedItem', () => {
  it('builds a deterministic guid from eip, stage, and date', () => {
    const item = stageChangeToFeedItem(makeStageChange(), 'https://forkcast.org');
    // Same data must always produce the same guid, so the multiple daily
    // bot-triggered rebuilds never re-date existing items.
    expect(item.guid).toBe('eip-7732-scheduled-for-inclusion-2026-01-08');
    expect(item.link).toBe('https://forkcast.org/eips/7732');
    expect(item.title).toBe(
      'EIP-7732 (Enshrined Proposer-Builder Separation) is now Scheduled for Inclusion for Glamsterdam',
    );
  });

  it('titles Networking and Informational as forms of scheduling, without changing the guid', () => {
    const item = stageChangeToFeedItem(
      makeStageChange({ id: 8261, title: 'Gas Limit Schedule', currentStage: 'Informational' }),
      'https://forkcast.org',
    );
    expect(item.title).toBe(
      'EIP-8261 (Gas Limit Schedule) is now Scheduled (Informational) for Glamsterdam',
    );
    expect(item.guid).toBe('eip-8261-informational-2026-01-08');
  });

  it('falls back to the EIP status when no current stage exists', () => {
    const item = stageChangeToFeedItem(
      makeStageChange({ currentStage: null, lastStageChangeFork: null }),
      'https://forkcast.org',
    );
    expect(item.title).toBe('EIP-7732 (Enshrined Proposer-Builder Separation) is now Draft');
    expect(item.guid).toBe('eip-7732-draft-2026-01-08');
  });
});

describe('timelineEventToFeedItem', () => {
  it('publishes the event title verbatim, linked to the network it happened on', () => {
    const item = timelineEventToFeedItem(makeEvent({ networkId: 'mainnet' }), 'https://forkcast.org');
    expect(item.title).toBe('Fusaka Live on Mainnet');
    expect(item.link).toBe('https://forkcast.org/networks/mainnet');
    expect(item.guid).toBe('event-fusaka-live-on-mainnet-2025-12-03');
    expect(item.description).toBeUndefined();
  });

  it('falls back to the network index for a network with no page', () => {
    // Holešky and the Fusaka devnets are gone from the route set.
    const item = timelineEventToFeedItem(
      makeEvent({ title: 'Fusaka Live on Holešky Testnet', networkId: undefined }),
      'https://forkcast.org',
    );
    expect(item.link).toBe('https://forkcast.org/networks');
  });

  it('slugifies a guid out of titles carrying punctuation and emoji', () => {
    const item = timelineEventToFeedItem(
      makeEvent({ title: 'Ethereum Turns 10! 🎉', date: '2025-07-30', category: 'milestone' }),
      'https://forkcast.org',
    );
    expect(item.guid).toBe('event-ethereum-turns-10-2025-07-30');
  });
});

describe('buildFeedItems', () => {
  const sources = {
    stageChanges: [makeStageChange()],
    events: [makeEvent()],
  };

  it('emits nothing for a type whose switch is off', () => {
    const items = buildFeedItems(
      config({ eipStageChanges: { enabled: false }, networkActivations: { enabled: false } }),
      sources,
      'https://forkcast.org',
    );
    expect(items).toEqual([]);
  });

  it('emits only stage changes when network activations are off', () => {
    const items = buildFeedItems(
      config({ networkActivations: { enabled: false } }),
      sources,
      'https://forkcast.org',
    );
    expect(items.map((item) => item.guid)).toEqual([
      'eip-7732-scheduled-for-inclusion-2026-01-08',
    ]);
  });

  it('skips milestones and announcements, which are not about a network', () => {
    const items = buildFeedItems(
      config(),
      {
        stageChanges: [],
        events: [
          makeEvent(),
          makeEvent({ title: 'Ethereum Turns 10! 🎉', date: '2025-07-30', category: 'milestone' }),
          makeEvent({ title: 'Something was announced', date: '2025-07-31', category: 'announcement' }),
        ],
      },
      'https://forkcast.org',
    );
    expect(items.map((item) => item.title)).toEqual(['Fusaka Live on Mainnet']);
  });

  it('interleaves both types newest first', () => {
    const items = buildFeedItems(
      config(),
      {
        stageChanges: [makeStageChange(), makeStageChange({ id: 7702, lastStageChange: '2025-11-01' })],
        events: [makeEvent(), makeEvent({ title: 'Fusaka Live on Hoodi Testnet', date: '2026-03-01' })],
      },
      'https://forkcast.org',
    );
    expect(items.map((item) => item.date)).toEqual([
      '2026-03-01',
      '2026-01-08',
      '2025-12-03',
      '2025-11-01',
    ]);
  });
});

describe('buildRssXml', () => {
  const channel = { title: 'Forkcast', link: 'https://forkcast.org', description: 'Updates & news' };

  it('escapes reserved characters in titles and descriptions', () => {
    const xml = buildRssXml(channel, [
      {
        title: 'EIP-1 <Draft> & more',
        link: 'https://forkcast.org/eips/1',
        guid: 'eip-1-draft-2026-01-01',
        date: '2026-01-01',
        description: 'a < b & c',
      },
    ]);
    expect(xml).toContain('<title>EIP-1 &lt;Draft&gt; &amp; more</title>');
    expect(xml).toContain('<description>a &lt; b &amp; c</description>');
    expect(xml).toContain('<description>Updates &amp; news</description>');
  });

  it('marks guids as non-permalink and formats pubDate as RFC 822', () => {
    const xml = buildRssXml(channel, [
      { title: 't', link: 'https://forkcast.org/x', guid: 'g-1', date: '2026-01-08' },
    ]);
    expect(xml).toContain('<guid isPermaLink="false">g-1</guid>');
    expect(xml).toContain(`<pubDate>${toRssDate('2026-01-08')}</pubDate>`);
    expect(toRssDate('2026-01-08')).toBe('Thu, 08 Jan 2026 12:00:00 GMT');
    // No description element for an item without one.
    expect(xml.match(/<description>/g)).toHaveLength(1);
  });

  it('starts with the XML declaration and closes every open element', () => {
    const xml = buildRssXml(channel, []);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('</channel>');
    expect(xml.trimEnd().endsWith('</rss>')).toBe(true);
  });
});

describe('escapeXml', () => {
  it('escapes all five reserved characters', () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
  });
});
