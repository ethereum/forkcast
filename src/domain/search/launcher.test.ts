import { describe, expect, it } from 'vitest';
import type { Call } from '../../data/calls';
import { networkUpgrades } from '../../data/upgrades';
import type { EIP } from '../../types/eip';
import { buildLauncherRows, type LauncherInput } from './launcher';
import type { FlatRow, SiteEntity } from './types';

const CALLS: Call[] = [
  { type: 'acde', date: '2026-09-24', number: '246', path: 'acde/246' },
  { type: 'acde', date: '2026-07-16', number: '241', path: 'acde/241' },
  { type: 'acdc', date: '2026-09-17', number: '187', path: 'acdc/187' },
  { type: 'bal', date: '2026-07-14', number: '021', path: 'bal/021' },
];

/** The forks the launcher is expected to offer, read from the real data so a
 *  fork shipping doesn't leave this file asserting a stale name. */
const openUpgrades = networkUpgrades.filter(
  (upgrade) => !upgrade.disabled && (upgrade.status === 'Upcoming' || upgrade.status === 'Planning'),
);

const entity = (over: Partial<SiteEntity> & Pick<SiteEntity, 'id' | 'group' | 'href'>): SiteEntity => ({
  title: over.id,
  description: '',
  keywords: [],
  ...over,
});

const ENTITIES: SiteEntity[] = [
  ...openUpgrades.map((upgrade) =>
    entity({ id: upgrade.id, group: 'upgrades', href: upgrade.path, title: upgrade.name }),
  ),
  entity({ id: '/decisions', group: 'pages', href: '/decisions', title: 'Key Decisions' }),
  entity({ id: 'hoodi', group: 'networks', href: '/networks/hoodi', title: 'Hoodi' }),
];

const EIPS = new Map<number, EIP>([[7732, { id: 7732, title: 'ePBS' } as unknown as EIP]]);

const input = (over: Partial<LauncherInput> = {}): LauncherInput => ({
  recentHrefs: [],
  calls: CALLS,
  entities: ENTITIES,
  eipById: null,
  scope: 'all',
  ...over,
});

const labels = (rows: FlatRow[]): string[] =>
  rows.flatMap((row) => (row.type === 'header' ? [row.label] : []));

const hrefsUnder = (rows: FlatRow[], sectionId: 'recent' | 'jump'): string[] =>
  rows.flatMap((row) =>
    row.type === 'result' && row.sectionId === sectionId ? [row.result.href] : [],
  );

describe('buildLauncherRows', () => {
  it('offers the latest pace-setting call of each series, then the open forks', () => {
    const rows = buildLauncherRows(input());

    expect(labels(rows)).toEqual(['Jump to']);
    expect(hrefsUnder(rows, 'jump')).toEqual([
      '/calls/acde/246',
      '/calls/acdc/187',
      ...openUpgrades.map((upgrade) => upgrade.path),
    ]);
  });

  it('lists what was opened most recently first', () => {
    const rows = buildLauncherRows(
      input({ recentHrefs: ['/networks/hoodi', '/calls/bal/021', '/decisions'] }),
    );

    expect(labels(rows)).toEqual(['Recent', 'Jump to']);
    expect(hrefsUnder(rows, 'recent')).toEqual(['/networks/hoodi', '/calls/bal/021', '/decisions']);
  });

  it('drops a recent href that no longer resolves to anything', () => {
    const rows = buildLauncherRows(
      input({ recentHrefs: ['/calls/acde/999', '/upgrade/retired', '/decisions'] }),
    );

    expect(hrefsUnder(rows, 'recent')).toEqual(['/decisions']);
  });

  it('keeps at most five recents', () => {
    const rows = buildLauncherRows(
      input({
        recentHrefs: [
          '/decisions',
          '/networks/hoodi',
          '/calls/acde/246',
          '/calls/acde/241',
          '/calls/acdc/187',
          '/calls/bal/021',
        ],
      }),
    );

    expect(hrefsUnder(rows, 'recent')).toHaveLength(5);
  });

  it('moves a destination into Recent rather than listing it under both headings', () => {
    // Stored with a trailing slash: a resolved row always carries the canonical
    // href, which is also what the dedupe compares.
    const rows = buildLauncherRows(input({ recentHrefs: ['/calls/acde/246/'] }));

    expect(hrefsUnder(rows, 'recent')).toEqual(['/calls/acde/246']);
    expect(hrefsUnder(rows, 'jump')).not.toContain('/calls/acde/246');
  });

  it('resolves a recent EIP only once the EIP chunk has landed', () => {
    expect(hrefsUnder(buildLauncherRows(input({ recentHrefs: ['/eips/7732'] })), 'recent')).toEqual([]);

    const rows = buildLauncherRows(input({ recentHrefs: ['/eips/7732'], eipById: EIPS }));
    expect(hrefsUnder(rows, 'recent')).toEqual(['/eips/7732']);
  });

  it('narrows both groups to the selected scope', () => {
    const recentHrefs = ['/eips/7732', '/calls/bal/021', '/decisions'];

    const calls = buildLauncherRows(input({ recentHrefs, eipById: EIPS, scope: 'calls' }));
    expect(hrefsUnder(calls, 'recent')).toEqual(['/calls/bal/021']);
    expect(hrefsUnder(calls, 'jump')).toEqual(['/calls/acde/246', '/calls/acdc/187']);

    const eips = buildLauncherRows(input({ recentHrefs, eipById: EIPS, scope: 'eips' }));
    expect(labels(eips)).toEqual(['Recent']);
    expect(hrefsUnder(eips, 'recent')).toEqual(['/eips/7732']);
  });

  it('has nothing to offer in the transcripts scope', () => {
    expect(
      buildLauncherRows(input({ recentHrefs: ['/decisions'], scope: 'transcripts' })),
    ).toEqual([]);
  });
});
