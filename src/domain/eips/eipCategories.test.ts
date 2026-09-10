import { describe, expect, it } from 'vitest';
import {
  DisplayGroup,
  EipCategory,
  categoryEips,
  displayGroups,
  eipCategories,
} from '../../data/eip-categories';
import { buildDisplayGroups, groupByCategory } from './eipCategories';
import { getRankableEips } from './rankableEips';

const categories: EipCategory[] = [
  { id: 'repricing', name: 'Repricing', eips: [8131, 8279] },
  {
    id: 'accounts',
    name: 'Accounts',
    subcategories: [
      { name: 'Frames', eips: [8141, 8250] },
      { name: 'Migration', eips: [7851] }
    ]
  },
  { id: 'evm', name: 'EVM Features', eips: [5920, 7979] }
];

const item = (id: number) => ({ id });
const names = <T>(groups: Array<{ name: string; items: T[] }>) => groups.map(g => g.name);

describe('groupByCategory', () => {
  it('groups in declared category order, not in item order', () => {
    const groups = groupByCategory(
      [item(7979), item(8131), item(5920)],
      i => i.id,
      categories
    );

    expect(names(groups)).toEqual(['Repricing', 'EVM Features']);
    expect(groups[1].items.map(i => i.id)).toEqual([5920, 7979]);
  });

  it('orders items within a category as the category lists them', () => {
    const groups = groupByCategory([item(8279), item(8131)], i => i.id, categories);

    expect(groups[0].items.map(i => i.id)).toEqual([8131, 8279]);
  });

  it('drops categories with nothing to show', () => {
    const groups = groupByCategory([item(5920)], i => i.id, categories);

    expect(names(groups)).toEqual(['EVM Features']);
  });

  it('collects unknown and missing EIPs into a trailing Uncategorized group', () => {
    const groups = groupByCategory(
      [item(9999), item(5920), { id: undefined as number | undefined }],
      i => i.id,
      categories
    );

    expect(names(groups)).toEqual(['EVM Features', 'Uncategorized']);
    expect(groups[1].items).toHaveLength(2);
  });

  it('splits a category into its subcategories, and keeps the flat read too', () => {
    const groups = groupByCategory([item(7851), item(8250), item(8141)], i => i.id, categories);

    expect(groups[0].items.map(i => i.id)).toEqual([8141, 8250, 7851]);
    expect(names(groups[0].subgroups)).toEqual(['Frames', 'Migration']);
    expect(groups[0].subgroups[0].items.map(i => i.id)).toEqual([8141, 8250]);
  });

  it('drops subcategories with nothing to show', () => {
    const groups = groupByCategory([item(7851)], i => i.id, categories);

    expect(names(groups[0].subgroups)).toEqual(['Migration']);
  });

  it('leaves subgroups empty for a category that declares no subcategories', () => {
    const groups = groupByCategory([item(5920)], i => i.id, categories);

    expect(groups[0].subgroups).toEqual([]);
  });
});

describe('buildDisplayGroups', () => {
  const groups = () => groupByCategory([item(8131), item(8141), item(7851), item(5920)], i => i.id, categories);

  it('follows the running order, not the declared order', () => {
    const order: DisplayGroup[] = [
      { id: 'a', name: 'EVM Features', categoryIds: ['evm'] },
      { id: 'b', name: 'Repricing', categoryIds: ['repricing'] },
    ];

    expect(names(buildDisplayGroups(groups(), order))).toEqual(['EVM Features', 'Repricing', 'Accounts']);
  });

  it('keeps a single-category group whole, under the listed name', () => {
    const order: DisplayGroup[] = [{ id: 'a', name: 'Accounts & Frames', categoryIds: ['accounts'] }];
    const [first] = buildDisplayGroups(groups(), order);

    expect(first.name).toBe('Accounts & Frames');
    expect(names(first.subgroups)).toEqual(['Frames', 'Migration']);
  });

  it('merges categories into one group, keeping them as its subheads', () => {
    const order: DisplayGroup[] = [
      { id: 'misc', name: 'Misc', categoryIds: ['evm', 'repricing'] },
    ];
    const [misc] = buildDisplayGroups(groups(), order);

    expect(misc.items.map(i => i.id)).toEqual([5920, 8131]);
    expect(names(misc.subgroups)).toEqual(['EVM Features', 'Repricing']);
  });

  it('skips a group whose categories are all empty', () => {
    const order: DisplayGroup[] = [
      { id: 'misc', name: 'Misc', categoryIds: ['evm', 'repricing'] },
    ];
    const groups = groupByCategory([item(7851)], i => i.id, categories);

    expect(names(buildDisplayGroups(groups, order))).toEqual(['Accounts']);
  });
});

describe('eipCategories data', () => {
  it('declares either a flat EIP list or subcategories, never both', () => {
    for (const category of eipCategories) {
      expect(
        Boolean(category.eips) !== Boolean(category.subcategories),
        `${category.name} must set exactly one of eips / subcategories`
      ).toBe(true);
    }
  });

  it('never lists the same EIP twice', () => {
    const seen = new Map<number, string>();
    for (const category of eipCategories) {
      for (const eipId of categoryEips(category)) {
        expect(seen.has(eipId), `EIP-${eipId} in both ${seen.get(eipId)} and ${category.name}`).toBe(false);
        seen.set(eipId, category.name);
      }
    }
  });

  // A renamed or dropped category would leave a display group silently empty.
  it('has a real category behind every id the running order names', () => {
    const ids = new Set(eipCategories.map(c => c.id));
    const missing = displayGroups.flatMap(g => g.categoryIds).filter(id => !ids.has(id));

    expect(missing).toEqual([]);
  });

  it('has unique category ids and names', () => {
    expect(new Set(eipCategories.map(c => c.id)).size).toBe(eipCategories.length);
    expect(new Set(eipCategories.map(c => c.name)).size).toBe(eipCategories.length);
  });

  // The rank page renders subcategories in place of their parent, so a repeated
  // name would read as two boards for the same thing.
  it('has unique subcategory names across every category', () => {
    const subNames = eipCategories.flatMap(c => (c.subcategories ?? []).map(s => s.name));
    expect(new Set(subNames).size).toBe(subNames.length);
  });

  // Uncategorized EIPs still render, so nothing on the page breaks when this
  // fails — it just means newly proposed EIPs are piling up in a nameless
  // bucket and someone needs to file them.
  it('covers every EIP on the rank page', () => {
    const categorized = new Set(eipCategories.flatMap(categoryEips));
    const missing = getRankableEips()
      .filter(eip => !categorized.has(eip.id))
      .map(eip => eip.title);

    expect(missing, `add these to src/data/eip-categories.ts:\n${missing.join('\n')}`).toEqual([]);
  });
});
