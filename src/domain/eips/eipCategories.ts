import { EipCategory, eipCategories, UNCATEGORIZED } from '../../data/eip-categories';

export interface CategoryGroup<T> {
  name: string;
  items: T[];
}

interface Placement {
  category: number;
  position: number;
}

/** Where each EIP sits: which category, and where inside it. First listing wins. */
const buildPlacements = (categories: EipCategory[]): Map<number, Placement> => {
  const placements = new Map<number, Placement>();
  categories.forEach((category, index) => {
    category.eips.forEach((eipId, position) => {
      if (!placements.has(eipId)) {
        placements.set(eipId, { category: index, position });
      }
    });
  });
  return placements;
};

/**
 * Split items into their categories, in the order the categories are declared,
 * and within a category in the order it lists its EIPs. Empty categories are
 * dropped; anything uncategorized trails in a single "Other" group so newly
 * proposed EIPs still show up on the page.
 */
export function groupByCategory<T>(
  items: T[],
  eipIdOf: (item: T) => number | null | undefined,
  categories: EipCategory[] = eipCategories
): CategoryGroup<T>[] {
  const placements = buildPlacements(categories);
  const placementOf = (item: T) => placements.get(eipIdOf(item) ?? -1);

  const buckets = new Map<number, T[]>();
  const uncategorized: T[] = [];

  for (const item of items) {
    const placement = placementOf(item);
    if (!placement) {
      uncategorized.push(item);
      continue;
    }
    const bucket = buckets.get(placement.category);
    if (bucket) {
      bucket.push(item);
    } else {
      buckets.set(placement.category, [item]);
    }
  }

  const groups: CategoryGroup<T>[] = [];
  categories.forEach((category, index) => {
    const bucket = buckets.get(index);
    if (!bucket) return;
    bucket.sort((a, b) => placementOf(a)!.position - placementOf(b)!.position);
    groups.push({ name: category.name, items: bucket });
  });

  if (uncategorized.length > 0) {
    groups.push({ name: UNCATEGORIZED, items: uncategorized });
  }

  return groups;
}
