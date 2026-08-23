import type { APIRoute } from 'astro';
import { networkUpgrades } from '../../data/upgrades';

// Emitted as a static artifact during `astro build`, served at
// https://forkcast.org/api/upgrades.json.
//
// Deliberately a projection, not the raw record. `NetworkUpgrade` mixes protocol
// facts with UI state — `disabled`, `hideProgressBar`, `macroPhaseOverride` and
// `path` describe how the card renders, and mean nothing to an outside consumer
// ("The Merge: disabled" only means it has no Forkcast page). Adding a
// substantive field to `NetworkUpgrade` means adding it here too.
export const prerender = true;

// A nav card linking out to ethereum.org's history page, not an upgrade.
const NOT_AN_UPGRADE = 'previous-upgrades';

export const GET: APIRoute = () => {
  const upgrades = networkUpgrades
    .filter((u) => u.id !== NOT_AN_UPGRADE)
    .map((u) => ({
      id: u.id,
      name: u.name,
      status: u.status,
      description: u.description,
      tagline: u.tagline,
      // Display text, not a date: "Sep 15, 2022" once shipped, but "2027" while
      // it is still a guess. Parse `projectedActivation` instead.
      activationDateLabel: u.activationDate,
      /** Forkcast's working estimate of mainnet activation, YYYY-MM-DD. Never an announced date. */
      projectedActivation: u.projectedActivation,
      activationDetails: u.activationDetails,
      metaEipLink: u.metaEipLink,
      externalLink: u.externalLink,
      highlights: u.highlights,
      clientTeamPerspectives: u.clientTeamPerspectives,
      // Only upgrades with a Forkcast page of their own are linkable.
      url: u.disabled ? undefined : u.path,
    }));

  const payload = {
    generatedAt: new Date().toISOString(),
    count: upgrades.length,
    upgrades,
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
