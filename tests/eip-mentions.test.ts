/**
 * Assertions about the `eip_mentions*.json` artifacts in `public/artifacts/`.
 *
 * These files are LLM-extracted, and a call page trusts them twice over: the
 * Mentions tab lists them, and `CallPage` uses the id set as the allow-list
 * for linkifying bare numbers in the transcript and chat log. A wrong id is
 * therefore not a single bad row — it turns every occurrence of that number
 * in the call's prose into an EIP link. These tests are the drift alarm for
 * the ids themselves; the link matcher is covered by
 * `src/components/call/TextWithLinks.test.ts`.
 *
 * Reads the repo, not `dist/` — no build needed.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ARTIFACTS = path.join(ROOT, 'public', 'artifacts');
const EIPS_DIR = path.join(ROOT, 'src', 'data', 'eips');

/**
 * Proposals that calls genuinely discuss but Forkcast carries no page for —
 * mostly ERCs and withdrawn drafts. `CallPage` drops these from the link
 * allow-list (the drawer resolves nothing and `/eips/{id}` isn't a built
 * route), so they render as plain text. Listed, not ignored: a *new* entry
 * here should be a deliberate "yes, that one is real but untracked" rather
 * than an extraction slip that quietly linkifies a PR number.
 */
const UNTRACKED_PROPOSALS = new Set([
  4337, // ERC-4337: Account Abstraction via Entry Point Contract
  5189, // ERC-5189: Account Abstraction endorsed operations
  7562, // ERC-7562: Account Abstraction validation scope rules
  7710, // ERC-7710: Smart contract delegation
  7715, // ERC-7715: Grant permissions from wallets
  7730, // ERC-7730: Clear signing metadata
  8047, // Not in the compiled EIP corpus
  8403, // Not in the compiled EIP corpus
]);

/**
 * Ids that are also plausible years. A call saying "shipped in 2025" or
 * "Screenshot 2026-10-08.png" would have every such date linkified if one of
 * these landed in a mentions file, and all six are Withdrawn or Stagnant
 * drafts that no current call discusses. If one is ever genuinely raised,
 * confirm it against the transcript and move it here.
 */
const YEAR_SHAPED_IDS = [2025, 2026, 2027, 2028, 2031, 2035];
const YEAR_SHAPED_REVIEWED = new Set<number>();

/**
 * EIP numbers are still in the four-digit space (8440 is the highest Forkcast
 * carries). Five digits means a GitHub PR or issue number — `ethereum/EIPs`
 * is past 12000 — which is the most common thing to misread as an EIP.
 */
const MAX_PLAUSIBLE_EIP_ID = 9999;

interface MentionFile {
  /** `acde/2026-10-08_247/eip_mentions.json` */
  rel: string;
  ids: number[];
}

function readMentionFiles(): MentionFile[] {
  const files: MentionFile[] = [];
  if (!fs.existsSync(ARTIFACTS)) return files;

  for (const type of fs.readdirSync(ARTIFACTS)) {
    const typeDir = path.join(ARTIFACTS, type);
    if (!fs.statSync(typeDir).isDirectory()) continue;

    for (const call of fs.readdirSync(typeDir)) {
      const callDir = path.join(typeDir, call);
      if (!fs.statSync(callDir).isDirectory()) continue;

      // The main recording plus any bundled breakout, which carries its own
      // transcript and so needs its own allow-list.
      for (const name of fs.readdirSync(callDir)) {
        if (!/^eip_mentions(_.+)?\.json$/.test(name)) continue;
        const parsed = JSON.parse(fs.readFileSync(path.join(callDir, name), 'utf-8'));
        files.push({
          rel: `${type}/${call}/${name}`,
          ids: (parsed?.eips ?? []).map((entry: { eip: number }) => entry?.eip),
        });
      }
    }
  }

  return files;
}

const mentionFiles = readMentionFiles();
const trackedEipIds = new Set(
  fs
    .readdirSync(EIPS_DIR)
    .filter(name => name.endsWith('.json'))
    .map(name => Number(name.replace('.json', ''))),
);

/** `['acde/.../eip_mentions.json: 2026', ...]` — the ids, not just a count. */
const offenders = (predicate: (id: number) => boolean): string[] =>
  mentionFiles.flatMap(file =>
    file.ids.filter(predicate).map(id => `${file.rel}: ${id}`),
  );

describe('eip_mentions artifacts', () => {
  it('finds mention files to check', () => {
    expect(mentionFiles.length).toBeGreaterThan(0);
  });

  it('lists only plausible EIP numbers', () => {
    expect(
      offenders(id => !Number.isInteger(id) || id < 1 || id > MAX_PLAUSIBLE_EIP_ID),
    ).toEqual([]);
  });

  it('lists only EIPs Forkcast carries, or known-untracked proposals', () => {
    expect(
      offenders(id => !trackedEipIds.has(id) && !UNTRACKED_PROPOSALS.has(id)),
    ).toEqual([]);
  });

  it('lists no year-shaped id that has not been reviewed', () => {
    const yearShaped = new Set(YEAR_SHAPED_IDS.filter(id => !YEAR_SHAPED_REVIEWED.has(id)));
    expect(offenders(id => yearShaped.has(id))).toEqual([]);
  });

  it('keeps UNTRACKED_PROPOSALS free of ids Forkcast has since added', () => {
    // Once an EIP gets a page, its entry here is dead weight that would mask a
    // later extraction slip on that same number.
    expect([...UNTRACKED_PROPOSALS].filter(id => trackedEipIds.has(id))).toEqual([]);
  });
});
