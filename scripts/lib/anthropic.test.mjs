import { describe, expect, it, vi } from 'vitest';

import { calculateCost, callClaude, formatCost, jobConfig, parseJson } from './anthropic.mjs';

/** A stand-in for the SDK client: records the params, resolves a final message. */
function mockClient({
  content = [{ type: 'text', text: '{"ok":true}' }],
  stopReason = 'end_turn',
  model = 'claude-opus-5-5',
  stopDetails = null,
} = {}) {
  const stream = vi.fn(() => ({
    finalMessage: async () => ({
      model,
      content,
      stop_reason: stopReason,
      stop_details: stopDetails,
      usage: { input_tokens: 1000, output_tokens: 500 },
    }),
  }));
  return { beta: { messages: { stream } } };
}

const base = {
  model: 'claude-opus-5-5',
  system: 'sys',
  messages: [{ role: 'user', content: 'hi' }],
  max_tokens: 1000,
};

describe('callClaude', () => {
  it('concatenates text blocks and skips thinking blocks', async () => {
    const client = mockClient({
      content: [
        { type: 'thinking', thinking: '' },
        { type: 'text', text: '{"a":' },
        { type: 'text', text: '1}' },
      ],
    });
    const result = await callClaude({ ...base, client });
    expect(result.text).toBe('{"a":1}');
    expect(result.stopReason).toBe('end_turn');
    expect(result.usage).toEqual({ input_tokens: 1000, output_tokens: 500 });
    expect(result.cost).toBeCloseTo((1000 * 4 + 500 * 20) / 1_000_000);
  });

  it('streams with effort and refusal fallback', async () => {
    const client = mockClient();
    await callClaude({ ...base, effort: 'medium', client });
    expect(client.beta.messages.stream).toHaveBeenCalledWith({
      model: 'claude-opus-5-5',
      system: 'sys',
      messages: base.messages,
      max_tokens: 1000,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  });

  it('omits fallbacks and effort for models that do not take them', async () => {
    const client = mockClient({ model: 'claude-haiku-4-5' });
    await callClaude({ ...base, model: 'claude-haiku-4-5', client });
    const [params] = client.beta.messages.stream.mock.calls[0];
    expect(params).not.toHaveProperty('betas');
    expect(params).not.toHaveProperty('fallbacks');
    expect(params).not.toHaveProperty('output_config');
  });

  it('throws on max_tokens truncation', async () => {
    const client = mockClient({ stopReason: 'max_tokens' });
    await expect(callClaude({ ...base, client })).rejects.toThrow(/truncated at max_tokens \(1000\)/);
  });

  it('throws on refusal with the category', async () => {
    const client = mockClient({
      content: [],
      stopReason: 'refusal',
      stopDetails: { type: 'refusal', category: 'cyber' },
    });
    await expect(callClaude({ ...base, client })).rejects.toThrow(/refused \(category: cyber\)/);
  });

  it('throws on other incomplete stop reasons', async () => {
    const client = mockClient({ stopReason: 'pause_turn' });
    await expect(callClaude({ ...base, client })).rejects.toThrow(/Unexpected stop_reason 'pause_turn'/);
  });

  it('throws when the response has no text', async () => {
    const client = mockClient({ content: [{ type: 'thinking', thinking: '' }] });
    await expect(callClaude({ ...base, client })).rejects.toThrow(/no text/);
  });

  it('prices a fallback-served response at the serving model', async () => {
    const client = mockClient({ model: 'claude-opus-4-8' });
    const result = await callClaude({ ...base, client });
    expect(result.model).toBe('claude-opus-4-8');
    expect(result.cost).toBeCloseTo((1000 * 5 + 500 * 25) / 1_000_000);
  });
});

describe('jobConfig', () => {
  it('returns per-job defaults', () => {
    expect(jobConfig('call-notes', {})).toEqual({ model: 'claude-opus-5-5', effort: 'medium' });
    expect(jobConfig('plan-artifacts', {}).model).toBe('claude-sonnet-5-5');
  });

  it('honours env overrides', () => {
    const env = { FORKCAST_MODEL_KEY_DECISIONS: 'claude-sonnet-5-5', FORKCAST_EFFORT_KEY_DECISIONS: 'high' };
    expect(jobConfig('key-decisions', env)).toEqual({ model: 'claude-sonnet-5-5', effort: 'high' });
    expect(jobConfig('eip-mentions', { FORKCAST_EFFORT_EIP_MENTIONS: 'none' }).effort).toBeUndefined();
  });

  it('rejects unknown jobs', () => {
    expect(() => jobConfig('nope', {})).toThrow(/Unknown LLM job/);
  });
});

describe('calculateCost', () => {
  it('prices current models per million tokens', () => {
    const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000 };
    expect(calculateCost('claude-opus-5-5', usage)).toBe(24);
    expect(calculateCost('claude-sonnet-5-5', usage)).toBe(12);
    expect(calculateCost('claude-opus-4-6', usage)).toBe(30);
  });

  it('returns null for unknown models instead of guessing', () => {
    expect(calculateCost('claude-typo', { input_tokens: 1, output_tokens: 1 })).toBeNull();
    expect(formatCost(null)).toMatch(/unknown/);
    expect(formatCost(0.12345)).toBe('$0.1235');
  });
});

describe('parseJson', () => {
  it('parses bare and fenced JSON', () => {
    expect(parseJson(' {"a":1} ')).toEqual({ a: 1 });
    expect(parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});
