import type { APIRoute } from 'astro';
import { getCallTypeName, protocolCalls } from '../data/calls';
import { eipsData } from '../data/eips';
import { timelineEvents } from '../data/events';
import { feedConfig } from '../data/feed';
import { getStageChanges } from '../domain/eips/stageChanges';
import { buildFeedItems, buildRssXml, type CallPublished } from '../domain/feed/feed';

// Emitted as a static artifact during `astro build`, served at
// https://forkcast.org/feed.xml. What it may contain is controlled by the
// hand-edited config in src/data/feed.ts.
export const prerender = true;

const SITE = (import.meta.env.SITE ?? 'https://forkcast.org').replace(/\/$/, '');

/**
 * scripts/sync-call-assets.mjs appends to `protocolCalls` only once a call has
 * a video and a transcript or tldr, so every entry is a published call. An
 * upcoming call joins the feed on the rebuild after its sync.
 */
const publishedCalls = (): CallPublished[] =>
  protocolCalls.map((call) => ({
    path: call.path,
    seriesName: getCallTypeName(call.type),
    name: call.name,
    number: call.number,
    date: call.date,
  }));

export const GET: APIRoute = () => {
  const items = buildFeedItems(
    feedConfig,
    { stageChanges: getStageChanges(eipsData), events: timelineEvents, callsPublished: publishedCalls() },
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
