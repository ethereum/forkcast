#!/usr/bin/env node
/**
 * Generate detailed, topic-grouped call notes (notes.json) from call transcripts.
 *
 * Unlike tldr.json — which is optimized for triage — these notes aim to be
 * comprehensive enough to substitute for watching the call.
 *
 * Usage:
 *   node --env-file=.env scripts/generate-call-notes.mjs --only acdt/2026-07-20_088
 *   node --env-file=.env scripts/generate-call-notes.mjs --all
 *   node --env-file=.env scripts/generate-call-notes.mjs --all --dry-run
 *   node --env-file=.env scripts/generate-call-notes.mjs --only acdt/2026-07-20_088 --force
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTIFACTS_DIR = join(ROOT, 'public', 'artifacts');
const STYLE_EXAMPLE_FILE = join(__dirname, 'prompts', 'example-call-notes.md');

const ACD_CALL_TYPES = new Set(['acdc', 'acde', 'acdt']);
const DEFAULT_MODEL = 'claude-opus-4-6';

const MODEL_PRICING = {
  'claude-opus-4-6': [15.0, 75.0],
  'claude-opus-4-5-20251101': [15.0, 75.0],
  'claude-sonnet-4-5-20250929': [3.0, 15.0],
  'claude-sonnet-4-20250514': [3.0, 15.0],
  'claude-haiku-4-5-20251001': [0.8, 4.0],
};

const NOTES_PROMPT = `You write detailed notes for Ethereum core developer calls. Your reader missed the call and wants to be fully caught up without watching it — so the notes must be comprehensive, not a highlight reel.

## Structure

- Organize by topic, following the agenda order where the call followed the agenda. Merge scattered discussion of the same topic into one section.
- Headings are short noun phrases (e.g. "Devnet 8 Planning", "Fork Transition Bugs and Performance"). No verbs like "Discussion of", no numbering.
- Bodies are markdown bullet lists, max 2 levels of nesting. Each top-level bullet is a complete, self-contained point; sub-bullets add supporting detail to the bullet above them.
- Aim for 4-10 sections covering the whole call. Skip pure logistics (roll call, "can everyone hear me").

## Content

- Capture outcomes explicitly: start the bullet with "Consensus:", "Agreement:", "Decision deferred to ...", "No objections:", etc.
- Preserve numbers, percentages, client names, EIP numbers, dates, and version strings verbatim from the call. Never round or approximate them.
- Link EIPs, PRs, specs, and docs inline as markdown when a URL for them appears in the chat log or is stated in the transcript (e.g. \`[EIP-7997](https://...)\`). Do not invent URLs — only use ones present in the inputs.
- Attribute only when the attribution is the point (who owns a follow-up, who objected). Prefer client/team names over individual names.
- Do not editorialize, speculate, or add context that was not discussed on the call.

## Timestamps

- \`timestamp\` is the transcript timestamp where the section's discussion begins, in \`HH:MM:SS\` format (no milliseconds).
- Copy from the VTT cue times in the transcript. Section timestamps must be strictly increasing across the sections array.

## Output

Return ONLY valid JSON, no markdown fences, no commentary:

{
  "meeting": "<meeting title from input>",
  "sections": [
    {
      "heading": "Short Noun Phrase",
      "timestamp": "00:03:12",
      "body": "- Top-level point\\n- Another point\\n  - Supporting detail\\n"
    }
  ]
}

\`body\` is a markdown string. Escape newlines as \\n.`;

function calculateCost(model, usage) {
  const [inputPrice, outputPrice] = MODEL_PRICING[model] || [0.8, 4.0];
  return (
    (usage.input_tokens / 1_000_000) * inputPrice +
    (usage.output_tokens / 1_000_000) * outputPrice
  );
}

const TIMESTAMP_RE = /^\d{2}:\d{2}:\d{2}$/;

function timestampToSeconds(timestamp) {
  const parts = timestamp.split(':');
  if (parts.length !== 3) return 0;
  const [hours, minutes, seconds] = parts.map((p) => parseFloat(p));
  return hours * 3600 + minutes * 60 + seconds;
}

/** Latest cue end time in a VTT file, in seconds. Returns null if no cues found. */
function lastCueSeconds(vtt) {
  let last = null;
  for (const match of vtt.matchAll(/-->\s*(\d{2}:\d{2}:\d{2})(?:\.\d+)?/g)) {
    const seconds = timestampToSeconds(match[1]);
    if (last === null || seconds > last) last = seconds;
  }
  return last;
}

function validateSchema(data) {
  const errors = [];

  if (!data.meeting) errors.push("Missing 'meeting' field");
  if (!Array.isArray(data.sections)) {
    errors.push("'sections' must be an array");
    return errors;
  }
  if (data.sections.length === 0) {
    errors.push("'sections' must not be empty");
    return errors;
  }

  let previousSeconds = -1;
  for (let i = 0; i < data.sections.length; i++) {
    const section = data.sections[i];
    const prefix = `sections[${i}]`;

    if (!section.heading) errors.push(`${prefix}: missing or empty 'heading'`);
    if (!section.body) errors.push(`${prefix}: missing or empty 'body'`);

    if (!TIMESTAMP_RE.test(section.timestamp || '')) {
      errors.push(`${prefix}: 'timestamp' must match HH:MM:SS (got '${section.timestamp}')`);
      continue;
    }

    const seconds = timestampToSeconds(section.timestamp);
    if (seconds <= previousSeconds) {
      errors.push(`${prefix}: timestamp '${section.timestamp}' is not after the previous section`);
    }
    previousSeconds = seconds;
  }

  return errors;
}

async function callAnthropic(model, systemPrompt, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${body}`);
  }

  return response.json();
}

async function fetchAgenda(issueNumber) {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'forkcast-generate-call-notes',
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/ethereum/pm/issues/${issueNumber}`,
      { headers },
    );
    if (!response.ok) {
      console.log(`  WARNING: could not fetch agenda for issue #${issueNumber} (${response.status})`);
      return null;
    }
    const issue = await response.json();
    return issue.body?.trim() || null;
  } catch (e) {
    console.log(`  WARNING: could not fetch agenda for issue #${issueNumber}: ${e.message}`);
    return null;
  }
}

function readOptional(path) {
  return existsSync(path) ? readFileSync(path, 'utf-8') : null;
}

/**
 * Enumerate transcripts to summarize: the main call plus any `_${kind}` suffixed
 * bundled breakout, mirroring how tldr.json / tldr_${kind}.json are laid out.
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

async function generateNotesForFile(entry, meetingDir, transcriptFile, agenda, model, force) {
  const { path: transcriptPath, suffix } = transcriptFile;
  const outputPath = join(meetingDir, `notes${suffix}.json`);
  const transcriptName = transcriptPath.split('/').pop();

  if (existsSync(outputPath) && !force) {
    console.log(`  notes${suffix}.json already exists (use --force to regenerate)`);
    return 'skipped';
  }

  const transcript = readFileSync(transcriptPath, 'utf-8');
  const chat = readOptional(join(meetingDir, `chat${suffix}.txt`));
  const tldr = readOptional(join(meetingDir, `tldr${suffix}.json`));
  const styleExample = readFileSync(STYLE_EXAMPLE_FILE, 'utf-8');
  const title = meetingTitle(entry, suffix);

  const userMessage = `## Meeting Title

${title}

## Meeting Agenda

${agenda ?? '(Agenda not available)'}

## Style Example (structure and depth to aim for — content is from a different call)

${styleExample}

## Existing TLDR (validated topic breakdown and timestamps — anchor sections to these)

${tldr ?? '(No TLDR available)'}

## Chat Messages (source for inline links)

${chat ?? '(No chat file available)'}

## Transcript (WebVTT)

${transcript}`;

  console.log(`  ${transcriptName}: calling Claude API (${model})...`);

  try {
    const response = await callAnthropic(model, NOTES_PROMPT, userMessage);

    const usage = {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    };

    let jsonStr = response.content[0].text.trim();

    // Strip markdown code fences if present
    if (jsonStr.startsWith('```')) {
      const lines = jsonStr.split('\n');
      const start = lines[0].startsWith('```') ? 1 : 0;
      const end = lines[lines.length - 1].trim() === '```' ? lines.length - 1 : lines.length;
      jsonStr = lines.slice(start, end).join('\n');
    }

    const result = JSON.parse(jsonStr);

    const errors = validateSchema(result);
    if (errors.length > 0) {
      console.log('  Schema validation errors:');
      for (const err of errors) console.log(`    - ${err}`);
      return 'failed';
    }

    const lastCue = lastCueSeconds(transcript);
    if (lastCue !== null) {
      for (const section of result.sections) {
        if (timestampToSeconds(section.timestamp) > lastCue) {
          console.log(
            `  WARNING: section "${section.heading}" timestamp ${section.timestamp} is past the end of the transcript`,
          );
        }
      }
    }

    writeFileSync(outputPath, JSON.stringify(result, null, 2));

    const cost = calculateCost(model, usage);
    console.log(
      `  Tokens: ${usage.input_tokens.toLocaleString()} in, ${usage.output_tokens.toLocaleString()} out | Cost: $${cost.toFixed(4)}`,
    );
    console.log(`  Saved ${outputPath.replace(ROOT + '/', '')} (${result.sections.length} sections)`);
    return 'succeeded';
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return 'failed';
  }
}

function findAllTranscriptDirs() {
  const entries = [];
  for (const callType of readdirSync(ARTIFACTS_DIR)) {
    if (!ACD_CALL_TYPES.has(callType)) continue;
    const typeDir = join(ARTIFACTS_DIR, callType);
    for (const callId of readdirSync(typeDir)) {
      if (findTranscriptFiles(join(typeDir, callId)).length > 0) {
        entries.push(`${callType}/${callId}`);
      }
    }
  }
  return entries.sort();
}

async function main() {
  const { values } = parseArgs({
    options: {
      only: { type: 'string' },
      all: { type: 'boolean', default: false },
      model: { type: 'string', short: 'm', default: DEFAULT_MODEL },
      force: { type: 'boolean', short: 'f', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  if (!values.only && !values.all) {
    console.log('Specify --only <path> or --all');
    process.exit(1);
  }

  const entries = values.only ? [values.only] : findAllTranscriptDirs();

  if (entries.length === 0) {
    console.log('No entries to process.');
    process.exit(0);
  }

  console.log(`Processing ${entries.length} meeting(s) with ${values.model}\n`);

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const meetingDir = join(ARTIFACTS_DIR, entry);

    console.log(`[${i + 1}/${entries.length}] ${entry}`);

    if (!existsSync(meetingDir)) {
      console.log(`  Directory not found: ${meetingDir}`);
      failed++;
      continue;
    }

    const transcriptFiles = findTranscriptFiles(meetingDir);
    if (transcriptFiles.length === 0) {
      console.log('  No transcript files found');
      failed++;
      continue;
    }

    if (values['dry-run']) {
      const status = transcriptFiles.map(({ path, suffix }) => {
        const notesPath = join(meetingDir, `notes${suffix}.json`);
        return `${path.split('/').pop()} -> notes${suffix}.json: ${existsSync(notesPath) ? 'exists' : 'missing'}`;
      });
      console.log(`  ${status.join(', ')}`);
      continue;
    }

    const config = JSON.parse(readOptional(join(meetingDir, 'config.json')) ?? '{}');
    const agenda = config.issue ? await fetchAgenda(config.issue) : null;

    for (const transcriptFile of transcriptFiles) {
      const result = await generateNotesForFile(
        entry,
        meetingDir,
        transcriptFile,
        agenda,
        values.model,
        values.force,
      );
      if (result === 'succeeded') succeeded++;
      else if (result === 'skipped') skipped++;
      else failed++;
    }
  }

  console.log(`\nDone: ${succeeded} generated, ${skipped} skipped, ${failed} failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
