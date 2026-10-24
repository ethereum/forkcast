import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyCalls,
  applyDecision,
  formatSummary,
  listCalls,
  resolveCall,
} from './apply-key-decisions.mjs';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/apply-key-decisions');
const ARTIFACTS = path.join(FIXTURES, 'artifacts');

let eipsDir;
const readEip = (id) => JSON.parse(fs.readFileSync(path.join(eipsDir, `${id}.json`), 'utf8'));
const history = (id, fork = 'Hegota') =>
  readEip(id)
    .forkRelationships.find((r) => r.forkName === fork)
    .statusHistory.map((h) => `${h.status} ${h.call}`);

beforeEach(() => {
  eipsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-key-decisions-'));
  fs.cpSync(path.join(FIXTURES, 'eips'), eipsDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(eipsDir, { recursive: true, force: true });
});

describe('call resolution', () => {
  it('resolves a {type}/{number} ref to its dated artifact folder', () => {
    expect(resolveCall(ARTIFACTS, 'acde/247')).toEqual({
      type: 'acde',
      callDir: '2026-10-08_247',
      date: '2026-10-08',
      number: 247,
    });
    expect(() => resolveCall(ARTIFACTS, 'acde/999')).toThrow(/No artifact folder/);
    expect(() => resolveCall(ARTIFACTS, 'acde-247')).toThrow(/Invalid call ref/);
  });

  it('lists calls with decisions oldest first, skipping non-call folders', () => {
    expect(listCalls(ARTIFACTS).map((c) => `${c.type}/${c.number}`)).toEqual(['acdc/187', 'acde/247']);
    expect(listCalls(ARTIFACTS, { since: '2026-10-01' }).map((c) => c.callDir)).toEqual(['2026-10-08_247']);
  });
});

describe('applying a call', () => {
  const run = (refs, opts = {}) =>
    applyCalls({
      artifactsDir: ARTIFACTS,
      eipsDir,
      calls: refs.map((r) => resolveCall(ARTIFACTS, r)),
      ...opts,
    });

  it('adds stage changes per skill steps 2-3', () => {
    const { applied, missing, duplicates, needsChampion, unforked } = run(['acde/247']);

    expect(applied.map((t) => `${t.id} ${t.status} ${t.result}`)).toEqual([
      '7907 Proposed added-fork',
      '5920 Considered added-status',
      '8151 Considered added-fork',
      '8298 Considered added-status',
    ]);
    // Re-announced PFI for an EIP already Proposed is not a stage change.
    expect(duplicates.map((t) => t.id)).toEqual([8333]);
    expect(missing.map((t) => t.id)).toEqual([9999]);
    expect(needsChampion.map((t) => t.id)).toEqual([7907, 8151, 8298]);
    expect(unforked).toEqual([
      { eips: [5920], status: 'Scheduled', call: 'acde/247', text: 'Something moved, fork unknown' },
    ]);

    // New relationship: no headliner flags, fork name capitalised.
    expect(readEip(7907).forkRelationships[1]).toEqual({
      forkName: 'Hegota',
      statusHistory: [{ status: 'Proposed', call: 'acde/247', date: '2026-10-08' }],
    });
    expect(readEip(8151).forkRelationships[0].forkName).toBe('Hegota');
    // Fork-less stage changes and "other" entries are ignored.
    expect(history(5920)).toEqual(['Proposed acde/240', 'Considered acde/247']);
    // Inserted in date order ahead of a later decision.
    expect(history(8298)).toEqual(['Proposed acde/236', 'Considered acde/247', 'Declined acde/250']);
    // Other fields untouched.
    expect(readEip(5920).laymanDescription).toBe('Send ETH without calling the recipient.');
  });

  it('is idempotent and preserves file formatting', () => {
    run(['acde/247']);
    const snapshot = Object.fromEntries(
      fs.readdirSync(eipsDir).map((f) => [f, fs.readFileSync(path.join(eipsDir, f), 'utf8')]),
    );
    for (const text of Object.values(snapshot)) {
      expect(text).toBe(JSON.stringify(JSON.parse(text), null, 2) + '\n');
    }

    const again = run(['acde/247']);
    expect(again.applied).toEqual([]);
    for (const [f, text] of Object.entries(snapshot)) {
      expect(fs.readFileSync(path.join(eipsDir, f), 'utf8')).toBe(text);
    }
  });

  it('leaves untouched files byte-identical and writes nothing on dry run', () => {
    const before = fs.readFileSync(path.join(eipsDir, '5920.json'), 'utf8');
    const { applied } = run(['acde/247'], { dryRun: true });
    expect(applied).toHaveLength(4);
    expect(fs.readFileSync(path.join(eipsDir, '5920.json'), 'utf8')).toBe(before);
  });

  it('applies several calls in order', () => {
    applyCalls({ artifactsDir: ARTIFACTS, eipsDir, calls: listCalls(ARTIFACTS) });
    expect(history(8151)).toEqual(['Proposed acdc/187', 'Considered acde/247']);
  });
});

describe('applyDecision', () => {
  const decision = { fork: 'Hegota', status: 'Considered', call: 'acde/247', date: '2026-10-08' };

  it('treats an identical status + call as already applied', () => {
    const eip = {
      forkRelationships: [{ forkName: 'Hegota', statusHistory: [{ status: 'Considered', call: 'acde/247', date: '2026-10-08' }] }],
    };
    expect(applyDecision(eip, decision)).toBe('duplicate');
    expect(eip.forkRelationships[0].statusHistory).toHaveLength(1);
  });

  it('sorts undated legacy entries first', () => {
    const eip = {
      forkRelationships: [{ forkName: 'Hegota', statusHistory: [{ status: 'Proposed', call: null, date: null }] }],
    };
    expect(applyDecision(eip, decision)).toBe('added-status');
    expect(eip.forkRelationships[0].statusHistory.map((h) => h.status)).toEqual(['Proposed', 'Considered']);
  });
});

describe('summary', () => {
  it('flags champions needing confirmation and missing EIP files', () => {
    const summary = formatSummary(
      applyCalls({ artifactsDir: ARTIFACTS, eipsDir, calls: [resolveCall(ARTIFACTS, 'acde/247')], dryRun: true }),
    );
    expect(summary).toContain('| 5920 | Hegota | Considered | acde/247 | present |');
    expect(summary).toContain('| 7907 | Hegota | Proposed | acde/247 | needs confirmation |');
    expect(summary).toContain('EIP-9999: Proposed for Hegota (acde/247)');
    expect(summary).toContain('- acde/247: Scheduled, EIP 5920: "Something moved, fork unknown"');
  });
});
