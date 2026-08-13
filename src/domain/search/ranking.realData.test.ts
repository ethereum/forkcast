import { describe, expect, it } from 'vitest';
import { protocolCalls } from '../../data/calls';
import { eipsData } from '../../data/eips';
import { searchCallEntities } from './callEntitySearch';
import { EIP_ALIASES } from './eipAliases';
import { EMPTY_EIP_FILTERS, searchEips, toEipResults } from './eipSearch';
import { SECTION_SCOPE, orderSections } from './ranking';
import { buildSiteEntities, searchSiteEntities } from './siteSearch';
import type { GlobalResult, SectionId, SectionResults } from './types';

const entities = buildSiteEntities();

const topSection = (query: string) => {
  const terms = query.toLowerCase().trim().split(/\s+/);
  const eipResults = toEipResults(searchEips(query, eipsData, EMPTY_EIP_FILTERS), terms);
  const site = searchSiteEntities(query, entities);
  const sections: SectionResults[] = (
    [
      ['eips', eipResults],
      ['calls', searchCallEntities(query, protocolCalls)],
      ['upgrades', site.filter((r) => r.entity.group === 'upgrades')],
      ['networks', site.filter((r) => r.entity.group === 'networks')],
      ['pages', site.filter((r) => r.entity.group === 'pages')],
    ] as Array<[SectionId, GlobalResult[]]>
  )
    .map(([id, results]) => ({ id, results, total: results.length }))
    .filter((s) => s.results.length > 0);
  return orderSections(sections)[0]?.id;
};

describe('ranking against real data', () => {
  it.each([
    ['7702', 'eips'],
    ['acde 242', 'calls'],
    ['glamsterdam', 'upgrades'],
    ['bal-devnet-3', 'networks'],
    ['glamsterdam-devnet-7', 'networks'],
  ])('%j puts %s first', (query, expected) => {
    expect(topSection(query)).toBe(expected);
  });

  it.each(Object.entries(EIP_ALIASES))('EIP-%s ranks first for each of its aliases', (id, aliases) => {
    for (const alias of aliases) {
      const results = searchEips(alias, eipsData, EMPTY_EIP_FILTERS);
      expect(results[0]?.eip.id).toBe(Number(id));
      expect(topSection(alias)).toBe('eips');
    }
  });

  it('every site entity maps to a scope', () => {
    for (const entity of entities) {
      expect(SECTION_SCOPE[entity.group]).toBe('site');
    }
  });
});
