import { describe, expect, it } from 'vitest';
import { capSections, flattenSections, orderSections } from './ranking';
import type { GlobalResult, SectionId, SectionResults } from './types';

const result = (identity: number): GlobalResult =>
  ({ kind: 'site', score: 1, identity, href: '/x', entity: {} }) as unknown as GlobalResult;

const section = (id: SectionId, identity: number, count = 1, total = count): SectionResults => ({
  id,
  results: Array.from({ length: count }, () => result(identity)),
  total,
});

describe('orderSections', () => {
  it('promotes the section whose top result names the query target', () => {
    const ordered = orderSections([
      section('summaries', 0),
      section('networks', 100),
      section('eips', 0),
    ]);
    expect(ordered.map((s) => s.id)).toEqual(['networks', 'eips', 'summaries']);
  });

  it('is a stable partition — promoted sections keep their base order', () => {
    const ordered = orderSections([
      section('pages', 100),
      section('calls', 100),
      section('eips', 100),
      section('networks', 0),
    ]);
    expect(ordered.map((s) => s.id)).toEqual(['eips', 'pages', 'calls', 'networks']);
  });

  it('never promotes summaries or transcripts, whatever they score', () => {
    const ordered = orderSections([
      section('summaries', 100),
      section('transcripts', 100),
      section('eips', 0),
    ]);
    expect(ordered.map((s) => s.id)).toEqual(['eips', 'summaries', 'transcripts']);
  });

  it('falls back to base order when nothing clears the bar', () => {
    const ordered = orderSections([section('calls', 0), section('pages', 0), section('eips', 0)]);
    expect(ordered.map((s) => s.id)).toEqual(['eips', 'pages', 'calls']);
  });

  it('a named call still jumps ahead of everything from the bottom of the order', () => {
    const ordered = orderSections([section('eips', 0), section('summaries', 0), section('calls', 100)]);
    expect(ordered.map((s) => s.id)).toEqual(['calls', 'eips', 'summaries']);
  });
});

describe('capSections', () => {
  it('caps each section in the all view but leaves a scoped view whole', () => {
    const sections = [section('eips', 0, 9), section('calls', 0, 9)];
    expect(capSections(sections, true).map((s) => s.results.length)).toEqual([3, 5]);
    expect(capSections(sections, false).map((s) => s.results.length)).toEqual([9, 9]);
  });

  it('keeps the untruncated total so the expand row can report it', () => {
    expect(capSections([section('eips', 0, 9)], true)[0].total).toBe(9);
  });
});

describe('flattenSections', () => {
  it('emits a header then one row per result', () => {
    const rows = flattenSections([section('eips', 0, 2)]);
    expect(rows.map((row) => row.type)).toEqual(['header', 'result', 'result']);
  });

  it('emits expand-section only for a truncated section', () => {
    const truncated = flattenSections([section('eips', 0, 3, 37)]);
    const action = truncated.at(-1);
    expect(action).toEqual({
      type: 'action',
      action: { kind: 'expand-section', sectionId: 'eips', scope: 'eips', label: 'Show all 37 eips' },
    });

    expect(flattenSections([section('eips', 0, 3, 3)]).some((row) => row.type === 'action')).toBe(false);
  });

  it('skips empty sections', () => {
    expect(flattenSections([section('eips', 0, 0, 0)])).toEqual([]);
  });

  it('appends the transcript activation row last', () => {
    const rows = flattenSections([section('eips', 0, 1)], { transcriptAction: 'Search 213 call transcripts' });
    expect(rows.at(-1)).toEqual({
      type: 'action',
      action: { kind: 'activate-transcripts', label: 'Search 213 call transcripts' },
    });
  });
});
