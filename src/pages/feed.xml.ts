import type { APIRoute } from 'astro';
import { eipsData } from '../data/eips';
import { timelineEvents } from '../data/events';
import { feedConfig } from '../data/feed';
import { getStageChanges } from '../domain/eips/stageChanges';
import { buildFeedItems, buildRssXml } from '../domain/feed/feed';

// Emitted as a static artifact during `astro build`, served at
// https://forkcast.org/feed.xml. What it may contain is controlled by the
// hand-edited config in src/data/feed.ts.
export const prerender = true;

const SITE = (import.meta.env.SITE ?? 'https://forkcast.org').replace(/\/$/, '');

export const GET: APIRoute = () => {
  const items = buildFeedItems(
    feedConfig,
    { stageChanges: getStageChanges(eipsData), events: timelineEvents },
    SITE,
  );

  const xml = buildRssXml(
    {
      title: 'Forkcast',
      link: SITE,
      description:
        'Updates on Ethereum network upgrades: EIP inclusion-stage changes and network activations.',
    },
    items,
  );

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
