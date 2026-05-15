#!/usr/bin/env node
/**
 * Generate all plan artifacts for a call series in one run.
 *
 * Runs 4 extractions sequentially:
 *   1. Open action items
 *   2. Deferred decisions
 *   3. EIP discussion threads
 *   4. Agenda suggestions (uses outputs from 1 & 2)
 *
 * Usage:
 *   node scripts/generate-plan-artifacts.mjs --type acde
 *   node scripts/generate-plan-artifacts.mjs --type acdt --lookback 8
 *   node scripts/generate-plan-artifacts.mjs --type acde --dry-run
 *   node scripts/generate-plan-artifacts.mjs --type acde --only actions,deferred
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTIFACTS_DIR = join(ROOT, 'public', 'artifacts');
const EIPS_JSON = join(ROOT, 'src', 'data', 'eips.json');

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_LOOKBACK = 5;

const MODEL_PRICING = {
  'claude-opus-4-6': [15.0, 75.0],
  'claude-opus-4-5-20251101': [15.0, 75.0],
  'claude-sonnet-4-5-20250929': [3.0, 15.0],
  'claude-sonnet-4-20250514': [3.0, 15.0],
  'claude-haiku-4-5-20251001': [0.8, 4.0],
};

const CALL_TYPE_LAYER = {
  acde: 'EL',
  acdc: 'CL',
};

// ── Shared utilities ──

function calculateCost(model, usage) {
  const [inputPrice, outputPrice] = MODEL_PRICING[model] || [0.8, 4.0];
  return (
    (usage.input_tokens / 1_000_000) * inputPrice +
    (usage.output_tokens / 1_000_000) * outputPrice
  );
}

async function callAnthropic(model, systemPrompt, userMessage, maxTokens = 4096) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
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

function parseJsonResponse(response) {
  let jsonStr = response.content[0].text.trim();
  if (jsonStr.startsWith('```')) {
    const lines = jsonStr.split('\n');
    const start = lines[0].startsWith('```') ? 1 : 0;
    const end = lines[lines.length - 1].trim() === '```' ? lines.length - 1 : lines.length;
    jsonStr = lines.slice(start, end).join('\n');
  }
  return JSON.parse(jsonStr);
}

function findRecentCalls(callType, lookback) {
  const typeDir = join(ARTIFACTS_DIR, callType);
  if (!existsSync(typeDir)) return [];

  const dirs = readdirSync(typeDir)
    .filter(d => existsSync(join(typeDir, d, 'tldr.json')))
    .sort()
    .slice(-lookback);

  return dirs.map(d => ({
    dir: d,
    tldrPath: join(typeDir, d, 'tldr.json'),
    kdPath: join(typeDir, d, 'key_decisions.json'),
  }));
}

function loadCallData(recentCalls) {
  const callData = [];
  for (const call of recentCalls) {
    const tldr = JSON.parse(readFileSync(call.tldrPath, 'utf-8'));
    let keyDecisions = null;
    if (existsSync(call.kdPath)) {
      try { keyDecisions = JSON.parse(readFileSync(call.kdPath, 'utf-8')); } catch { /* ignore */ }
    }
    callData.push({ dir: call.dir, tldr, keyDecisions });
  }
  return callData;
}

function inferNextCallNumber(recentCalls) {
  let maxNum = 0;
  for (const call of recentCalls) {
    const match = call.dir.match(/_(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return maxNum + 1;
}

function logCost(label, model, usage) {
  const cost = calculateCost(model, usage);
  console.log(
    `  ${label}: ${usage.input_tokens.toLocaleString()} in, ${usage.output_tokens.toLocaleString()} out | $${cost.toFixed(4)}`,
  );
  return cost;
}

// ── Prompts ──

const PROMPTS = {
  actions: `You analyze action items across multiple Ethereum governance meeting summaries to determine which items remain open.

You receive TLDR summaries from several consecutive meetings in a series, ordered oldest to newest. Each summary contains action_items, decisions, highlights, and targets.

Your job: For each action item in the input, determine whether it was **resolved** in a later meeting or **remains open**.

## How to determine resolution

An action item is **resolved** if a later meeting shows:
- The action was explicitly completed or reported on
- A decision was made that supersedes or addresses the action
- The topic was discussed and the action is no longer needed
- A highlight or target indicates the work was done

An action item is **open** if:
- No later meeting references the topic
- Later meetings reference the topic but the action itself wasn't addressed
- The action was partially addressed but work remains

## Rules

- Only classify action items from the input — do not invent new ones.
- For resolved items, cite which meeting resolved it and briefly explain how.
- For open items, add a brief note if later meetings provide relevant context.
- If the action's deadline has clearly passed and it was never addressed, mark it open with a note.
- Be conservative: if uncertain whether an item was resolved, mark it open.

## Output

Return ONLY valid JSON (no markdown fences):

{
  "series": "<call type>",
  "generated": "<today's date YYYY-MM-DD>",
  "lookback_calls": ["<call identifier>", ...],
  "open_items": [
    {
      "action": "<verbatim action text>",
      "owner": "<owner>",
      "source_call": "<e.g. ACDE #229>",
      "source_date": "<YYYY-MM-DD>",
      "notes": "<brief context or null>"
    }
  ],
  "resolved_items": [
    {
      "action": "<verbatim action text>",
      "owner": "<owner>",
      "source_call": "<e.g. ACDE #229>",
      "source_date": "<YYYY-MM-DD>",
      "resolved_in": "<e.g. ACDE #230>",
      "resolution": "<brief explanation>"
    }
  ]
}`,

  deferred: `You analyze Ethereum governance meeting summaries to identify decisions or topics that were explicitly deferred to a future date or meeting.

You receive TLDR summaries and key decisions from several consecutive meetings, ordered oldest to newest.

Your job: Find topics where the group explicitly decided to defer, postpone, table, or revisit something later. Then check if the revisit actually happened.

## What counts as a deferral

- Explicit statements like "deferred to next call", "revisit in 2 weeks", "tabled pending breakout results"
- Decisions to delay a vote or selection to a future date
- Topics sent to breakout calls for resolution before being brought back
- "Pending" decisions awaiting external input

## What does NOT count

- Action items (those are tracked separately)
- General "we'll continue discussing this" without a specific deferral
- Topics that naturally span multiple calls without explicit postponement

## How to determine if revisited

A deferred topic is **revisited** if a later meeting made a decision on it, explicitly discussed it again, or a related decision supersedes it.

## Rules

- Extract deferrals from highlights, decisions, and targets.
- For each deferral, identify the expected revisit timing if stated.
- Be conservative: only include clear, explicit deferrals.
- If a topic was deferred and then revisited but deferred AGAIN, include both instances.

## Output

Return ONLY valid JSON (no markdown fences):

{
  "series": "<call type>",
  "generated": "<today's date YYYY-MM-DD>",
  "lookback_calls": ["<call identifier>", ...],
  "deferred": [
    {
      "topic": "<concise description>",
      "deferred_in": "<e.g. ACDE #230>",
      "deferred_date": "<YYYY-MM-DD>",
      "expected_revisit": "<e.g. 'next call', or null>",
      "revisited": true,
      "revisited_in": "<e.g. ACDE #231, or null>",
      "outcome": "<brief description, or null>"
    }
  ]
}`,

  threads: `You analyze Ethereum governance meeting summaries to compile per-EIP discussion histories.

You receive:
1. A list of in-scope EIPs (CFI/PFI/headliner candidates) with their titles and current stage
2. TLDR summaries and key decisions from several consecutive meetings

## Your job

For each in-scope EIP that was mentioned or discussed in ANY of the provided meetings, produce a discussion thread: a chronological list of per-call summaries.

## Rules

- Only include EIPs from the provided in-scope list
- Only include EIPs that were actually mentioned or discussed in at least one meeting
- Each thread entry should be 1-2 sentences summarizing what was discussed about that EIP in that call
- Look for mentions in highlights, decisions, action items, targets, and key decisions
- Include indirect references (e.g., "contract size limit" → EIP-7954)
- \`current_state\` should be a brief (1-2 sentence) summary of where things stand
- \`open_questions\` should list unresolved questions or concerns
- If an EIP was only mentioned in passing, still include it but with a brief entry
- Order threads by EIP number

## Output

Return ONLY valid JSON (no markdown fences):

{
  "series": "<call type>",
  "generated": "<today's date YYYY-MM-DD>",
  "lookback_calls": ["<call identifier>", ...],
  "eip_threads": [
    {
      "eip": 1234,
      "title": "<EIP title>",
      "fork": "<fork name>",
      "stage": "<CFI|PFI|Candidate>",
      "thread": [
        {
          "call": "<e.g. ACDE #229>",
          "date": "<YYYY-MM-DD>",
          "summary": "<1-2 sentence summary>"
        }
      ],
      "current_state": "<1-2 sentence summary>",
      "open_questions": ["<unresolved question>"]
    }
  ]
}`,

  agenda: `You are an agenda planning assistant for Ethereum AllCoreDevs governance calls. Given recent meeting summaries, open action items, and deferred decisions, generate prioritized agenda topic suggestions for the next call.

You receive:
1. TLDR summaries from the last several meetings (oldest to newest)
2. Key decisions from those meetings
3. Open action items that haven't been resolved
4. Deferred decisions that need revisiting

## Your job

Generate a prioritized list of suggested agenda topics.

## Priority guidelines

**High priority:**
- Deferred decisions with an expected revisit at this call
- Blocking issues from devnet testing
- Decisions with explicit deadlines approaching

**Medium priority:**
- Ongoing discussions that need progress
- Devnet status updates with notable changes

**Low priority:**
- Informational updates
- New proposals for initial discussion

## Rules

- Generate 5-8 suggestions, ordered by priority (high first)
- Be specific — "Hegotá headliner decision" not "discuss upgrades"
- Reference specific EIPs, devnets, and call numbers where relevant
- Don't suggest topics that were already resolved in the most recent call
- If a deferred decision's expected revisit matches the next call, always include it as high priority
- Combine related items into a single topic when sensible
- Be skeptical of open action items with passed deadlines (e.g., "publish PR by Feb 27"). These are often completed async via PRs, Discord, or other channels without being mentioned on a call. Only include them if there is evidence they are genuinely unresolved — do not assume an item is blocking just because it wasn't explicitly closed on a call.
- Focus on topics that require synchronous discussion (decisions, blockers, status checks) rather than tasks that are better handled async (PR reviews, spec updates)

## Output

Return ONLY valid JSON (no markdown fences):

{
  "series": "<call type>",
  "generated": "<today's date YYYY-MM-DD>",
  "for_call": "<e.g. ACDE #232>",
  "suggestions": [
    {
      "topic": "<concise topic title>",
      "priority": "high|medium|low",
      "rationale": "<1-2 sentence explanation>",
      "related_eips": [1234],
      "source": "<open_action_item|deferred_decision|ongoing_discussion|devnet_update|new_proposal>"
    }
  ]
}`,
};

// ── Validators ──

function validateActions(data) {
  const errors = [];
  if (!data.series) errors.push("Missing 'series'");
  if (!data.generated) errors.push("Missing 'generated'");
  if (!Array.isArray(data.open_items)) errors.push("'open_items' must be an array");
  if (!Array.isArray(data.resolved_items)) errors.push("'resolved_items' must be an array");
  if (!Array.isArray(data.lookback_calls)) errors.push("'lookback_calls' must be an array");
  for (const [listName, list] of [['open_items', data.open_items || []], ['resolved_items', data.resolved_items || []]]) {
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const prefix = `${listName}[${i}]`;
      if (!item.action) errors.push(`${prefix}: missing 'action'`);
      if (!item.owner) errors.push(`${prefix}: missing 'owner'`);
      if (!item.source_call) errors.push(`${prefix}: missing 'source_call'`);
      if (listName === 'resolved_items' && !item.resolved_in) errors.push(`${prefix}: missing 'resolved_in'`);
    }
  }
  return errors;
}

function validateDeferred(data) {
  const errors = [];
  if (!data.series) errors.push("Missing 'series'");
  if (!data.generated) errors.push("Missing 'generated'");
  if (!Array.isArray(data.deferred)) errors.push("'deferred' must be an array");
  if (!Array.isArray(data.lookback_calls)) errors.push("'lookback_calls' must be an array");
  for (let i = 0; i < (data.deferred || []).length; i++) {
    const item = data.deferred[i];
    const prefix = `deferred[${i}]`;
    if (!item.topic) errors.push(`${prefix}: missing 'topic'`);
    if (!item.deferred_in) errors.push(`${prefix}: missing 'deferred_in'`);
    if (typeof item.revisited !== 'boolean') errors.push(`${prefix}: 'revisited' must be boolean`);
  }
  return errors;
}

function validateThreads(data) {
  const errors = [];
  if (!data.series) errors.push("Missing 'series'");
  if (!data.generated) errors.push("Missing 'generated'");
  if (!Array.isArray(data.eip_threads)) errors.push("'eip_threads' must be an array");
  if (!Array.isArray(data.lookback_calls)) errors.push("'lookback_calls' must be an array");
  for (let i = 0; i < (data.eip_threads || []).length; i++) {
    const t = data.eip_threads[i];
    const prefix = `eip_threads[${i}]`;
    if (!t.eip) errors.push(`${prefix}: missing 'eip'`);
    if (!Array.isArray(t.thread)) errors.push(`${prefix}: 'thread' must be an array`);
    if (!Array.isArray(t.open_questions)) errors.push(`${prefix}: 'open_questions' must be an array`);
  }
  return errors;
}

function validateAgenda(data) {
  const errors = [];
  if (!data.series) errors.push("Missing 'series'");
  if (!data.generated) errors.push("Missing 'generated'");
  if (!data.for_call) errors.push("Missing 'for_call'");
  if (!Array.isArray(data.suggestions)) errors.push("'suggestions' must be an array");
  const validPriorities = new Set(['high', 'medium', 'low']);
  for (let i = 0; i < (data.suggestions || []).length; i++) {
    const s = data.suggestions[i];
    const prefix = `suggestions[${i}]`;
    if (!s.topic) errors.push(`${prefix}: missing 'topic'`);
    if (!s.priority || !validPriorities.has(s.priority)) errors.push(`${prefix}: invalid priority`);
    if (!Array.isArray(s.related_eips)) errors.push(`${prefix}: 'related_eips' must be an array`);
  }
  return errors;
}

// ── EIP loading ──

function loadAllEipIds() {
  if (!existsSync(EIPS_JSON)) return new Set();
  const eips = JSON.parse(readFileSync(EIPS_JSON, 'utf-8'));
  return new Set(eips.map(e => e.id));
}

function loadInScopeEips(callType) {
  if (!existsSync(EIPS_JSON)) return [];

  const eips = JSON.parse(readFileSync(EIPS_JSON, 'utf-8'));
  const layerFilter = CALL_TYPE_LAYER[callType] || null;

  const inScope = [];
  for (const eip of eips) {
    if (layerFilter && eip.layer && eip.layer !== layerFilter) continue;

    for (const fr of eip.forkRelationships || []) {
      const hasActiveStatus = fr.statusHistory?.length > 0 &&
        ['Proposed', 'Considered'].includes(fr.statusHistory[fr.statusHistory.length - 1].status);
      const isCandidate = fr.isHeadliner || fr.wasHeadlinerCandidate;

      if (hasActiveStatus || isCandidate) {
        const latestStatus = fr.statusHistory?.length > 0
          ? fr.statusHistory[fr.statusHistory.length - 1].status
          : 'Candidate';
        const stage = latestStatus === 'Considered' ? 'CFI'
          : latestStatus === 'Proposed' ? 'PFI'
          : 'Candidate';

        inScope.push({
          id: eip.id,
          title: (eip.title || '').replace(/^EIP-\d+:\s*/, ''),
          fork: fr.forkName,
          stage,
        });
        break;
      }
    }
  }

  return inScope;
}

// ── Extraction runners ──

async function extractActions(callType, callData, model, planDir, today) {
  const totalItems = callData.reduce((sum, { tldr }) => sum + (tldr.action_items || []).length, 0);
  if (totalItems === 0) {
    console.log('  Skipping: no action items found');
    return null;
  }

  const callSummaries = callData.map(({ tldr }) =>
    `## ${tldr.meeting}\n\n${JSON.stringify(tldr, null, 2)}`
  ).join('\n\n---\n\n');
  const userMessage = `## Call Series: ${callType.toUpperCase()}\n## Today: ${today}\n\n${callSummaries}`;

  const response = await callAnthropic(model, PROMPTS.actions, userMessage);
  const result = parseJsonResponse(response);
  const errors = validateActions(result);
  if (errors.length > 0) throw new Error(`Validation errors:\n  ${errors.join('\n  ')}`);

  const outputPath = join(planDir, 'open_action_items.json');
  writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
  logCost('Actions', model, response.usage);
  console.log(`  Open: ${result.open_items.length} | Resolved: ${result.resolved_items.length}`);
  return result;
}

async function extractDeferred(callType, callData, model, planDir, today) {
  const sections = callData.map(({ tldr, keyDecisions }) => {
    let section = `## ${tldr.meeting}\n\n### TLDR\n${JSON.stringify(tldr, null, 2)}`;
    if (keyDecisions) section += `\n\n### Key Decisions\n${JSON.stringify(keyDecisions, null, 2)}`;
    return section;
  }).join('\n\n---\n\n');
  const userMessage = `## Call Series: ${callType.toUpperCase()}\n## Today: ${today}\n\n${sections}`;

  const response = await callAnthropic(model, PROMPTS.deferred, userMessage);
  const result = parseJsonResponse(response);
  const errors = validateDeferred(result);
  if (errors.length > 0) throw new Error(`Validation errors:\n  ${errors.join('\n  ')}`);

  const outputPath = join(planDir, 'deferred_decisions.json');
  writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
  logCost('Deferred', model, response.usage);
  const pending = result.deferred.filter(d => !d.revisited).length;
  console.log(`  ${result.deferred.length} total (${pending} pending)`);
  return result;
}

async function extractThreads(callType, callData, model, planDir, today) {
  const inScopeEips = loadInScopeEips(callType);
  if (inScopeEips.length === 0) {
    console.log('  Skipping: no in-scope EIPs found');
    return null;
  }

  const sections = [];
  sections.push(`## Call Series: ${callType.toUpperCase()}`);
  sections.push(`## Today: ${today}`);

  const eipList = inScopeEips.map(e => `- EIP-${e.id}: ${e.title} (${e.stage}, ${e.fork})`).join('\n');
  sections.push(`\n## In-Scope EIPs\n\n${eipList}`);

  for (const { tldr, keyDecisions } of callData) {
    let section = `\n---\n\n## ${tldr.meeting}\n\n### TLDR\n${JSON.stringify(tldr, null, 2)}`;
    if (keyDecisions) section += `\n\n### Key Decisions\n${JSON.stringify(keyDecisions, null, 2)}`;
    sections.push(section);
  }

  const userMessage = sections.join('\n');
  const response = await callAnthropic(model, PROMPTS.threads, userMessage, 8192);
  const result = parseJsonResponse(response);
  const errors = validateThreads(result);
  if (errors.length > 0) throw new Error(`Validation errors:\n  ${errors.join('\n  ')}`);

  const outputPath = join(planDir, 'eip_threads.json');
  writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
  logCost('Threads', model, response.usage);
  const withQuestions = result.eip_threads.filter(t => t.open_questions.length > 0).length;
  console.log(`  ${result.eip_threads.length} EIPs with threads (${withQuestions} have open questions)`);
  return result;
}

async function extractAgenda(callType, callData, recentCalls, model, planDir, today) {
  const nextCallNum = inferNextCallNumber(recentCalls);
  const nextCallLabel = `${callType.toUpperCase()} #${nextCallNum}`;

  // Load previously generated plan artifacts
  let openActions = null;
  let deferred = null;
  const openActionsPath = join(planDir, 'open_action_items.json');
  if (existsSync(openActionsPath)) {
    try { openActions = JSON.parse(readFileSync(openActionsPath, 'utf-8')); } catch { /* ignore */ }
  }
  const deferredPath = join(planDir, 'deferred_decisions.json');
  if (existsSync(deferredPath)) {
    try { deferred = JSON.parse(readFileSync(deferredPath, 'utf-8')); } catch { /* ignore */ }
  }

  const sections = [];
  sections.push(`## Call Series: ${callType.toUpperCase()}`);
  sections.push(`## Today: ${today}`);
  sections.push(`## Next Call: ${nextCallLabel}`);

  for (const { tldr, keyDecisions } of callData) {
    let section = `\n---\n\n## ${tldr.meeting}\n\n### TLDR\n${JSON.stringify(tldr, null, 2)}`;
    if (keyDecisions) section += `\n\n### Key Decisions\n${JSON.stringify(keyDecisions, null, 2)}`;
    sections.push(section);
  }

  if (openActions) sections.push(`\n---\n\n## Open Action Items (cross-call analysis)\n\n${JSON.stringify(openActions, null, 2)}`);
  if (deferred) sections.push(`\n---\n\n## Deferred Decisions (cross-call analysis)\n\n${JSON.stringify(deferred, null, 2)}`);

  const userMessage = sections.join('\n');
  const response = await callAnthropic(model, PROMPTS.agenda, userMessage);
  const result = parseJsonResponse(response);
  const errors = validateAgenda(result);
  if (errors.length > 0) throw new Error(`Validation errors:\n  ${errors.join('\n  ')}`);

  // Strip hallucinated EIP IDs not in our dataset
  const knownEipIds = loadAllEipIds();
  let stripped = 0;
  for (const s of result.suggestions) {
    const before = s.related_eips.length;
    s.related_eips = s.related_eips.filter(id => knownEipIds.has(id));
    stripped += before - s.related_eips.length;
  }
  if (stripped > 0) console.log(`  Stripped ${stripped} unknown EIP ID(s) from related_eips`);

  const outputPath = join(planDir, 'agenda_suggestions.json');
  writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
  logCost('Agenda', model, response.usage);
  const byPriority = { high: 0, medium: 0, low: 0 };
  for (const s of result.suggestions) byPriority[s.priority]++;
  console.log(`  ${result.suggestions.length} suggestions: ${byPriority.high} high, ${byPriority.medium} medium, ${byPriority.low} low`);
  return result;
}

// ── Main ──

const ALL_STEPS = ['actions', 'deferred', 'threads', 'agenda'];

async function main() {
  const { values } = parseArgs({
    options: {
      type: { type: 'string', short: 't' },
      lookback: { type: 'string', short: 'n', default: String(DEFAULT_LOOKBACK) },
      model: { type: 'string', short: 'm', default: DEFAULT_MODEL },
      'dry-run': { type: 'boolean', default: false },
      only: { type: 'string' },
    },
  });

  if (!values.type) {
    console.log('Usage: generate-plan-artifacts.mjs --type <call_type> [--lookback N] [--model M] [--only steps] [--dry-run]');
    console.log('  --type     Call series (e.g., acde, acdc, acdt)');
    console.log('  --lookback Number of recent calls to analyze (default: 5)');
    console.log('  --only     Comma-separated steps: actions,deferred,threads,agenda');
    console.log('  --dry-run  Show what would be generated without calling the API');
    process.exit(1);
  }

  const callType = values.type;
  if (!/^[a-z]+$/.test(callType)) {
    console.log(`Invalid call type: ${callType}. Must be lowercase letters only (e.g., acde, acdc, acdt).`);
    process.exit(1);
  }
  const lookback = parseInt(values.lookback, 10);
  const model = values.model;
  const steps = values.only
    ? values.only.split(',').map(s => s.trim())
    : ALL_STEPS;

  for (const step of steps) {
    if (!ALL_STEPS.includes(step)) {
      console.log(`Unknown step: ${step}. Valid steps: ${ALL_STEPS.join(', ')}`);
      process.exit(1);
    }
  }

  const recentCalls = findRecentCalls(callType, lookback);
  if (recentCalls.length === 0) {
    console.log(`No tldr.json files found for ${callType}`);
    process.exit(0);
  }

  const callData = loadCallData(recentCalls);
  const planDir = join(ARTIFACTS_DIR, callType, 'plan');
  const today = new Date().toISOString().split('T')[0];

  console.log(`\n${callType.toUpperCase()} Plan Artifacts`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`Calls: ${callData.length} (lookback ${lookback})`);
  for (const { dir, tldr } of callData) {
    console.log(`  ${dir}: ${tldr.meeting}`);
  }
  console.log(`Steps: ${steps.join(', ')}`);
  console.log(`Model: ${model}`);
  console.log(`Output: ${planDir.replace(ROOT + '/', '')}/`);

  if (values['dry-run']) {
    console.log('\nDry run — no API calls made.');
    process.exit(0);
  }

  if (!existsSync(planDir)) {
    mkdirSync(planDir, { recursive: true });
  }

  if (steps.includes('actions')) {
    console.log('\n1/4 Open Action Items...');
    try {
      await extractActions(callType, callData, model, planDir, today);
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  if (steps.includes('deferred')) {
    console.log('\n2/4 Deferred Decisions...');
    try {
      await extractDeferred(callType, callData, model, planDir, today);
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  if (steps.includes('threads')) {
    console.log('\n3/4 EIP Threads...');
    try {
      await extractThreads(callType, callData, model, planDir, today);
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  if (steps.includes('agenda')) {
    console.log('\n4/4 Agenda Suggestions...');
    try {
      await extractAgenda(callType, callData, recentCalls, model, planDir, today);
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  console.log(`\nDone. Artifacts saved to ${planDir.replace(ROOT + '/', '')}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
