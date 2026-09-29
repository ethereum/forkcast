import { describe, expect, it } from 'vitest';

import { buildEipMentionsIndex } from './lib/eip-mentions-index.mjs';

const CALL = { type: 'acde', date: '2026-05-07', number: '236', path: 'acde/236' };
const LATER = { type: 'acde', date: '2026-09-24', number: '246', path: 'acde/246' };

const SYNC = { transcriptStartTime: '00:07:15', videoStartTime: '00:03:24' };

const mentions = (...ids) => ({
  meeting: 'ACDE #236',
  eips: ids.map((eip) => ({
    eip,
    weight: 'discussed',
    summary: 's',
    moments: [{ timestamp: '00:09:53', context: 'c' }],
  })),
});

/** Builds the index from an in-memory `{ 'acde/236': { 'file.json': {...} } }` map. */
const build = (calls, files) =>
  buildEipMentionsIndex(
    calls,
    (call, relPath) => files[call.path]?.[relPath] ?? null,
    (call) => Object.keys(files[call.path] ?? {}),
  );

describe('buildEipMentionsIndex', () => {
  it('maps each EIP to the calls that mentioned it', () => {
    const index = build([CALL], { 'acde/236': { 'eip_mentions.json': mentions(8037, 8061) } });
    expect(index.eips).toEqual({ 8037: ['acde/236'], 8061: ['acde/236'] });
  });

  it('lists every call that mentioned an EIP', () => {
    const index = build([CALL, LATER], {
      'acde/236': { 'eip_mentions.json': mentions(8037) },
      'acde/246': { 'eip_mentions.json': mentions(8037) },
    });
    expect(index.eips[8037]).toEqual(['acde/246', 'acde/236']);
  });

  it('lists a call once even when its file names the same EIP twice', () => {
    // `validateMentions` rejects this at generation time, so it only arrives by
    // hand edit — but the page keys its rows on the call, so a repeat collides.
    const index = build([CALL], { 'acde/236': { 'eip_mentions.json': mentions(8037, 8061, 8037) } });
    expect(index.eips[8037]).toEqual(['acde/236']);
    expect(index.eips[8061]).toEqual(['acde/236']);
  });

  it('orders calls newest first', () => {
    const index = build([CALL, LATER], {
      'acde/236': { 'eip_mentions.json': mentions(8037) },
      'acde/246': { 'eip_mentions.json': mentions(8037) },
    });
    expect(Object.keys(index.calls)).toEqual(['acde/246', 'acde/236']);
  });

  it('carries the call sync so the page can convert transcript time to video time', () => {
    const index = build([CALL], {
      'acde/236': { 'eip_mentions.json': mentions(8037), 'config.json': { sync: SYNC } },
    });
    expect(index.calls['acde/236'].sync).toEqual(SYNC);
  });

  it('carries a one-off call name, which already reads as a full title', () => {
    const oneOff = { type: 'one-off-1954', date: '2026-03-05', number: '001', path: 'one-off-1954/001', name: 'Headliner Breakout: EIP-8141' };
    const index = build([oneOff], { 'one-off-1954/001': { 'eip_mentions.json': mentions(8141) } });
    expect(index.calls['one-off-1954/001'].name).toBe('Headliner Breakout: EIP-8141');
  });

  it('takes a breakout sync from its own config, not the parent call', () => {
    // A bundled breakout is a separate Zoom recording with its own offset;
    // the parent's would be wrong by minutes.
    const breakoutSync = { transcriptStartTime: '00:01:19', videoStartTime: '00:00:05' };
    const index = build([CALL], {
      'acde/236': {
        'eip_mentions.json': mentions(8037),
        'eip_mentions_cl.json': mentions(7732),
        'config.json': { sync: SYNC, breakouts: { cl: { sync: breakoutSync } } },
      },
    });
    expect(index.calls['acde/236'].sync).toEqual(SYNC);
    expect(index.calls['acde/236:cl'].sync).toEqual(breakoutSync);
    expect(index.calls['acde/236:cl'].breakout).toBe('cl');
    expect(index.eips[7732]).toEqual(['acde/236:cl']);
  });

  it('records a null sync when the call has none configured', () => {
    const index = build([CALL], { 'acde/236': { 'eip_mentions.json': mentions(8037) } });
    expect(index.calls['acde/236'].sync).toBeNull();
  });

  it('omits a call with no mentions file', () => {
    const index = build([CALL, LATER], { 'acde/236': { 'eip_mentions.json': mentions(8037) } });
    expect(Object.keys(index.calls)).toEqual(['acde/236']);
  });

  it('omits a call whose mentions file is empty', () => {
    const index = build([CALL], { 'acde/236': { 'eip_mentions.json': { meeting: 'x', eips: [] } } });
    expect(index.calls).toEqual({});
    expect(index.eips).toEqual({});
  });

  it('skips a malformed entry without an integer eip', () => {
    const index = build([CALL], {
      'acde/236': { 'eip_mentions.json': { meeting: 'x', eips: [{ eip: 'nope' }, { eip: 8037 }] } },
    });
    expect(index.eips).toEqual({ 8037: ['acde/236'] });
  });
});
