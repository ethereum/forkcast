import type { APIRoute } from 'astro';
import { northStars, researchAreas, STRAWMAP_URL } from '../../data/research';

// Emitted as a static artifact during `astro build`, served at
// https://forkcast.org/api/research.json.
//
// /research is a prose page behind a `client:only` island, so this is the only
// way an agent reads it. Served raw: every field on a research area is
// substantive, unlike `NetworkUpgrade`, which needs a projection.
export const prerender = true;

export const GET: APIRoute = () => {
  const payload = {
    generatedAt: new Date().toISOString(),
    // Carried in the payload because a consumer of the JSON never sees the page
    // that says it, and every one of these is easy to misreport.
    disclaimer:
      'Exploratory research areas for upgrades beyond the one currently being scoped. No dates: which upgrade any of this lands in is unsettled and keeps moving. No ranking: `areas` is alphabetical. Mostly drawn from EF Protocol\'s strawmap, which is one group\'s opinionated draft rather than a roadmap the ecosystem has agreed on - agreement is stronger on what the open problems are than on which come first.',
    source: STRAWMAP_URL,
    northStars,
    count: researchAreas.length,
    areas: researchAreas,
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
