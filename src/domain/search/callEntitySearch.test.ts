import { describe, expect, it } from 'vitest';
import type { Call } from '../../data/calls';
import { searchCallEntities } from './callEntitySearch';

const CALLS: Call[] = [
  { type: 'acde', date: '2026-07-30', number: '242', path: 'acde/242' },
  { type: 'acde', date: '2026-07-16', number: '241', path: 'acde/241' },
  { type: 'acdc', date: '2026-07-23', number: '178', path: 'acdc/178' },
  { type: 'bal', date: '2026-07-14', number: '021', path: 'bal/021' },
  {
    type: 'one-off-1954',
    date: '2026-05-06',
    number: '1954',
    path: 'one-off-1954/1954',
    name: 'Gas Repricing Workshop',
  },
];

const topPath = (query: string) => searchCallEntities(query, CALLS)[0]?.call.path;

describe('call entity search', () => {
  it.each(['acde 242', 'acde242', 'ACDE #242', '242', '2026-07-30'])(
    'ranks acde/242 first for %j',
    (query) => {
      expect(topPath(query)).toBe('acde/242');
    },
  );

  it('promotes only a series + number pair', () => {
    expect(searchCallEntities('acde 242', CALLS)[0].identity).toBe(100);
    expect(searchCallEntities('242', CALLS)[0].identity).toBe(0);
    expect(searchCallEntities('acde', CALLS)[0].identity).toBe(0);
  });

  it('finds a series by slug and by full name', () => {
    expect(searchCallEntities('acdc', CALLS).map((r) => r.call.path)).toEqual(['acdc/178']);
    expect(topPath('bal breakout')).toBe('bal/021');
  });

  it('finds one-off calls by name and labels them with it', () => {
    const [result] = searchCallEntities('gas repricing', CALLS);
    expect(result.call.path).toBe('one-off-1954/1954');
    expect(result.label).toBe('Gas Repricing Workshop');
  });

  it('labels series calls as "TYPE #number" and links to the call page', () => {
    const [result] = searchCallEntities('bal 21', CALLS);
    expect(result).toMatchObject({ label: 'BAL #21', href: '/calls/bal/021', seriesName: 'BAL Breakout' });
  });

  it('returns nothing for an empty query', () => {
    expect(searchCallEntities('   ', CALLS)).toEqual([]);
  });
});
