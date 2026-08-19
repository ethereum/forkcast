import type { Call } from '../../data/calls';
import type { FeedConfig, UpgradeStatusFeedEntry } from '../../data/feed';
import type { NetworkUpgrade } from '../../data/upgrades';
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

export interface CallSummaryInput {
  call: Call;
  displayName: string;
  /** The `meeting` field of the call's tldr.json, when present. */
  tldrMeeting?: string;
  /** Flattened highlight strings from the call's tldr.json. */
  highlights?: string[];
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function stageChangeToFeedItem(change: EipStageChange, site: string): FeedItem {
  const stage = change.currentStage ?? change.status;
  const fork = change.lastStageChangeFork ? ` for ${change.lastStageChangeFork}` : '';
  return {
    title: `${change.prefix}-${change.id} (${change.title}) is now ${stage}${fork}`,
    link: `${site}${change.url}`,
    guid: `${change.prefix.toLowerCase()}-${change.id}-${slugify(stage)}-${change.lastStageChange}`,
    date: change.lastStageChange,
    description: change.description || undefined,
  };
}

export function callSummaryToFeedItem(input: CallSummaryInput, site: string): FeedItem {
  const { call } = input;
  const label = input.tldrMeeting ?? `${input.displayName} #${call.number} - ${call.date}`;
  const highlights = input.highlights ?? [];
  return {
    title: `Call summary: ${label}`,
    link: `${site}/calls/${call.path}`,
    guid: `call-${slugify(call.path)}-${call.date}`,
    date: call.date,
    description: highlights.length > 0 ? highlights.join('. ') : undefined,
  };
}

export function upgradeStatusToFeedItem(
  entry: UpgradeStatusFeedEntry,
  upgrade: NetworkUpgrade | undefined,
  site: string,
): FeedItem {
  return {
    title: `${upgrade?.name ?? entry.upgradeId} is now ${entry.status}`,
    link: `${site}${upgrade?.path ?? '/upgrades'}`,
    guid: `upgrade-${slugify(entry.upgradeId)}-${slugify(entry.status)}-${entry.date}`,
    date: entry.date,
    description: upgrade?.tagline,
  };
}

/**
 * Assembles feed items from the three content types, honoring the hand-edited
 * switches in src/data/feed.ts. Call summaries additionally require the call's
 * path to be listed in reviewedCalls.
 */
export function buildFeedItems(
  config: FeedConfig,
  sources: {
    stageChanges: EipStageChange[];
    callSummaries: CallSummaryInput[];
    upgrades: NetworkUpgrade[];
  },
  site: string,
): FeedItem[] {
  const items: FeedItem[] = [];

  if (config.eipStageChanges.enabled) {
    items.push(...sources.stageChanges.map((change) => stageChangeToFeedItem(change, site)));
  }

  if (config.callSummaries.enabled) {
    const reviewed = new Set(config.callSummaries.reviewedCalls);
    items.push(
      ...sources.callSummaries
        .filter((input) => reviewed.has(input.call.path))
        .map((input) => callSummaryToFeedItem(input, site)),
    );
  }

  if (config.upgradeStatusChanges.enabled) {
    items.push(
      ...config.upgradeStatusChanges.entries.map((entry) =>
        upgradeStatusToFeedItem(
          entry,
          sources.upgrades.find((upgrade) => upgrade.id === entry.upgradeId),
          site,
        ),
      ),
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
