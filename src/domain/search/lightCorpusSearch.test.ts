import { describe, expect, it } from 'vitest';
import { EMPTY_SUMMARY_FILTERS, buildSummaryHref, searchLightCorpus } from './lightCorpusSearch';
import type { LightEntry } from './types';

const entry = (overrides: Partial<LightEntry>): LightEntry => {
  const text = overrides.text ?? 'devnet-8 to run discv5-only (no discv4)';
  return {
    kind: 'decision',
    timestamp: '00:16:55',
    callType: 'acdt',
    callDate: '2026-07-20',
    callNumber: '088',
    callPath: 'acdt/088',
    ...overrides,
    text,
    normalized: text.toLowerCase(),
  };
};

describe('buildSummaryHref', () => {
  it('carries search, timestamp, type and text so the call page highlights the row', () => {
    const href = buildSummaryHref(entry({}), 'discv5');
    const params = new URLSearchParams(href.split('?')[1]);

    expect(href.split('?')[0]).toBe('/calls/acdt/088');
    expect(params.get('search')).toBe('discv5');
    expect(params.get('timestamp')).toBe('00:16:55');
    expect(params.get('type')).toBe('agenda');
    expect(params.get('text')).toBe('devnet-8 to run discv5-only (no discv4)');
  });

  it('uses type=action for action items', () => {
    const href = buildSummaryHref(entry({ kind: 'action', text: 'Align JSON RPC methods' }), 'rpc');
    expect(new URLSearchParams(href.split('?')[1]).get('type')).toBe('action');
  });

  it('sends notes to the notes tab instead of the transcript deep link', () => {
    const href = buildSummaryHref(entry({ kind: 'note', timestamp: '00:05:38' }), 'discv5');
    expect(href).toBe('/calls/acdt/088?summary=notes&timestamp=00%3A05%3A38');
  });

  it('appends the breakout tab so a CL summary lands on the CL view', () => {
    expect(buildSummaryHref(entry({ breakout: 'cl' }), 'discv5')).toContain('&breakout=cl');
    expect(buildSummaryHref(entry({ kind: 'note', breakout: 'cl' }), 'discv5')).toContain('&breakout=cl');
  });

  it('url-encodes text that contains query-string characters', () => {
    const href = buildSummaryHref(entry({ text: 'a&b=c #1' }), 'a b');
    expect(href).toContain('&text=a%26b%3Dc%20%231');
    expect(new URLSearchParams(href.split('?')[1]).get('text')).toBe('a&b=c #1');
  });
});

describe('searchLightCorpus', () => {
  const entries = [
    entry({ text: 'devnet-8 to run discv5-only', callDate: '2026-07-20' }),
    entry({ kind: 'highlight', text: 'discv5 support confirmed in Nimbus', callDate: '2026-07-27' }),
    entry({ kind: 'note', text: 'QUIC enabled on the devnet', callDate: '2026-07-13' }),
  ];

  it('returns nothing for an empty query', () => {
    expect(searchLightCorpus('   ', entries, EMPTY_SUMMARY_FILTERS)).toEqual([]);
  });

  it('matches case-insensitively and prefers entries matching every term', () => {
    const results = searchLightCorpus('DISCV5 devnet', entries, EMPTY_SUMMARY_FILTERS);
    // Any-term matching, but the entry hitting both terms sorts to the top.
    expect(results.map((r) => r.entry.text)).toEqual([
      'devnet-8 to run discv5-only',
      'QUIC enabled on the devnet',
      'discv5 support confirmed in Nimbus',
    ]);
  });

  it('filters by call type and entry kind', () => {
    expect(searchLightCorpus('devnet', entries, { callType: 'acde', kind: 'all' })).toEqual([]);
    expect(
      searchLightCorpus('devnet', entries, { callType: 'all', kind: 'note' }).map((r) => r.entry.kind),
    ).toEqual(['note']);
  });

  it('never claims identity — summary prose does not name a call', () => {
    for (const result of searchLightCorpus('discv5', entries, EMPTY_SUMMARY_FILTERS)) {
      expect(result.identity).toBe(0);
    }
  });
});
