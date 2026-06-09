import { describe, it, expect } from 'vitest';
import { getTagLabel, splitTextWithEipLinks, buildEipPreview } from './decisionText';
import type { EIP, KeyDecision } from '../../types/eip';

const decision = (overrides: Partial<KeyDecision>): KeyDecision => ({
  original_text: '',
  timestamp: '0:00:00',
  type: 'other',
  eips: [],
  ...overrides,
});

describe('splitTextWithEipLinks', () => {
  it('returns the text unchanged when there are no referenced EIPs', () => {
    const parts = splitTextWithEipLinks(decision({ original_text: 'No EIPs here', eips: [] }));
    expect(parts).toEqual([{ kind: 'text', value: 'No EIPs here' }]);
  });

  it('links "EIP-XXXX" and bare "XXXX" mentions of referenced EIPs', () => {
    const parts = splitTextWithEipLinks(
      decision({ original_text: 'EIP-7702 and 7928 advance', eips: [7702, 7928] }),
    );
    expect(parts).toEqual([
      { kind: 'eip', id: 7702 },
      { kind: 'text', value: ' and ' },
      { kind: 'eip', id: 7928 },
      { kind: 'text', value: ' advance' },
    ]);
  });

  it('does not link numbers that are not referenced EIPs', () => {
    const parts = splitTextWithEipLinks(
      decision({ original_text: 'discussed 12345 details for EIP-7702', eips: [7702] }),
    );
    expect(parts).toEqual([
      { kind: 'text', value: 'discussed 12345 details for ' },
      { kind: 'eip', id: 7702 },
    ]);
  });

  it('appends referenced EIPs that never appear in the text, in parentheses', () => {
    const parts = splitTextWithEipLinks(
      decision({ original_text: 'General discussion', eips: [100, 200] }),
    );
    expect(parts).toEqual([
      { kind: 'text', value: 'General discussion' },
      { kind: 'text', value: ' (' },
      { kind: 'eip', id: 100 },
      { kind: 'text', value: ', ' },
      { kind: 'eip', id: 200 },
      { kind: 'text', value: ')' },
    ]);
  });
});

describe('getTagLabel', () => {
  it('maps stage changes to compact labels', () => {
    expect(getTagLabel(decision({ type: 'stage_change', stage_change: { to: 'Considered' } }))).toBe('CFI');
    expect(getTagLabel(decision({ type: 'stage_change', stage_change: { to: 'Scheduled' } }))).toBe('SFI');
    expect(getTagLabel(decision({ type: 'stage_change', stage_change: { to: 'Declined' } }))).toBe('DFI');
  });

  it('labels headliner and devnet decisions', () => {
    expect(getTagLabel(decision({ type: 'headliner_selected' }))).toBe('Headliner');
    expect(getTagLabel(decision({ type: 'devnet_inclusion', devnet: 'devnet-3' }))).toBe('devnet-3');
  });
});

describe('buildEipPreview', () => {
  const eip = {
    id: 7702,
    title: 'EIP-7702: Set EOA account code',
    description: 'a'.repeat(300),
    laymanDescription: 'b'.repeat(300),
    author: 'Vitalik Buterin (@vbuterin), Sam Wilson <sam@x.io>',
    layer: 'EL',
    status: '',
    type: '',
    createdDate: '',
    forkRelationships: [],
  } as unknown as EIP;

  it('strips the EIP prefix from the title and truncates the description to 250 chars', () => {
    const preview = buildEipPreview(eip);
    expect(preview.title).toBe('Set EOA account code');
    expect(preview.description).toBe('b'.repeat(250) + '...');
    expect(preview.layer).toBe('EL');
  });

  it('cleans handles and emails out of the author', () => {
    expect(buildEipPreview(eip).author).toBe('Vitalik Buterin, Sam Wilson');
  });
});
