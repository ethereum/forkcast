import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { loadEips, selectInScopeEips } from './plan-eips.mjs';

const rel = (forkName, statuses, extra = {}) => ({
  forkName,
  statusHistory: statuses.map((status) => ({ status, call: null, date: null })),
  ...extra,
});

const eip = (id, forkRelationships, layer) => ({
  id,
  title: `EIP-${id}: Title ${id}`,
  layer,
  forkRelationships,
});

describe('selectInScopeEips', () => {
  it('picks PFI and CFI EIPs in whichever fork has them', () => {
    const selected = selectInScopeEips([
      eip(1, [rel('Hegota', ['Proposed'])]),
      eip(2, [rel('Hegota', ['Proposed', 'Considered'])]),
      eip(3, [rel('Glamsterdam', ['Proposed', 'Scheduled'])]),
      eip(4, [rel('Hegota', ['Proposed', 'Declined'])]),
    ]);
    expect(selected).toEqual([
      { id: 1, title: 'Title 1', fork: 'Hegota', stage: 'PFI' },
      { id: 2, title: 'Title 2', fork: 'Hegota', stage: 'CFI' },
    ]);
  });

  it('drops headliner candidates once their fork has decided on them', () => {
    // These used to match on the headliner flag alone, so a Declined or
    // Scheduled candidate from a past fork stayed "in scope" indefinitely.
    const selected = selectInScopeEips([
      eip(1, [rel('Glamsterdam', ['Proposed', 'Declined'], { wasHeadlinerCandidate: true })]),
      eip(2, [rel('Fusaka', ['Included'], { isHeadliner: true })]),
      eip(3, [rel('Hegota', [], { wasHeadlinerCandidate: true })]),
    ]);
    expect(selected.map((e) => [e.id, e.stage])).toEqual([[3, 'Candidate']]);
  });

  it('labels an EIP by its open fork, not by an earlier decided one', () => {
    const [selected] = selectInScopeEips([
      eip(1, [
        rel('Glamsterdam', ['Proposed', 'Declined'], { wasHeadlinerCandidate: true }),
        rel('Hegota', ['Proposed', 'Considered']),
      ]),
    ]);
    expect(selected).toMatchObject({ fork: 'Hegota', stage: 'CFI' });
  });

  it('filters by layer but keeps EIPs with no layer set', () => {
    const eips = [
      eip(1, [rel('Hegota', ['Proposed'])], 'EL'),
      eip(2, [rel('Hegota', ['Proposed'])], 'CL'),
      eip(3, [rel('Hegota', ['Proposed'])]),
    ];
    expect(selectInScopeEips(eips, 'CL').map((e) => e.id)).toEqual([2, 3]);
    expect(selectInScopeEips(eips).map((e) => e.id)).toEqual([1, 2, 3]);
  });
});

describe('loadEips', () => {
  it('reads the source files and skips Moved EIPs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-eips-'));
    writeFileSync(join(dir, '1.json'), JSON.stringify({ id: 1, status: 'Draft' }));
    writeFileSync(join(dir, '2.json'), JSON.stringify({ id: 2, status: 'Moved' }));
    expect(loadEips(dir).map((e) => e.id)).toEqual([1]);
  });

  it('throws instead of reporting an empty dataset', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-eips-'));
    expect(() => loadEips(dir)).toThrow(/No EIP JSON files/);
  });
});
