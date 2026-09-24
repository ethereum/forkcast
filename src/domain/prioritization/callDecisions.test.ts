import { describe, it, expect } from 'vitest';
import {
  CALL_DECISIONS,
  CALL_DECISION_KEY,
  CallDecisionMap,
  decisionForKey,
  decisionForStage,
  isFacilitatorHotkey,
  formatDecisions,
  parseDecisions,
  toggleDecision,
} from './callDecisions';

describe('decisionForKey', () => {
  it('maps each decision to a distinct key, case-insensitively', () => {
    const keys = CALL_DECISIONS.map((decision) => CALL_DECISION_KEY[decision]);
    expect(new Set(keys).size).toBe(CALL_DECISIONS.length);
    for (const decision of CALL_DECISIONS) {
      const key = CALL_DECISION_KEY[decision];
      expect(decisionForKey(key)).toBe(decision);
      expect(decisionForKey(key.toUpperCase())).toBe(decision);
    }
  });

  it('ignores the navigation keys and anything else', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Escape', 'x']) {
      expect(decisionForKey(key)).toBeNull();
    }
  });
});

describe('decisionForStage', () => {
  it('maps the two stages that name an outcome a call reaches', () => {
    expect(decisionForStage('Considered for Inclusion')).toBe('cfi');
    expect(decisionForStage('Declined for Inclusion')).toBe('dfi');
  });

  it('leaves every other stage unmarked, including where the board starts', () => {
    for (const stage of [
      'Proposed for Inclusion',
      'Scheduled for Inclusion',
      'Included',
      'Withdrawn',
      'Unknown',
    ]) {
      expect(decisionForStage(stage)).toBeNull();
    }
  });
});

describe('toggleDecision', () => {
  it('records a decision without touching the rest', () => {
    expect(toggleDecision({ 8360: 'dfi' }, 7805, 'cfi')).toEqual({ 8360: 'dfi', 7805: 'cfi' });
  });

  it('replaces a decision when the outcome changes', () => {
    expect(toggleDecision({ 8360: 'deferred' }, 8360, 'cfi')).toEqual({ 8360: 'cfi' });
  });

  it('clears a decision when the same outcome is applied again, so a misfire is undone', () => {
    expect(toggleDecision({ 8360: 'cfi' }, 8360, 'cfi')).toEqual({});
  });

  it('does not mutate the map it was given', () => {
    const before = { 8360: 'cfi' } as const;
    toggleDecision(before, 8360, 'dfi');
    expect(before).toEqual({ 8360: 'cfi' });
  });
});

describe('parseDecisions', () => {
  it('round-trips a stored map', () => {
    const decisions = { 7805: 'cfi', 8360: 'dfi' } as const;
    expect(parseDecisions(JSON.stringify(decisions))).toEqual(decisions);
  });

  it('returns an empty map for absent or unparseable storage', () => {
    expect(parseDecisions(null)).toEqual({});
    expect(parseDecisions('')).toEqual({});
    expect(parseDecisions('{ not json')).toEqual({});
    expect(parseDecisions('[1,2,3]')).toEqual({});
    expect(parseDecisions('"cfi"')).toEqual({});
  });

  it('drops entries that are not an EIP id mapped to a known decision', () => {
    const raw = JSON.stringify({ 8360: 'cfi', 7805: 'sfi', notAnEip: 'dfi', 1.5: 'cfi' });
    expect(parseDecisions(raw)).toEqual({ 8360: 'cfi' });
  });
});

describe('formatDecisions', () => {
  const titles: Record<number, string> = {
    8360: 'TCREATE Opcode',
    7805: 'FOCIL',
    8015: 'Remove deposit',
  };
  const format = (decisions: CallDecisionMap) => formatDecisions(decisions, (id) => titles[id]);

  it('groups by outcome, most positive first, and orders by EIP inside a group', () => {
    expect(format({ 8360: 'cfi', 7805: 'dfi', 8015: 'cfi' })).toBe(
      ['CFI', '- EIP-8015: Remove deposit', '- EIP-8360: TCREATE Opcode', '', 'DFI', '- EIP-7805: FOCIL', ''].join(
        '\n'
      )
    );
  });

  it('omits an outcome nobody reached rather than printing an empty heading', () => {
    expect(format({ 7805: 'deferred' })).not.toMatch(/CFI|DFI/);
  });

  it('is empty when nothing was decided', () => {
    expect(format({})).toBe('');
  });

  it('still names an EIP whose title is unknown', () => {
    expect(formatDecisions({ 9999: 'deferred' }, () => undefined)).toContain(
      '- EIP-9999: Untitled'
    );
  });
});

describe('isFacilitatorHotkey', () => {
  const press = (key: string, modifiers: Partial<KeyboardEvent> = {}) => ({
    key,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    ...modifiers,
  });

  it('takes a bare f, in either case', () => {
    expect(isFacilitatorHotkey(press('f'))).toBe(true);
    expect(isFacilitatorHotkey(press('F'))).toBe(true);
  });

  it('leaves find-in-page to the browser', () => {
    expect(isFacilitatorHotkey(press('f', { metaKey: true }))).toBe(false);
    expect(isFacilitatorHotkey(press('f', { ctrlKey: true }))).toBe(false);
    expect(isFacilitatorHotkey(press('f', { altKey: true }))).toBe(false);
  });

  it('ignores every other key, the deck decision keys included', () => {
    for (const key of ['c', 'd', 'Escape', 'ArrowRight', ' ']) {
      expect(isFacilitatorHotkey(press(key))).toBe(false);
    }
  });
});
