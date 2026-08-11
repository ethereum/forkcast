/**
 * Everything on the site that isn't an EIP or a call: network upgrades, devnet
 * specs, and the static pages.
 */
import { networkUpgrades } from '../../data/upgrades';
import { getAllDevnetSpecIds, getDevnetSpec } from '../../data/devnet-specs';
import { staticPageMetadata, staticPageRoutes } from '../routes/pageMetadata';
import type { SiteEntity, SiteResult } from './types';

const SCORE = {
  /** The query names the entity outright ("glamsterdam", "bal-devnet-3"). */
  exact: 100,
  title: 50,
  keyword: 30,
  description: 15,
};

const UPGRADE_SUBPAGE_PREFIX = '/upgrade/';

function upgradeEntities(): SiteEntity[] {
  // `disabled` upgrades (Dencun, Shapella, …) have no internal page — linking to
  // one would 404 in the static build.
  const upgrades: SiteEntity[] = networkUpgrades
    .filter((upgrade) => !upgrade.disabled)
    .map((upgrade) => ({
      id: upgrade.id,
      group: 'upgrades',
      title: upgrade.name,
      description: upgrade.tagline || upgrade.description,
      href: upgrade.path,
      keywords: [upgrade.id, upgrade.status, 'upgrade', 'fork'],
    }));

  const subPages: SiteEntity[] = Object.entries(staticPageRoutes)
    .filter(([key, route]) => {
      if (!route.startsWith(UPGRADE_SUBPAGE_PREFIX)) return false;
      // The upgrade landing pages are already covered by `networkUpgrades`.
      return !upgrades.some((upgrade) => upgrade.href === route) && key in staticPageMetadata;
    })
    .map(([key, route]) => {
      const meta = staticPageMetadata[key as keyof typeof staticPageMetadata];
      return {
        id: route,
        group: 'upgrades' as const,
        title: meta.title.replace(/ - Forkcast$/, ''),
        description: meta.description,
        href: route,
        keywords: route.slice(1).split('/'),
      };
    });

  return [...upgrades, ...subPages];
}

function devnetEntities(): SiteEntity[] {
  return getAllDevnetSpecIds().flatMap((id) => {
    const spec = getDevnetSpec(id);
    if (!spec) return [];
    return [
      {
        id,
        group: 'devnets' as const,
        title: spec.title || id,
        description: spec.eips.map((eip) => `EIP-${eip.number}`).join(', '),
        href: `/devnets/${id}`,
        // EIP numbers as keywords so "7928" surfaces the devnets shipping it.
        keywords: [id, ...id.split('-'), ...spec.eips.map((eip) => String(eip.number))],
      },
    ];
  });
}

function pageEntities(): SiteEntity[] {
  return Object.entries(staticPageRoutes)
    .filter(([, route]) => !route.startsWith(UPGRADE_SUBPAGE_PREFIX))
    .map(([key, route]) => {
      const meta = staticPageMetadata[key as keyof typeof staticPageMetadata];
      return {
        id: route,
        group: 'pages' as const,
        title: meta.title.replace(/ - Forkcast$/, ''),
        description: meta.description,
        href: route,
        keywords: route === '/' ? ['home'] : route.slice(1).split('/'),
      };
    });
}

export function buildSiteEntities(): SiteEntity[] {
  return [...upgradeEntities(), ...devnetEntities(), ...pageEntities()];
}

export function searchSiteEntities(query: string, entities: SiteEntity[]): SiteResult[] {
  const normalized = query.toLowerCase().trim();
  const terms = normalized.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const results: SiteResult[] = [];

  for (const entity of entities) {
    const title = entity.title.toLowerCase();
    const keywords = entity.keywords.map((keyword) => keyword.toLowerCase());
    const description = entity.description.toLowerCase();

    const isExact = normalized === entity.id.toLowerCase() || normalized === title;
    let score = isExact ? SCORE.exact : 0;

    if (!isExact) {
      if (terms.some((term) => title.includes(term))) score += SCORE.title;
      if (terms.some((term) => keywords.includes(term))) score += SCORE.keyword;
      if (terms.some((term) => description.includes(term))) score += SCORE.description;
    }

    if (score === 0) continue;
    results.push({ kind: 'site', entity, score, identity: isExact ? 100 : 0, href: entity.href });
  }

  results.sort((a, b) => b.score - a.score || a.entity.title.localeCompare(b.entity.title));
  return results;
}
