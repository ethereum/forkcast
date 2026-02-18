#!/usr/bin/env node
/**
 * Extract structured key decisions from tldr.json files.
 *
 * Calls the Anthropic API to classify decisions from meeting TLDRs
 * as stage_change, devnet_inclusion, headliner_selected, or other.
 *
 * Usage:
 *   node scripts/extract-key-decisions.mjs --only acde/2026-02-12_230
 *   node scripts/extract-key-decisions.mjs --all
 *   node scripts/extract-key-decisions.mjs --all --dry-run
 *   node scripts/extract-key-decisions.mjs --only acde/2026-02-12_230 --force
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
const EIPS_JSON = join(ROOT, 'src', 'data', 'eips.json');

const ACD_CALL_TYPES = new Set(['acdc', 'acde', 'acdt']);
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

const MODEL_PRICING = {
  'claude-opus-4-6': [15.0, 75.0],
  'claude-opus-4-5-20251101': [15.0, 75.0],
  'claude-sonnet-4-5-20250929': [3.0, 15.0],
  'claude-sonnet-4-20250514': [3.0, 15.0],
  'claude-haiku-4-5-20251001': [0.8, 4.0],
};

const EXTRACTION_PROMPT = `Classify decisions from Ethereum governance meeting summaries into structured JSON.

You receive the full TLDR (highlights, action items, decisions, targets). Classify only the items in the "decisions" array, but use the highlights and other context to inform your classification (e.g., to identify which workstream a devnet belongs to).

## Types

- **stage_change**: EIP moves to a new inclusion stage. Set \`stage_change.to\` to one of: "Considered" (CFI), "Scheduled" (SFI), "Declined" (DFI), "Included", "Withdrawn".
- **devnet_inclusion**: A specific EIP being added to or scoped into a devnet for the first time. The decision must name the EIP(s) being included. Do NOT use this type when the EIP is the defining proposal of that devnet's workstream (e.g., EIP-7732 in epbs-devnet-0) — that is tautological. Devnet timeline, launch date, spec version targeting, spec freeze, or general status updates → \`other\`. Set \`devnet\` to the full lowercase identifier with workstream prefix (e.g., "bal-devnet-3", "epbs-devnet-0"). Infer the prefix from highlight categories, meeting context, or surrounding discussion. Never output bare "devnet-N".
- **headliner_selected**: EIP selected as fork headliner. Set \`fork\` to the fork name.
- **other**: Everything else.

## Rules

- Multiple EIPs with the SAME action → one entry, all EIP numbers in \`eips\` array.
- DIFFERENT actions in one decision string → separate entries per action.
- Extract EIP numbers as integers from "EIP-1234", "EIP1234", or contextual references. Resolve well-known proposal names to their EIP numbers (e.g., FOCIL = 7805, ePBS = 7732, PeerDAS = 7594). Resolve ETH/XX aliases using the "Known Aliases" section if provided.
- \`original_text\` and \`timestamp\` must be copied verbatim from input.
- If no EIP numbers can be identified, set \`eips\` to \`[]\`.
- Rejecting a technical change *to* an EIP (not the EIP itself) → \`other\`.
- If the original text includes a brief reason or qualifier beyond the core action (e.g., "DFI'd but clients standardize independently"), extract it into \`context\` as a short phrase (e.g., "clients to standardize independently"). \`context\` must not duplicate information already captured in other fields — no fork names (use \`fork\`), no EIP numbers (use \`eips\`), no stage names (use \`stage_change\`). Omit \`context\` when there's nothing beyond the base action.
- \`original_text\`, \`timestamp\`, \`type\`, and \`eips\` are always required. Omit other fields when not applicable. Do not set fields to null.

## Output

Return ONLY valid JSON (no markdown fences):

{
  "meeting": "<from input>",
  "key_decisions": [
    {
      "original_text": "...",
      "timestamp": "...",
      "type": "stage_change|devnet_inclusion|headliner_selected|other",
      "eips": [],
      "stage_change": { "to": "..." },
      "devnet": "...",
      "fork": "...",
      "context": "..."
    }
  ]
}

Only include \`stage_change\` when type is "stage_change". Only include \`devnet\` when type is "devnet_inclusion". Only include \`fork\` when a fork name is mentioned. Only include \`context\` when meaningful additional context exists.`;

function calculateCost(model, usage) {
  const [inputPrice, outputPrice] = MODEL_PRICING[model] || [0.8, 4.0];
  return (
    (usage.input_tokens / 1_000_000) * inputPrice +
    (usage.output_tokens / 1_000_000) * outputPrice
  );
}

function loadKnownEipIds() {
  if (!existsSync(EIPS_JSON)) return new Set();
  try {
    const data = JSON.parse(readFileSync(EIPS_JSON, 'utf-8'));
    return new Set(data.filter((e) => e.id).map((e) => e.id));
  } catch {
    return new Set();
  }
}

function loadEthAliases() {
  if (!existsSync(EIPS_JSON)) return {};
  try {
    const data = JSON.parse(readFileSync(EIPS_JSON, 'utf-8'));
    const aliases = {};
    for (const eip of data) {
      const title = eip.title || '';
      for (const match of title.matchAll(/eth\/(\d+)/gi)) {
        aliases[`ETH/${match[1]}`] = eip.id;
      }
    }
    return aliases;
  } catch {
    return {};
  }
}

const VALID_TYPES = new Set([
  'stage_change',
  'devnet_inclusion',
  'headliner_selected',
  'other',
]);
const VALID_STAGES = new Set([
  'Considered',
  'Scheduled',
  'Included',
  'Declined',
  'Withdrawn',
]);

function validateSchema(data) {
  const errors = [];

  if (!data.meeting) errors.push("Missing 'meeting' field");
  if (!data.key_decisions) {
    errors.push("Missing 'key_decisions' field");
    return errors;
  }
  if (!Array.isArray(data.key_decisions)) {
    errors.push("'key_decisions' must be an array");
    return errors;
  }

  for (let i = 0; i < data.key_decisions.length; i++) {
    const d = data.key_decisions[i];
    const prefix = `key_decisions[${i}]`;

    for (const field of ['original_text', 'timestamp', 'type']) {
      if (!(field in d)) errors.push(`${prefix}: missing required field '${field}'`);
    }

    if (!('eips' in d)) {
      errors.push(`${prefix}: missing 'eips' field`);
    } else if (!Array.isArray(d.eips)) {
      errors.push(`${prefix}: 'eips' must be an array`);
    }

    if (d.type && !VALID_TYPES.has(d.type)) {
      errors.push(`${prefix}: invalid type '${d.type}'`);
    }

    if (d.type === 'stage_change') {
      if (!d.stage_change?.to) {
        errors.push(`${prefix}: stage_change type requires 'stage_change.to' field`);
      } else if (!VALID_STAGES.has(d.stage_change.to)) {
        errors.push(`${prefix}: invalid stage '${d.stage_change.to}'`);
      }
    }

    if (d.type === 'devnet_inclusion' && !d.devnet) {
      errors.push(`${prefix}: devnet_inclusion type should have 'devnet' field`);
    }
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
      max_tokens: 4096,
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

async function extractKeyDecisions(meetingDir, model, force) {
  const tldrPath = join(meetingDir, 'tldr.json');
  const outputPath = join(meetingDir, 'key_decisions.json');

  if (existsSync(outputPath) && !force) {
    console.log('  key_decisions.json already exists (use --force to regenerate)');
    return 'skipped';
  }

  if (!existsSync(tldrPath)) {
    console.log('  tldr.json not found');
    return 'failed';
  }

  const tldrData = JSON.parse(readFileSync(tldrPath, 'utf-8'));
  const decisions = tldrData.decisions || [];
  const meeting = tldrData.meeting || 'Unknown meeting';

  if (decisions.length === 0) {
    console.log('  No decisions in tldr.json');
    return 'failed';
  }

  // Build alias context
  const ethAliases = loadEthAliases();
  let aliasSection = '';
  if (Object.keys(ethAliases).length > 0) {
    const lines = Object.entries(ethAliases)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([alias, eipId]) => `- ${alias} = EIP-${eipId}`);
    aliasSection = `\n## Known Aliases\n\n${lines.join('\n')}\n`;
  }

  const userMessage = `## Meeting\n\n${meeting}\n${aliasSection}\n## TLDR\n\n${JSON.stringify(tldrData, null, 2)}`;

  console.log(`  Calling Claude API (${model}) with ${decisions.length} decision(s)...`);

  try {
    const response = await callAnthropic(model, EXTRACTION_PROMPT, userMessage);

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

    // Validate schema
    const errors = validateSchema(result);
    if (errors.length > 0) {
      console.log('  Schema validation errors:');
      for (const err of errors) console.log(`    - ${err}`);
      return 'failed';
    }

    // Cross-reference EIP numbers
    const knownEips = loadKnownEipIds();
    if (knownEips.size > 0) {
      for (const d of result.key_decisions || []) {
        for (const eipId of d.eips || []) {
          if (!knownEips.has(eipId)) {
            console.log(`  WARNING: EIP-${eipId} not found in eips.json`);
          }
        }
      }
    }

    writeFileSync(outputPath, JSON.stringify(result, null, 2));

    const cost = calculateCost(model, usage);
    console.log(
      `  Tokens: ${usage.input_tokens.toLocaleString()} in, ${usage.output_tokens.toLocaleString()} out | Cost: $${cost.toFixed(4)}`,
    );
    console.log(`  Saved ${outputPath.replace(ROOT + '/', '')}`);
    return 'succeeded';
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return 'failed';
  }
}

function findAllTldrDirs() {
  const entries = [];
  for (const callType of readdirSync(ARTIFACTS_DIR)) {
    if (!ACD_CALL_TYPES.has(callType)) continue;
    const typeDir = join(ARTIFACTS_DIR, callType);
    for (const callId of readdirSync(typeDir)) {
      if (existsSync(join(typeDir, callId, 'tldr.json'))) {
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

  const entries = values.only ? [values.only] : findAllTldrDirs();

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

    if (values['dry-run']) {
      const hasTldr = existsSync(join(meetingDir, 'tldr.json'));
      const hasKd = existsSync(join(meetingDir, 'key_decisions.json'));
      let decisionsCount = 0;
      if (hasTldr) {
        try {
          const data = JSON.parse(readFileSync(join(meetingDir, 'tldr.json'), 'utf-8'));
          decisionsCount = (data.decisions || []).length;
        } catch {
          // ignore
        }
      }
      console.log(
        `  tldr: ${hasTldr ? 'yes' : 'NO'}, key_decisions: ${hasKd ? 'exists' : 'missing'}, decisions: ${decisionsCount}`,
      );
      continue;
    }

    const result = await extractKeyDecisions(meetingDir, values.model, values.force);
    if (result === 'succeeded') succeeded++;
    else if (result === 'skipped') skipped++;
    else failed++;
  }

  console.log(`\nDone: ${succeeded} generated, ${skipped} skipped, ${failed} failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
