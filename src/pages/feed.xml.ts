import type { APIRoute } from 'astro';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getCallDisplayName, protocolCalls } from '../data/calls';
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
 * A call is published once its synced artifact directory exists, which is
 * also what makes its page substantive. Scheduled future calls have no
 * directory yet and arrive in the feed on the rebuild after their sync.
 */
const publishedCalls = (): CallPublished[] =>
  protocolCalls
    .filter((call) =>
      existsSync(join(process.cwd(), 'public', 'artifacts', call.type, `${call.date}_${call.number}`)),
    )
    .map((call) => ({
      path: call.path,
      displayName: getCallDisplayName(call),
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
