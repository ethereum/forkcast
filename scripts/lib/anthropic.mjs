/**
 * Shared Claude API client for the LLM scripts (key decisions, call notes,
 * EIP mentions, plan artifacts).
 *
 * The SDK handles streaming and retries (408/409/429/5xx and connection errors,
 * with backoff). Streaming keeps long generations (thinking plus a 16k+ token
 * answer) clear of HTTP timeouts. Model choice and pricing live here and
 * nowhere else.
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Per-job defaults. Override the model with FORKCAST_MODEL_<JOB> and the effort
 * with FORKCAST_EFFORT_<JOB> (e.g. FORKCAST_MODEL_CALL_NOTES=claude-sonnet-5-5).
 * FORKCAST_EFFORT_<JOB>=none omits `effort`, for models that don't accept it.
 */
export const JOBS = {
  'key-decisions': { model: 'claude-opus-5-5', effort: 'low' },
  'call-notes': { model: 'claude-opus-5-5', effort: 'medium' },
  'eip-mentions': { model: 'claude-opus-5-5', effort: 'medium' },
  'plan-artifacts': { model: 'claude-sonnet-5-5', effort: 'medium' },
};

/**
 * USD per million tokens, [input, output]. Anthropic first-party API rates.
 * The scripts don't use prompt caching, so cache rates aren't modelled.
 */
export const PRICING = {
  'claude-fable-5-1': [10.0, 50.0],
  'claude-opus-5-5': [4.0, 20.0],
  'claude-opus-5': [5.0, 25.0],
  'claude-opus-4-8': [5.0, 25.0],
  'claude-opus-4-7': [5.0, 25.0],
  'claude-opus-4-6': [5.0, 25.0],
  'claude-sonnet-5-5': [2.0, 10.0],
  'claude-sonnet-5': [2.0, 10.0],
  'claude-sonnet-4-6': [3.0, 15.0],
  'claude-sonnet-4-5-20250929': [3.0, 15.0],
  // Haiku 5.5 doubles to $0.50/$2.50 past 100K input tokens; not modelled here.
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-haiku-4-5': [1.0, 5.0],
};

// Models that accept server-side refusal fallback (`fallbacks: "default"`).
const FALLBACK_MODELS = new Set(['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']);
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export function jobConfig(job, env = process.env) {
  const defaults = JOBS[job];
  if (!defaults) throw new Error(`Unknown LLM job '${job}'`);
  const key = job.toUpperCase().replace(/-/g, '_');
  const effort = env[`FORKCAST_EFFORT_${key}`] || defaults.effort;
  return {
    model: env[`FORKCAST_MODEL_${key}`] || defaults.model,
    effort: effort === 'none' ? undefined : effort,
  };
}

/** Cost in USD, or null when the model has no pricing entry. */
export function calculateCost(model, usage) {
  const price = PRICING[model];
  if (!price) return null;
  const [inputPrice, outputPrice] = price;
  return (usage.input_tokens / 1_000_000) * inputPrice + (usage.output_tokens / 1_000_000) * outputPrice;
}

export function formatCost(cost) {
  return cost === null ? '(unknown: no pricing for model)' : `$${cost.toFixed(4)}`;
}

/** Parse a JSON response, tolerating a markdown code fence around it. */
export function parseJson(text) {
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    const lines = jsonStr.split('\n');
    const end = lines[lines.length - 1].trim() === '```' ? lines.length - 1 : lines.length;
    jsonStr = lines.slice(1, end).join('\n');
  }
  return JSON.parse(jsonStr);
}

let defaultClient;

/**
 * Call the Messages API and return the concatenated text.
 *
 * Throws on truncation (stop_reason max_tokens), refusal, or any other stop
 * reason that means the answer is incomplete.
 *
 * @returns {Promise<{text: string, model: string, stopReason: string, usage: object, cost: number|null}>}
 */
export async function callClaude({ model, system, messages, max_tokens, effort, client }) {
  client ??= defaultClient ??= new Anthropic({ maxRetries: 4 });

  const params = { model, max_tokens, system, messages };
  if (effort) params.output_config = { effort };
  if (FALLBACK_MODELS.has(model)) {
    params.betas = [FALLBACK_BETA];
    params.fallbacks = 'default';
  }

  const message = await client.beta.messages.stream(params).finalMessage();

  const { stop_reason: stopReason, usage } = message;
  if (stopReason === 'max_tokens') {
    throw new Error(`Response truncated at max_tokens (${max_tokens}); raise max_tokens or lower effort`);
  }
  if (stopReason === 'refusal') {
    throw new Error(`Model refused (category: ${message.stop_details?.category ?? 'unknown'})`);
  }
  if (stopReason !== 'end_turn' && stopReason !== 'stop_sequence') {
    throw new Error(`Unexpected stop_reason '${stopReason}'`);
  }

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  if (!text.trim()) throw new Error('Response contained no text');

  if (message.model !== model) console.log(`  Note: served by ${message.model} (refusal fallback)`);

  return { text, model: message.model, stopReason, usage, cost: calculateCost(message.model, usage) };
}
