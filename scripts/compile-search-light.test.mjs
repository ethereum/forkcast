import { describe, expect, it } from 'vitest';

import { buildLightCorpus } from './lib/search-light.mjs';

const CALL = { type: 'acdt', date: '2026-07-20', number: '088' };

/** Builds the corpus from an in-memory `{ 'tldr.json': {...} }` artifact map. */
const build = (files, call = CALL) =>
  buildLightCorpus(
    [call],
    (_call, relPath) => files[relPath] ?? null,
    () => Object.keys(files),
  );

const TLDR = {
  meeting: 'ACDT #88 - July 20, 2026',
  highlights: {
    fork_status_and_schedule: [{ timestamp: '00:06:27', highlight: 'devnet-7 stable' }],
  },
  action_items: [{ timestamp: '00:22:35', action: 'Align JSON RPC methods', owner: 'Csaba' }],
  decisions: [{ timestamp: '00:12:01', decision: 'stale tldr decision' }],
  targets: [{ timestamp: '00:29:35', target: 'devnet-8 in ~2 weeks' }],
};

describe('light search corpus', () => {
  it('flattens tldr highlights, actions, decisions and targets', () => {
    const { calls } = build({ 'tldr.json': TLDR });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ type: 'acdt', number: '088', path: 'acdt/088', meeting: TLDR.meeting });
    expect(calls[0].entries).toEqual([
      { kind: 'highlight', timestamp: '00:06:27', text: 'devnet-7 stable', category: 'fork_status_and_schedule' },
      { kind: 'decision', timestamp: '00:12:01', text: 'stale tldr decision' },
      { kind: 'action', timestamp: '00:22:35', text: 'Align JSON RPC methods', owner: 'Csaba' },
      { kind: 'target', timestamp: '00:29:35', text: 'devnet-8 in ~2 weeks' },
    ]);
  });

  it('prefers key_decisions.json over the drifted tldr decisions, never both', () => {
    const { calls } = build({
      'tldr.json': TLDR,
      'key_decisions.json': {
        key_decisions: [{ timestamp: '00:16:55', original_text: 'devnet-8 runs discv5-only' }],
      },
    });

    const decisions = calls[0].entries.filter((entry) => entry.kind === 'decision');
    expect(decisions).toEqual([{ kind: 'decision', timestamp: '00:16:55', text: 'devnet-8 runs discv5-only' }]);
  });

  it('indexes note heading, summary and body as one entry', () => {
    const { calls } = build({
      'notes.json': {
        sections: [
          {
            heading: 'Devnet 8 Planning',
            summary: 'Targeted for next week.',
            timestamp: '00:05:38',
            body: '- Discv5 only for EL on Devnet 8.',
          },
        ],
      },
    });

    expect(calls[0].entries).toEqual([
      {
        kind: 'note',
        timestamp: '00:05:38',
        heading: 'Devnet 8 Planning',
        text: 'Devnet 8 Planning\nTargeted for next week.\n- Discv5 only for EL on Devnet 8.',
      },
    ]);
  });

  it('emits a second record per bundled breakout kind', () => {
    const { calls } = build({
      'config.json': { breakouts: { cl: { videoUrl: 'https://example.test' } } },
      'tldr.json': TLDR,
      'tldr_cl.json': {
        meeting: 'ACDT #88 - CL Breakout',
        highlights: { testing_progress: [{ timestamp: '00:01:49', highlight: 'Chaos testing planned' }] },
      },
    });

    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ path: 'acdt/088', breakout: 'cl', meeting: 'ACDT #88 - CL Breakout' });
    expect(calls[1].entries).toEqual([
      { kind: 'highlight', timestamp: '00:01:49', text: 'Chaos testing planned', category: 'testing_progress' },
    ]);
    expect(calls[0].breakout).toBeUndefined();
  });

  it('indexes a suffixed artifact that config.breakouts does not list', () => {
    const { calls } = build({
      'config.json': {},
      'notes_el.json': { sections: [{ heading: 'EL Breakout', summary: 'BAL RPC alignment.' }] },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].breakout).toBe('el');
  });

  it('skips calls with no summary artifacts', () => {
    expect(build({ 'chat.txt': 'not json' }).calls).toEqual([]);
    expect(build({ 'config.json': { breakouts: { cl: {} } } }).calls).toEqual([]);
  });

  it('serializes identically across invocations', () => {
    const files = { 'tldr.json': TLDR, 'notes.json': { sections: [{ heading: 'A', body: 'b' }] } };
    expect(JSON.stringify(build(files))).toBe(JSON.stringify(build(files)));
  });
});
