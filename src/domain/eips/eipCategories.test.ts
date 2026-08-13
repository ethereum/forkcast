import { describe, expect, it } from 'vitest';
import { EipCategory, eipCategories } from '../../data/eip-categories';
import { groupByCategory } from './eipCategories';
import { getRankableEips } from './rankableEips';

const categories: EipCategory[] = [
  { id: 'repricing', name: 'Repricing', eips: [8131, 8279] },
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
});

describe('eipCategories data', () => {
  it('never lists the same EIP twice', () => {
    const seen = new Map<number, string>();
    for (const category of eipCategories) {
      for (const eipId of category.eips) {
        expect(seen.has(eipId), `EIP-${eipId} in both ${seen.get(eipId)} and ${category.name}`).toBe(false);
        seen.set(eipId, category.name);
      }
    }
  });

  it('has unique category ids and names', () => {
    expect(new Set(eipCategories.map(c => c.id)).size).toBe(eipCategories.length);
    expect(new Set(eipCategories.map(c => c.name)).size).toBe(eipCategories.length);
  });

  // Uncategorized EIPs still render, so nothing on the page breaks when this
  // fails — it just means newly proposed EIPs are piling up in a nameless
  // bucket and someone needs to file them.
  it('covers every EIP on the rank page', () => {
    const categorized = new Set(eipCategories.flatMap(c => c.eips));
    const missing = getRankableEips()
      .filter(eip => !categorized.has(eip.id))
      .map(eip => eip.title);

    expect(missing, `add these to src/data/eip-categories.ts:\n${missing.join('\n')}`).toEqual([]);
  });
});
