import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  CL_SECTION,
  EL_SECTION,
  parseAnnouncements,
  parseClientMatrix,
  parseEipTable,
  parseSameSpecAs,
  parseSpecReferences,
  parseStatusCell,
  parseTitle,
} from './scrape-devnet-spec.mjs';

// Real ethpandaops HackMD specs, saved from
// https://notes.ethereum.org/@ethpandaops/<id>/download on 2026-10-10. They pin
// the parser to the page layouts it handles today; refresh a fixture (and its
// snapshot) deliberately when a layout change is meant to be supported.
const fixture = (id) =>
  readFileSync(join(import.meta.dirname, 'fixtures/devnet-specs', `${id}.md`), 'utf8');

const parseAll = (md) => ({
  title: parseTitle(md, 'fallback'),
  sameSpecAs: parseSameSpecAs(md),
  announcements: parseAnnouncements(md),
  eips: parseEipTable(md),
  elClientSupport: parseClientMatrix(md, EL_SECTION),
  clClientSupport: parseClientMatrix(md, CL_SECTION),
  specReferences: parseSpecReferences(md),
});

const FIXTURES = [
  'bal-devnet-3',
  'glamsterdam-devnet-1',
  'glamsterdam-devnet-4',
  'glamsterdam-devnet-9',
  'blob-devnet-0',
];

describe('scrape-devnet-spec fixtures', () => {
  it.each(FIXTURES)('parses %s the same as before', (id) => {
    expect(parseAll(fixture(id))).toMatchSnapshot();
  });

  it('reads EIP rows with their status shortcodes (bal-devnet-3)', () => {
    const eips = parseEipTable(fixture('bal-devnet-3'));
    expect(eips.map((e) => [e.number, e.status])).toEqual([
      [7708, 'updated'],
      [7778, null],
      [7843, null],
      [7928, 'updated'],
      [7954, 'new'],
      [7975, 'new_optional'],
      [8024, 'updated'],
      [8037, 'new'],
      [8159, 'new_optional'],
    ]);
    expect(eips.find((e) => e.number === 7928)).toMatchObject({
      title: 'Block-Level Access Lists',
      url: expect.stringMatching(/^https:\/\/eips\.ethereum\.org\/EIPS\/eip-7928/),
    });
  });

  it('reads required EIPs and multi-EIP matrix rows (glamsterdam-devnet-4)', () => {
    const md = fixture('glamsterdam-devnet-4');
    const required = parseEipTable(md).filter((e) => e.status === 'required');
    expect(required.map((e) => e.number)).toEqual([7975, 8159]);

    const el = parseClientMatrix(md, EL_SECTION);
    expect(el.clients).toEqual(['Geth', 'Besu', 'Reth', 'Nethermind', 'Erigon', 'Nimbus-EL', 'Ethrex']);
    // A row covering several EIPs keys off the first number in its label.
    expect(el.matrix[0]).toMatchObject({
      eipNumber: 7708,
      label: '7708 / 7778 / 7843 / 7928 / 7954 / 7976 / 7981 / 8024',
    });
    expect(el.matrix.find((r) => r.eipNumber === 8037).support.Geth).toBe('in_progress');
  });

  it('maps status emoji and keeps unrecognised cells verbatim', () => {
    const cl = parseClientMatrix(fixture('bal-devnet-3'), CL_SECTION);
    expect(cl.clients).toEqual(['Lodestar', 'Lighthouse', 'Prysm']);
    expect(cl.matrix[0]).toEqual({
      eipNumber: 7928,
      label: 'EIP-7928',
      support: { Lodestar: 'supported', Lighthouse: 'supported', Prysm: 'bal-devnet-1' },
    });
  });

  it('strips emoji shortcodes from announcements', () => {
    const [first] = parseAnnouncements(fixture('bal-devnet-3'));
    expect(first).toBe('bal-devnet-3 targets to launch 08 April 2026.');
  });

  it('reads spec references from links, ignoring trailing notes', () => {
    expect(parseSpecReferences(fixture('bal-devnet-3'))).toEqual({
      consensusSpecs: {
        version: 'v1.6.1',
        url: 'https://github.com/ethereum/consensus-specs/releases/tag/v1.6.1',
      },
      executionSpecs: {
        version: 'bal@v5.6.0',
        url: 'https://github.com/ethereum/execution-spec-tests/releases/tag/bal@v5.6.0',
      },
    });
    expect(parseSpecReferences(fixture('glamsterdam-devnet-4')).executionSpecs).toBeNull();
  });

  it('detects a page that reuses another devnet spec', () => {
    const md = fixture('glamsterdam-devnet-1');
    expect(parseSameSpecAs(md)).toBe('glamsterdam-devnet-0');
    expect(parseTitle(md, 'fallback')).toBe('glamsterdam-devnet-1');
    expect(parseSameSpecAs(fixture('glamsterdam-devnet-4'))).toBeNull();
  });

  it('finds no EIP table on a page without one (blob-devnet-0)', () => {
    expect(parseEipTable(fixture('blob-devnet-0'))).toEqual([]);
  });
});

describe('parseStatusCell', () => {
  it.each([
    [':up:', 'updated'],
    ['🆙', 'updated'],
    [':new: optional', 'new_optional'],
    ['🆕', 'new'],
    ['Optional', 'optional'],
    [':exclamation: required', 'required'],
    [':exclamation:', null],
    ['', null],
  ])('%j -> %j', (cell, status) => {
    expect(parseStatusCell(cell)).toBe(status);
  });
});

describe('parseTitle', () => {
  it('drops a trailing "spec" and falls back when there is no heading', () => {
    expect(parseTitle('# foo-devnet-0 Spec\n', 'x')).toBe('foo-devnet-0');
    expect(parseTitle('no heading', 'foo-devnet-0')).toBe('foo-devnet-0');
  });
});
