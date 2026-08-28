import type { TimelineEvent } from '../../data/events';
import type { FeedConfig } from '../../data/feed';
import type { EipStageChange } from '../eips/stageChanges';

export interface FeedItem {
  title: string;
  /** Absolute URL. */
  link: string;
  /** Stable across rebuilds so readers never re-date an item they have seen. */
  guid: string;
  /** YYYY-MM-DD. */
  date: string;
  description?: string;
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Title-only wording; the GUID uses the raw stage, so this is safe to reword. */
const STAGE_TITLES: Record<string, string> = {
  Networking: 'Scheduled (Networking)',
  Informational: 'Scheduled (Informational)',
};

export function stageChangeToFeedItem(change: EipStageChange, site: string): FeedItem {
  const stage = change.currentStage ?? change.status;
  const fork = change.lastStageChangeFork ? ` for ${change.lastStageChangeFork}` : '';
  return {
    title: `${change.prefix}-${change.id} (${change.title}) is now ${STAGE_TITLES[stage] ?? stage}${fork}`,
    link: `${site}${change.url}`,
    guid: `${change.prefix.toLowerCase()}-${change.id}-${slugify(stage)}-${change.lastStageChange}`,
    date: change.lastStageChange,
    description: change.description || undefined,
  };
}

/**
 * The event titles are already self-describing ("Fusaka Live on Mainnet"), and
 * `TimelineEvent` carries no prose to use as a description. Events on a network
 * that still has a page link to it; the rest fall back to the network index.
 */
export function timelineEventToFeedItem(event: TimelineEvent, site: string): FeedItem {
  return {
    title: event.title,
    link: `${site}/networks${event.networkId ? `/${event.networkId}` : ''}`,
    guid: `event-${slugify(event.title)}-${event.date}`,
    date: event.date,
  };
}

/**
 * `timelineEvents` also carries community milestones and announcements, which
 * are neither about a network nor something a reader can follow a link to.
 */
const ACTIVATION_CATEGORIES = new Set<TimelineEvent['category']>([
  'mainnet',
  'testnet',
  'devnet',
]);

/**
 * Assembles feed items from the enabled content types, honoring the hand-edited
 * switches in src/data/feed.ts.
 */
export function buildFeedItems(
  config: FeedConfig,
  sources: {
    stageChanges: EipStageChange[];
    events: TimelineEvent[];
  },
  site: string,
): FeedItem[] {
  const items: FeedItem[] = [];

  if (config.eipStageChanges.enabled) {
    items.push(...sources.stageChanges.map((change) => stageChangeToFeedItem(change, site)));
  }

  if (config.networkActivations.enabled) {
    items.push(
      ...sources.events
        .filter((event) => ACTIVATION_CATEGORIES.has(event.category))
        .map((event) => timelineEventToFeedItem(event, site)),
    );
  }

  return items.sort((a, b) => b.date.localeCompare(a.date) || a.guid.localeCompare(b.guid));
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RFC 822 date for <pubDate>. Noon UTC keeps the calendar date stable in every timezone. */
export function toRssDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toUTCString();
}

/**
 * Renders RSS 2.0. No <lastBuildDate> on purpose: the output stays byte-stable
 * across the multiple daily bot-triggered rebuilds unless the items change.
 */
export function buildRssXml(
  channel: { title: string; link: string; description: string },
  items: FeedItem[],
): string {
  const itemsXml = items
    .map((item) => {
      const description = item.description
        ? `\n      <description>${escapeXml(item.description)}</description>`
        : '';
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <pubDate>${toRssDate(item.date)}</pubDate>${description}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <atom:link href="${escapeXml(`${channel.link}/feed.xml`)}" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>
`;
}
