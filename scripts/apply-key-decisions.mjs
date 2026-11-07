#!/usr/bin/env node

/**
 * Apply a call's stage-change decisions (key_decisions.json) to the EIP data
 * files' forkRelationships. Implements steps 1–3 of the apply-key-decisions
 * skill; champion attribution (step 4) needs judgment and is left to a human,
 * so EIPs whose relationship lacks champions are listed instead.
 *
 * Idempotent: a decision already recorded as the same status + call on that
 * fork is skipped, so re-running (or running after a hand edit) is a no-op.
 *
 * Usage:
 *   node scripts/apply-key-decisions.mjs acde/247
 *   node scripts/apply-key-decisions.mjs acde/247 acdc/188 --dry-run
 *   node scripts/apply-key-decisions.mjs --since 2026-09-01
 *   node scripts/apply-key-decisions.mjs --all
 *   node scripts/apply-key-decisions.mjs --since 2026-09-01 --summary out.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stageChangeTuples } from './lib/key-decisions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const CALL_DIR_RE = /^(\d{4}-\d{2}-\d{2})_(\d+)$/;

/**
 * Artifact dirs for every call that has a key_decisions.json, oldest first.
 * Optional `types` limits to those series, `since` to calls on/after a date.
 */
export function listCalls(artifactsDir, { since, types } = {}) {
  const calls = [];
  if (!fs.existsSync(artifactsDir)) return calls;

  for (const type of fs.readdirSync(artifactsDir)) {
    if (types && !types.includes(type)) continue;
    const typeDir = path.join(artifactsDir, type);
    if (!fs.statSync(typeDir).isDirectory()) continue;

    for (const callDir of fs.readdirSync(typeDir)) {
      const m = callDir.match(CALL_DIR_RE);
      if (!m) continue;
      if (since && m[1] < since) continue;
      if (!fs.existsSync(path.join(typeDir, callDir, 'key_decisions.json'))) continue;
      calls.push({ type, callDir, date: m[1], number: parseInt(m[2], 10) });
    }
  }

  return calls.sort(
    (a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type),
  );
}

/** Resolve a `{type}/{number}` ref to its artifact dir (skill step 1). */
export function resolveCall(artifactsDir, ref) {
  const m = ref.match(/^([a-z0-9-]+)\/(\d+)$/i);
  if (!m) throw new Error(`Invalid call ref "${ref}", expected {type}/{number}`);
  const [, type, num] = m;
  const number = parseInt(num, 10);
  const typeDir = path.join(artifactsDir, type.toLowerCase());
  if (!fs.existsSync(typeDir)) throw new Error(`No artifacts for series "${type}"`);

  const match = fs
    .readdirSync(typeDir)
    .find((d) => CALL_DIR_RE.test(d) && parseInt(d.split('_').pop(), 10) === number);
  if (!match) throw new Error(`No artifact folder for ${ref}`);
  if (!fs.existsSync(path.join(typeDir, match, 'key_decisions.json'))) {
    throw new Error(`No key_decisions.json for ${ref}`);
  }
  return { type: type.toLowerCase(), callDir: match, date: match.slice(0, 10), number };
}

/**
 * Stage-change tuples for one call (skill step 2), plus stage changes the
 * skill can't apply because the extraction gave no fork (e.g. a withdrawal),
 * so they can be listed for a human.
 */
export function loadCallDecisions(artifactsDir, call) {
  const file = path.join(artifactsDir, call.type, call.callDir, 'key_decisions.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const unforked = (data.key_decisions || [])
    .filter((d) => d.type === 'stage_change' && !d.fork && d.stage_change?.to && d.eips?.length)
    .map((d) => ({
      eips: d.eips,
      status: d.stage_change.to,
      call: `${call.type}/${call.number}`,
      text: d.original_text,
    }));
  return { tuples: stageChangeTuples(call.type, call.callDir, data), unforked };
}

/**
 * Apply one decision to an EIP object in place (skill step 3). Returns
 * 'added-fork' | 'added-status' | 'duplicate'. A decision that repeats the
 * status the EIP already had at that point (e.g. a re-announced PFI) is not a
 * stage change and also counts as 'duplicate'.
 */
export function applyDecision(eip, { fork, status, call, date }) {
  eip.forkRelationships ??= [];
  const rel = eip.forkRelationships.find(
    (r) => r.forkName.toLowerCase() === fork.toLowerCase(),
  );
  const entry = { status, call, date };

  if (!rel) {
    // Fork names are capitalised everywhere in the data ("Hegota").
    const forkName = fork.charAt(0).toUpperCase() + fork.slice(1);
    eip.forkRelationships.push({ forkName, statusHistory: [entry] });
    return 'added-fork';
  }

  rel.statusHistory ??= [];
  if (rel.statusHistory.some((h) => h.status === status && h.call === call)) {
    return 'duplicate';
  }

  // Keep the history oldest -> newest: insert after the last entry dated on or
  // before this call. Undated entries are legacy and sort first.
  let at = rel.statusHistory.length;
  while (at > 0 && rel.statusHistory[at - 1].date && rel.statusHistory[at - 1].date > date) {
    at--;
  }
  if (at > 0 && rel.statusHistory[at - 1].status === status) return 'duplicate';
  rel.statusHistory.splice(at, 0, entry);
  return 'added-status';
}

function hasChampions(eip, fork) {
  const rel = eip.forkRelationships?.find(
    (r) => r.forkName.toLowerCase() === fork.toLowerCase(),
  );
  return Boolean(rel?.champions?.length);
}

/**
 * Apply every decision for the given calls to the EIP files in `eipsDir`.
 * Files are only rewritten when something changed, in the same
 * `JSON.stringify(_, null, 2) + '\n'` format the EIP sync writes.
 */
export function applyCalls({ artifactsDir, eipsDir, calls, dryRun = false }) {
  const applied = [];
  const missing = [];
  const duplicates = [];
  const unforked = [];
  const touched = new Map();

  for (const call of calls) {
    const decisions = loadCallDecisions(artifactsDir, call);
    unforked.push(...decisions.unforked);
    for (const tuple of decisions.tuples) {
      const file = path.join(eipsDir, `${tuple.id}.json`);
      let eip = touched.get(file);
      if (!eip) {
        if (!fs.existsSync(file)) {
          missing.push(tuple);
          continue;
        }
        eip = JSON.parse(fs.readFileSync(file, 'utf8'));
      }

      const result = applyDecision(eip, tuple);
      if (result === 'duplicate') {
        duplicates.push(tuple);
        continue;
      }
      touched.set(file, eip);
      applied.push({ ...tuple, result });
    }
  }

  if (!dryRun) {
    for (const [file, eip] of touched) {
      fs.writeFileSync(file, JSON.stringify(eip, null, 2) + '\n');
    }
  }

  const needsChampion = applied.filter((t) => {
    const eip = touched.get(path.join(eipsDir, `${t.id}.json`));
    return !hasChampions(eip, t.fork);
  });

  return { applied, missing, duplicates, needsChampion, unforked };
}

/** Markdown summary, used as the PR body by the workflow. */
export function formatSummary({ applied, missing, needsChampion, unforked }) {
  const lines = [];
  if (applied.length) {
    lines.push('| EIP | Fork | Status | Call | Champion |', '|---|---|---|---|---|');
    const noChampion = new Set(needsChampion.map((t) => `${t.id}:${t.fork}`));
    for (const t of applied) {
      const champion = noChampion.has(`${t.id}:${t.fork}`) ? 'needs confirmation' : 'present';
      lines.push(`| ${t.id} | ${t.fork} | ${t.status} | ${t.call} | ${champion} |`);
    }
  } else {
    lines.push('No new stage-change decisions to apply.');
  }
  if (missing.length) {
    lines.push('', 'Decisions for EIPs with no data file (add them with the convert-eip skill):', '');
    for (const t of missing) lines.push(`- EIP-${t.id}: ${t.status} for ${t.fork} (${t.call})`);
  }
  if (unforked.length) {
    lines.push('', 'Stage changes with no fork in key_decisions.json, not applied (check by hand):', '');
    for (const d of unforked) lines.push(`- ${d.call}: ${d.status}, EIP ${d.eips.join(', ')}: "${d.text}"`);
  }
  return lines.join('\n') + '\n';
}

function parseArgs(argv) {
  const opts = { refs: [], all: false, since: null, dryRun: false, summary: null, types: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--all') opts.all = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--since') opts.since = argv[++i];
    else if (arg === '--summary') opts.summary = argv[++i];
    else if (arg === '--types') opts.types = argv[++i].split(',');
    else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else opts.refs.push(arg);
  }
  if (opts.since && !/^\d{4}-\d{2}-\d{2}$/.test(opts.since)) {
    throw new Error('--since expects YYYY-MM-DD');
  }
  if (!opts.refs.length && !opts.all && !opts.since) {
    throw new Error('Pass a call ref (e.g. acde/247), --since <YYYY-MM-DD>, or --all');
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const artifactsDir = path.join(ROOT, 'public/artifacts');
  const eipsDir = path.join(ROOT, 'src/data/eips');

  const calls = opts.refs.length
    ? opts.refs.map((ref) => resolveCall(artifactsDir, ref))
    : listCalls(artifactsDir, { since: opts.since, types: opts.types });

  const result = applyCalls({ artifactsDir, eipsDir, calls, dryRun: opts.dryRun });
  const { applied, missing, duplicates, needsChampion, unforked } = result;

  console.log(`Calls scanned: ${calls.length}`);
  console.log(`Already reflected: ${duplicates.length}`);
  for (const t of applied) {
    const what = t.result === 'added-fork' ? 'new relationship' : 'history';
    console.log(`  EIP-${t.id}: ${t.status} for ${t.fork} (${t.call}, ${what})`);
  }
  console.log(`Applied: ${applied.length}${opts.dryRun ? ' (dry run, nothing written)' : ''}`);
  for (const t of missing) {
    console.log(`  No data file for EIP-${t.id} (${t.status} for ${t.fork}, ${t.call})`);
  }
  for (const d of unforked) {
    console.log(`  No fork given, not applied: ${d.status} EIP ${d.eips.join(', ')} (${d.call}): ${d.text}`);
  }
  if (needsChampion.length) {
    const ids = [...new Set(needsChampion.map((t) => `${t.id} (${t.fork})`))];
    console.log(`Lacking champions: ${ids.join(', ')}`);
  }

  if (opts.summary) fs.writeFileSync(opts.summary, formatSummary(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
