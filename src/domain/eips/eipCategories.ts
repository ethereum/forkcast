import {
  EipCategory,
  PresentationSlide,
  categoryEips,
  eipCategories,
  presentationSlides,
  UNCATEGORIZED,
} from '../../data/eip-categories';

export interface CategoryGroup<T> {
  id: string;
  name: string;
  items: T[];
  /** The category's finer cuts, or empty when it declares none. */
  subgroups: Array<{ name: string; items: T[] }>;
}

interface Placement {
  category: number;
  subcategory: number;
  /** Position within the whole category, so a flat read stays in declared order. */
  position: number;
}

/** Where each EIP sits: which category, and where inside it. First listing wins. */
const buildPlacements = (categories: EipCategory[]): Map<number, Placement> => {
  const placements = new Map<number, Placement>();
  categories.forEach((category, index) => {
    let position = 0;
    const subcategories = category.subcategories ?? [{ name: category.name, eips: categoryEips(category) }];
    subcategories.forEach((subcategory, subIndex) => {
      subcategory.eips.forEach(eipId => {
        if (!placements.has(eipId)) {
          placements.set(eipId, { category: index, subcategory: subIndex, position });
        }
        position += 1;
      });
    });
  });
  return placements;
};

// Grouping happens on every render, so keep the derived index around rather
// than rebuilding it each time.
const placementCache = new WeakMap<EipCategory[], Map<number, Placement>>();

const placementsFor = (categories: EipCategory[]): Map<number, Placement> => {
  const cached = placementCache.get(categories);
  if (cached) return cached;
  const placements = buildPlacements(categories);
  placementCache.set(categories, placements);
  return placements;
};

/**
 * Split items into their categories, in the order the categories are declared,
 * and within a category in the order it lists its EIPs. Empty categories and
 * subcategories are dropped; anything uncategorized trails in a single
 * "Uncategorized" group so newly proposed EIPs still show up on the page.
 */
export function groupByCategory<T>(
  items: T[],
  eipIdOf: (item: T) => number | null | undefined,
  categories: EipCategory[] = eipCategories
): CategoryGroup<T>[] {
  const placements = placementsFor(categories);
  const placementOf = (item: T) => {
    const eipId = eipIdOf(item);
    return eipId == null ? undefined : placements.get(eipId);
  };

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

    const subgroups = (category.subcategories ?? [])
      .map((subcategory, subIndex) => ({
        name: subcategory.name,
        items: bucket.filter(item => placementOf(item)!.subcategory === subIndex),
      }))
      .filter(subgroup => subgroup.items.length > 0);

    groups.push({ id: category.id, name: category.name, items: bucket, subgroups });
  });

  if (uncategorized.length > 0) {
    groups.push({ id: 'uncategorized', name: UNCATEGORIZED, items: uncategorized, subgroups: [] });
  }

  return groups;
}

/**
 * Reorder categories into the presentation's running order. A slide drawing on
 * several categories keeps them as its subgroups, so merged content stays
 * labelled; anything the plan doesn't name trails as its own slide.
 */
export function buildSlides<T>(
  groups: CategoryGroup<T>[],
  slides: PresentationSlide[] = presentationSlides
): CategoryGroup<T>[] {
  const byId = new Map(groups.map(group => [group.id, group]));
  const planned = new Set(slides.flatMap(slide => slide.categoryIds));

  const fromPlan = slides.flatMap(slide => {
    const sources = slide.categoryIds
      .map(id => byId.get(id))
      .filter((group): group is CategoryGroup<T> => group !== undefined);
    if (sources.length === 0) return [];
    if (slide.categoryIds.length === 1) return [{ ...sources[0], name: slide.name }];
    return [
      {
        id: slide.id,
        name: slide.name,
        items: sources.flatMap(source => source.items),
        subgroups: sources.map(source => ({ name: source.name, items: source.items })),
      },
    ];
  });

  return [...fromPlan, ...groups.filter(group => !planned.has(group.id))];
}
