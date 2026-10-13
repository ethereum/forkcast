import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import schema from '../../scripts/eip-schema.json';
import type { EIP, ForkRelationship } from '../types/eip';
import { networkUpgrades } from './upgrades';

// Entries in `networkUpgrades` that EIP files can't name as a fork: the history
// card isn't a fork, and The Merge predates per-EIP tracking.
const NOT_EIP_FORKS = new Set(['previous-upgrades', 'the-merge']);

// Typed as Records so `astro check` fails if the TS unions gain or lose a value
// without these lists following. The tests below then hold the schema to them.
const STATUS_HISTORY_STATUSES: Record<ForkRelationship['statusHistory'][number]['status'], true> = {
  Proposed: true,
  Considered: true,
  Scheduled: true,
  Declined: true,
  Included: true,
  Withdrawn: true,
  Informational: true,
  Networking: true
};
const LAYERS: Record<NonNullable<EIP['layer']>, true> = { EL: true, CL: true };

const defs = schema.$defs;
const validate = new Ajv({ allErrors: true }).compile(schema);

const validEip = {
  id: 1,
  title: 'Example',
  status: 'Draft',
  description: 'Example EIP',
  author: 'Someone',
  type: 'Standards Track',
  category: 'Core',
  createdDate: '2025-01-01',
  layer: 'EL',
  reviewer: 'bot',
  forkRelationships: [
    { forkName: 'Glamsterdam', statusHistory: [{ status: 'Proposed', call: 'acde/200', date: '2025-01-01' }] }
  ]
};

describe('eip-schema.json', () => {
  it('lists exactly the upgrades in upgrades.ts as fork names', () => {
    const upgradeIds = networkUpgrades.map(u => u.id).filter(id => !NOT_EIP_FORKS.has(id));
    const forkNames = defs.ForkRelationship.properties.forkName.enum;

    // Pages match forkName to the upgrade id case-insensitively.
    expect(forkNames.map(name => name.toLowerCase())).toEqual(upgradeIds);
  });

  it('matches the statusHistory status union in src/types/eip.ts', () => {
    expect([...defs.StatusHistoryEntry.properties.status.enum].sort()).toEqual(
      Object.keys(STATUS_HISTORY_STATUSES).sort()
    );
  });

  it('matches the layer union in src/types/eip.ts', () => {
    expect([...schema.properties.layer.enum].sort()).toEqual(Object.keys(LAYERS).sort());
  });

  it('accepts a well-formed EIP', () => {
    expect(validate(validEip), JSON.stringify(validate.errors)).toBe(true);
  });

  it.each([
    ['a misspelt fork', { forkRelationships: [{ ...validEip.forkRelationships[0], forkName: 'Glamsterdm' }] }],
    ['an accented fork name', { forkRelationships: [{ ...validEip.forkRelationships[0], forkName: 'Hegotá' }] }],
    ['an unknown status', { status: 'Accepted' }],
    ['an unknown type', { type: 'Standard Track' }],
    ['an unknown category', { category: 'core' }],
    ['an unknown layer', { layer: 'Both' }],
    ['an unknown reviewer', { reviewer: 'Staff' }]
  ])('rejects %s', (_label, override) => {
    expect(validate({ ...validEip, ...override })).toBe(false);
  });
});
