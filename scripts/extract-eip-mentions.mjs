#!/usr/bin/env node
/**
 * Extract every EIP mentioned on a call, with the context it came up in
 * (eip_mentions.json).
 *
 * Distinct from key_decisions.json, which records only the EIPs a call decided
 * something about. Most EIPs named on a call never become a decision.
 *
 * Usage:
 *   node --env-file=.env scripts/extract-eip-mentions.mjs --only acde/2026-05-07_236
 *   node --env-file=.env scripts/extract-eip-mentions.mjs --only acde/2026-05-07_236 --force
 *   node --env-file=.env scripts/extract-eip-mentions.mjs --only acde/2026-05-07_236 --dry-run
 *   node --env-file=.env scripts/extract-eip-mentions.mjs --only acde/2026-10-08_247,p2p/2026-10-07_009 --limit 4
 *
 * Calls are named explicitly by design — there is no --all. --only takes a
 * comma-separated list; --limit caps how many transcripts are sent to the API
 * in one run (existing outputs don't count). Requires ANTHROPIC_API_KEY.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'node:util';

import {
  extractEipCandidates,
  lastCueSeconds,
  sortMentions,
  validateMentions,
} from './lib/eip-mentions.mjs';
import { callClaude, formatCost, jobConfig, parseJson } from './lib/anthropic.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTIFACTS_DIR = join(ROOT, 'public', 'artifacts');
const EIPS_JSON = join(ROOT, 'src', 'data', 'eips.json');

const LLM = jobConfig('eip-mentions');

const MENTIONS_PROMPT = `You index every EIP mentioned on an Ethereum core developer call, and the context each one came up in.

This is not a summary of the call and not a record of its decisions — it is an index of EIP mentions. A reader uses it to answer "was EIP-8061 talked about on this call, and in what connection?"

## Grouping

- One entry per EIP, no matter how many times it came up. Never emit the same EIP twice.
- Each entry carries a \`moments\` array — one moment per distinct point in the call where that EIP was raised. An EIP raised once has one moment; an EIP that came back three times has three.
- Include every EIP that was named, including passing references, dependency citations, and names read out in a list. Nothing is too minor to index — that is what \`weight\` is for.

## Fields

- \`eip\`: the number, as an integer. Resolve bare numbers ("8047 was deprioritized") against the anchors list, including its unconfirmed section — an EIP too new for the corpus still belongs in the index. If someone clearly means an EIP but no number was ever said, skip it — this index is keyed on numbers.
- \`weight\`: \`"discussed"\` when the call actually engaged with it — status, implementation, testing, an objection, scoping, a decision. \`"mentioned"\` for a drive-by reference, a dependency citation, or a name in a list with no discussion attached.
- \`summary\`: one plain sentence, 25 words or fewer, stating **how it came up on this call** — not what the EIP does. The reader already has the spec. No markdown, no links.
- \`moments[].timestamp\`: the VTT cue time where that moment begins, \`HH:MM:SS\` (no milliseconds). Copy it from the transcript.
- \`moments[].context\`: one or two sentences saying what was actually said about the EIP at that point. Enough that the reader knows whether to go watch it.

## Deciding which numbers are EIPs

The anchors list ends with an "Unconfirmed numbers" section: bare numbers that are not in Forkcast's EIP corpus. Newly proposed EIPs land there constantly, because the corpus — and your own knowledge — both lag new proposals by months. **Never leave a number out because you do not recognize it as an EIP.** The call is the authority, not the corpus. If a speaker says "can we propose 8294 to Glamsterdam", 8294 is an EIP and belongs in the index, whether or not you have heard of it.

The converse rule matters just as much, and it applies to **every** number in the anchors block — including the ones that resolved to a corpus title, which is where this goes wrong most often. A title only means the digits match an EIP id; it is not evidence the call discussed that EIP. The ecosystem quotes a lot of numbers that are not EIPs, and the surrounding words name them:

- pull requests — "spec PR 3866", "consensus-specs/pull/3866", "beacon-APIs/pull/627"
- issues — "issue 2222 on the PM repo", "ethereum/pm/issues/2223"
- forum threads — "ethresear.ch/t/.../26025", "ethereum-magicians.org/t/.../24615"
- call numbers — "we agreed on ACDE 233", "brought up on ACDT 95", "punted from last ACDE"
- quantities — "off by 100", "30,000 gas", "8975 validators", "3533 epochs", "the 1/1024 rule"

None of these is an EIP, even when the number happens to match a real EIP id — EIP-627 and EIP-233 both exist, and neither has ever been discussed on an ACD call. A PR *about* an EIP is not the EIP: index the EIP it concerns, if the call names it, and never the PR number. When in doubt, ask what noun the sentence attaches to the number.

If you find yourself writing a \`summary\` or \`context\` that says the number is a PR, an issue, a thread or a call — that is the signal to leave it out entirely, not to index it with an explanation.

## Accuracy

- Copy numbers, percentages, client names, dates and version strings verbatim from the call. Never round, approximate, or infer a figure that was not stated.
- Do not editorialize. Do not say whether the EIP is good, popular, or likely to ship. Report what was said, not how the room felt about it.
- Do not add context from outside the call, and do not speculate about what happens next.
- Attribute a speaker or client team only when the attribution is the point (who objected, who owns the follow-up).

## Output

Return ONLY valid JSON, no markdown fences, no commentary:

{
  "meeting": "<meeting title from input>",
  "eips": [
    {
      "eip": 8061,
      "weight": "discussed",
      "summary": "One sentence on how it came up on this call.",
      "moments": [
        { "timestamp": "00:12:34", "context": "What was said about it here." }
      ]
    }
  ]
}

Do not emit a \`title\` field — titles are filled in from the EIP corpus afterwards.`;

/** id -> title, with the redundant "EIP-NNNN: " prefix stripped. */
function loadEipTitles() {
  if (!existsSync(EIPS_JSON)) return null;
  const data = JSON.parse(readFileSync(EIPS_JSON, 'utf-8'));
  return new Map(
    data.filter((e) => e.id).map((e) => [e.id, String(e.title || '').replace(/^EIP-\d+:\s*/, '')]),
  );
}

function readOptional(path) {
  return existsSync(path) ? readFileSync(path, 'utf-8') : null;
}

/**
 * Transcripts to index: the main call plus any `_${kind}` suffixed bundled
 * breakout, mirroring how tldr.json / tldr_${kind}.json are laid out.
 */
function findTranscriptFiles(meetingDir) {
  const files = [];
  const main =
    (existsSync(join(meetingDir, 'transcript_corrected.vtt')) && 'transcript_corrected.vtt') ||
    (existsSync(join(meetingDir, 'transcript.vtt')) && 'transcript.vtt');
  if (main) files.push({ path: join(meetingDir, main), suffix: '' });

  for (const name of readdirSync(meetingDir)) {
    if (!name.startsWith('transcript_') || !name.endsWith('.vtt')) continue;
    if (name === 'transcript_corrected.vtt') continue;
    const suffix = name.slice('transcript'.length, -'.vtt'.length); // e.g. "_cl"
    files.push({ path: join(meetingDir, name), suffix });
  }
  return files;
}

function meetingTitle(entry, suffix) {
  const [callType, dirName] = entry.split('/');
  const [date, number] = dirName.split('_');
  const base = number ? `${callType.toUpperCase()} #${number} - ${date}` : `${callType.toUpperCase()} - ${date}`;
  return suffix ? `${base} (${suffix.slice(1).toUpperCase()} Breakout)` : base;
}

/**
 * The anchors block. Both tiers get framing, and the exclusions render whether or
 * not there are weak candidates: the failures in practice have been *strong*
 * candidates, where a corpus title made a PR or call number look confirmed.
 */
function formatAnchors(candidates, titles) {
  const strong = [];
  const weak = [];
  for (const [id, { count, explicit, weak: isWeak, urlCount }] of candidates) {
    const linkOnly = urlCount === count;
    if (isWeak) {
      weak.push(`${id} (${count}x${linkOnly ? ', only ever inside a link' : ''})`);
      continue;
    }
    const title = titles.get(id);
    const notes = [
      `${count}x`,
      explicit ? 'EIP-prefixed' : 'bare number only',
      ...(linkOnly ? ['every occurrence inside a link'] : []),
    ];
    strong.push(`EIP-${id}${title ? ` — ${title}` : ' — (not in the EIP corpus)'} (${notes.join(', ')})`);
  }

  const blocks = [];

  if (strong.length > 0) {
    blocks.push(
      [
        '### Numbers found in the transcript and chat',
        'A line here means the scan found those digits somewhere in the inputs — not that an EIP was discussed. A title means only that the number matches a corpus entry. Check what the sentence says each number *is* before indexing it; see "Not EIPs" below.',
        strong.join('\n'),
      ].join('\n\n'),
    );
  }

  if (weak.length > 0) {
    blocks.push(
      [
        '### Unconfirmed numbers',
        'Bare numbers, no EIP prefix, that the corpus does not recognize. The corpus lags new proposals, so a freshly proposed EIP looks exactly like this — and so does a gas figure or a slot number. Judge each one from the sentence it appears in, not from its absence here.',
        'Include it when the sentence treats it as a proposal: "can we propose 8294 to Glamsterdam", "8047 was the second lowest prioritized", "we put N on the devnet", "N is CFI\'d".',
        weak.join(', '),
      ].join('\n\n'),
    );
  }

  blocks.push(
    [
      '### Not EIPs',
      'This applies to both lists above, including numbers that resolved to a corpus title. Leave a number out when the sentence names it as something other than an EIP:',
      [
        '- a pull request — "spec PR 3866", "EIPs/pull/12299", "beacon-APIs/pull/627"',
        '- an issue — "issue 2222 on the PM repo"',
        '- a forum thread — "ethresear.ch/t/some-title/26025"',
        '- a call number — "we agreed on ACDE 233", "brought up on ACDT 95"',
        '- a quantity — "off by 100", "30,000 gas", "8975 validators", "slot 11605", "3533 epochs"',
      ].join('\n'),
      '"Every occurrence inside a link" on a number above is near-conclusive evidence of the first three. A PR *about* an EIP is not the EIP: index the EIP it concerns, if the call names it, never the PR number.',
    ].join('\n\n'),
  );

  return blocks.join('\n\n');
}

async function extractForFile(entry, meetingDir, transcriptFile, titles, model, force, budget) {
  const { path: transcriptPath, suffix } = transcriptFile;
  const outputPath = join(meetingDir, `eip_mentions${suffix}.json`);
  const transcriptName = transcriptPath.split('/').pop();

  if (existsSync(outputPath) && !force) {
    console.log(`  eip_mentions${suffix}.json already exists (use --force to regenerate)`);
    return 'skipped';
  }

  const transcript = readFileSync(transcriptPath, 'utf-8');
  // chat.txt is never touched by the correction pipeline, so it is the best
  // source for EIP numbers people pasted rather than said.
  const chat = readOptional(join(meetingDir, `chat${suffix}.txt`));
  const title = meetingTitle(entry, suffix);

  const knownIds = new Set(titles.keys());
  const candidates = extractEipCandidates(`${transcript}\n${chat ?? ''}`, knownIds);
  if (candidates.size === 0) {
    console.log(`  ${transcriptName}: no EIP numbers found in the transcript or chat — nothing to index`);
    return 'skipped';
  }
  console.log(`  ${transcriptName}: ${candidates.size} candidate EIP(s) found`);

  const userMessage = `## Meeting Title

${title}

## Anchors (every EIP number found in the transcript and chat by a literal scan)

Use these to resolve bare numbers. The scan is not authoritative in either direction — a number here may be a gas figure that happens to collide with an EIP id, and a genuinely spelled-out mention may be missing. Report what the call actually said.

${formatAnchors(candidates, titles)}

## Chat Messages

${chat ?? '(No chat file available)'}

## Transcript (WebVTT)

${transcript}`;

  if (budget.remaining <= 0) {
    console.log(`  ${transcriptName}: --limit reached, not generated`);
    return 'deferred';
  }
  budget.remaining--;

  console.log(`  ${transcriptName}: calling Claude API (${model})...`);

  try {
    const { text, usage, cost } = await callClaude({
      model,
      effort: LLM.effort,
      system: MENTIONS_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 32000,
    });

    const result = parseJson(text);

    const { errors, warnings } = validateMentions(result, {
      knownIds,
      candidates,
      lastCue: lastCueSeconds(transcript),
    });

    if (errors.length > 0) {
      console.log('  Schema validation errors:');
      for (const err of errors) console.log(`    - ${err}`);
      return 'failed';
    }

    // A call that named no EIPs is a real outcome — ACDT is a testing call and
    // routinely has none. Write nothing rather than an empty file, and say so
    // plainly; any strong candidate the model passed over is in the warnings.
    if (result.eips.length === 0) {
      console.log(`  ${transcriptName}: no EIP mentions on this transcript — nothing to index`);
      for (const warning of warnings) console.log(`    ! ${warning}`);
      return 'empty';
    }

    sortMentions(result.eips);

    // Titles come from the corpus, never from the model — a hallucinated title
    // reads as authoritative and is exactly what the review pass has to catch.
    for (const mention of result.eips) {
      const title = titles.get(mention.eip);
      if (title) mention.title = title;
      else delete mention.title;
    }

    const ordered = {
      meeting: result.meeting,
      eips: result.eips.map(({ eip, title: t, weight, summary, moments }) => ({
        eip,
        ...(t ? { title: t } : {}),
        weight,
        summary,
        moments: moments.map(({ timestamp, context }) => ({ timestamp, context })),
      })),
    };

    writeFileSync(outputPath, JSON.stringify(ordered, null, 2) + '\n');

    if (warnings.length > 0) {
      console.log(`  ${warnings.length} warning(s) — check each before trusting the file:`);
      for (const warning of warnings) console.log(`    ! ${warning}`);
    }

    const discussed = ordered.eips.filter((e) => e.weight === 'discussed').length;
    console.log(
      `  Tokens: ${usage.input_tokens.toLocaleString()} in, ${usage.output_tokens.toLocaleString()} out | Cost: ${formatCost(cost)}`,
    );
    console.log(
      `  Saved ${outputPath.replace(ROOT + '/', '')} (${ordered.eips.length} EIPs, ${discussed} discussed)`,
    );
    return 'succeeded';
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return 'failed';
  }
}

/** `--only a,b` -> ['a', 'b']. */
function splitList(value) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Name what --limit held back; in CI, as a warning annotation on the run. */
function reportDeferred(deferred) {
  if (deferred.length === 0) return;
  const message = `--limit reached; not generated: ${deferred.join(', ')}`;
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `\n${message}`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      only: { type: 'string' },
      model: { type: 'string', short: 'm', default: LLM.model },
      force: { type: 'boolean', short: 'f', default: false },
      limit: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  if (!values.only) {
    console.log('Specify --only <type>/<date>_<number>[,...] (e.g. acde/2026-05-07_236)');
    process.exit(1);
  }

  const titles = loadEipTitles();
  if (!titles) {
    console.log(`${EIPS_JSON.replace(ROOT + '/', '')} not found — run \`npm run compile-eips\` first.`);
    console.log('Without it, bare numbers like "8047" cannot be recognized as EIPs.');
    process.exit(1);
  }

  const entries = splitList(values.only);
  const budget = { remaining: values.limit ? parseInt(values.limit, 10) : Infinity };
  const deferred = [];
  let failed = 0;
  let empty = 0;

  for (const entry of entries) {
    const meetingDir = join(ARTIFACTS_DIR, entry);

    console.log(`${entry}`);

    if (!existsSync(meetingDir)) {
      console.log(`  Directory not found: ${meetingDir}`);
      failed++;
      continue;
    }

    const transcriptFiles = findTranscriptFiles(meetingDir);
    if (transcriptFiles.length === 0) {
      // Some series (e.g. ethproofs) publish a TLDR but no transcript.
      console.log('  No transcript files found — nothing to index');
      continue;
    }

    if (values['dry-run']) {
      const knownIds = new Set(titles.keys());
      for (const { path, suffix } of transcriptFiles) {
        const chat = readOptional(join(meetingDir, `chat${suffix}.txt`));
        const candidates = extractEipCandidates(`${readFileSync(path, 'utf-8')}\n${chat ?? ''}`, knownIds);
        const outputPath = join(meetingDir, `eip_mentions${suffix}.json`);
        console.log(
          `  ${path.split('/').pop()} -> eip_mentions${suffix}.json: ${existsSync(outputPath) ? 'exists' : 'missing'}` +
            ` | ${candidates.size} candidate EIP(s)`,
        );
        // The anchors block is the whole deterministic contribution to the prompt,
        // so seeing it is what makes a dry run useful.
        console.log(formatAnchors(candidates, titles).split('\n').map((l) => `    ${l}`).join('\n'));
      }
      continue;
    }

    for (const transcriptFile of transcriptFiles) {
      const result = await extractForFile(
        entry,
        meetingDir,
        transcriptFile,
        titles,
        values.model,
        values.force,
        budget,
      );
      if (result === 'failed') failed++;
      else if (result === 'empty') empty++;
      else if (result === 'deferred') deferred.push(`${entry}${transcriptFile.suffix}`);
    }
  }

  if (empty > 0) console.log(`\n${empty} transcript(s) had no EIP mentions.`);
  reportDeferred(deferred);

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
