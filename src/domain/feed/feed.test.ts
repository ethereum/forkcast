import { describe, expect, it } from 'vitest';
import type { Call } from '../../data/calls';
import type { FeedConfig } from '../../data/feed';
import type { NetworkUpgrade } from '../../data/upgrades';
import type { EipStageChange } from '../eips/stageChanges';
import {
  buildFeedItems,
  buildRssXml,
  callDecisionToFeedItem,
  callSummaryToFeedItem,
  escapeXml,
  stageChangeToFeedItem,
  toRssDate,
  type CallDecisionInput,
  type CallSummaryInput,
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

const makeCall = (overrides: Partial<Call> = {}): Call => ({
  type: 'acdc',
  date: '2026-01-08',
  number: '172',
  path: 'acdc/172',
  ...overrides,
});

const makeCallSummary = (overrides: Partial<CallSummaryInput> = {}): CallSummaryInput => ({
  call: makeCall(),
  displayName: 'AllCoreDevs - Consensus',
  tldrMeeting: 'ACDC #172 - January 8, 2026',
  highlights: ['BPO2 live Jan 7th', 'Glamsterdam scoping closed'],
  ...overrides,
});

const makeCallDecision = (overrides: Partial<CallDecisionInput> = {}): CallDecisionInput => ({
  call: makeCall(),
  displayName: 'AllCoreDevs - Consensus',
  text: "EIP-8359 (Beacon Block Reporting) PFI'd for Hegota",
  index: 4,
  ...overrides,
});

const makeUpgrade = (overrides: Partial<NetworkUpgrade> = {}): NetworkUpgrade => ({
  id: 'glamsterdam',
  path: '/upgrade/glamsterdam',
  name: 'Glamsterdam Upgrade',
  description: 'A network upgrade.',
  tagline: 'ePBS and more.',
  status: 'Upcoming',
  disabled: false,
  ...overrides,
});

const config = (overrides: Partial<FeedConfig> = {}): FeedConfig => ({
  eipStageChanges: { enabled: true, count: 20 },
  callSummaries: { enabled: true, reviewedCalls: ['acdc/172'] },
  callDecisions: { enabled: true },
  upgradeStatusChanges: { enabled: true, entries: [] },
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

  it('falls back to the EIP status when no current stage exists', () => {
    const item = stageChangeToFeedItem(
      makeStageChange({ currentStage: null, lastStageChangeFork: null }),
      'https://forkcast.org',
    );
    expect(item.title).toBe('EIP-7732 (Enshrined Proposer-Builder Separation) is now Draft');
    expect(item.guid).toBe('eip-7732-draft-2026-01-08');
  });
});

describe('callSummaryToFeedItem', () => {
  it('uses the tldr meeting label and joins highlights into the description', () => {
    const item = callSummaryToFeedItem(makeCallSummary(), 'https://forkcast.org');
    expect(item.title).toBe('Call summary: ACDC #172 - January 8, 2026');
    expect(item.guid).toBe('call-acdc-172-2026-01-08');
    expect(item.description).toBe('BPO2 live Jan 7th. Glamsterdam scoping closed');
  });

  it('falls back to display name and omits the description without highlights', () => {
    const item = callSummaryToFeedItem(
      makeCallSummary({ tldrMeeting: undefined, highlights: [] }),
      'https://forkcast.org',
    );
    expect(item.title).toBe('Call summary: AllCoreDevs - Consensus #172 - 2026-01-08');
    expect(item.description).toBeUndefined();
  });
});

describe('callDecisionToFeedItem', () => {
  it('titles the item with the decision text and attributes the call in the description', () => {
    const item = callDecisionToFeedItem(makeCallDecision(), 'https://forkcast.org');
    expect(item.title).toBe("Decision: EIP-8359 (Beacon Block Reporting) PFI'd for Hegota");
    expect(item.link).toBe('https://forkcast.org/calls/acdc/172');
    // The entry's file position disambiguates decisions sharing a timestamp.
    expect(item.guid).toBe('decision-acdc-172-2026-01-08-4');
    expect(item.description).toBe('From AllCoreDevs - Consensus #172 on 2026-01-08.');
  });

  it('appends the context field to the description when present', () => {
    const item = callDecisionToFeedItem(
      makeCallDecision({ context: 'Community consensus is a prerequisite.' }),
      'https://forkcast.org',
    );
    expect(item.description).toBe(
      'From AllCoreDevs - Consensus #172 on 2026-01-08. Community consensus is a prerequisite.',
    );
  });
});

describe('buildFeedItems', () => {
  const sources = {
    stageChanges: [makeStageChange()],
    callSummaries: [makeCallSummary()],
    callDecisions: [makeCallDecision()],
    upgrades: [makeUpgrade()],
  };

  it('emits nothing for a type whose switch is off', () => {
    const items = buildFeedItems(
      config({
        eipStageChanges: { enabled: false, count: 20 },
        callSummaries: { enabled: false, reviewedCalls: ['acdc/172'] },
        callDecisions: { enabled: false },
        upgradeStatusChanges: { enabled: false, entries: [] },
      }),
      sources,
      'https://forkcast.org',
    );
    expect(items).toEqual([]);
  });

  it('only emits call summaries whose path a human has marked reviewed', () => {
    const unreviewed = makeCallSummary({ call: makeCall({ number: '173', path: 'acdc/173', date: '2026-01-22' }) });
    const items = buildFeedItems(
      config({
        eipStageChanges: { enabled: false, count: 20 },
        callSummaries: { enabled: true, reviewedCalls: ['acdc/172'] },
        callDecisions: { enabled: false },
      }),
      { ...sources, callSummaries: [makeCallSummary(), unreviewed] },
      'https://forkcast.org',
    );
    expect(items.map((item) => item.guid)).toEqual(['call-acdc-172-2026-01-08']);
  });

  it('gates call decisions on the same reviewedCalls list as summaries', () => {
    const unreviewed = makeCallDecision({
      call: makeCall({ number: '173', path: 'acdc/173', date: '2026-01-22' }),
      index: 0,
    });
    const items = buildFeedItems(
      config({
        eipStageChanges: { enabled: false, count: 20 },
        callSummaries: { enabled: false, reviewedCalls: ['acdc/172'] },
      }),
      { ...sources, callDecisions: [makeCallDecision(), unreviewed] },
      'https://forkcast.org',
    );
    expect(items.map((item) => item.guid)).toEqual(['decision-acdc-172-2026-01-08-4']);
  });

  it('builds upgrade items from hand-edited entries and sorts everything newest first', () => {
    const items = buildFeedItems(
      config({
        upgradeStatusChanges: {
          enabled: true,
          entries: [{ upgradeId: 'glamsterdam', status: 'Upcoming', date: '2026-02-01' }],
        },
      }),
      sources,
      'https://forkcast.org',
    );
    expect(items.map((item) => item.guid)).toEqual([
      'upgrade-glamsterdam-upcoming-2026-02-01',
      'call-acdc-172-2026-01-08',
      'decision-acdc-172-2026-01-08-4',
      'eip-7732-scheduled-for-inclusion-2026-01-08',
    ]);
    expect(items[0].title).toBe('Glamsterdam Upgrade is now Upcoming');
    expect(items[0].link).toBe('https://forkcast.org/upgrade/glamsterdam');
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
