import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCallDisplayName, protocolCalls } from '../data/calls';
import { eipsData } from '../data/eips';
import { feedConfig } from '../data/feed';
import { networkUpgrades } from '../data/upgrades';
import { getRecentStageChanges } from '../domain/eips/stageChanges';
import {
  buildFeedItems,
  buildRssXml,
  type CallDecisionInput,
  type CallSummaryInput,
} from '../domain/feed/feed';

// Emitted as a static artifact during `astro build`, served at
// https://forkcast.org/feed.xml. What it may contain is controlled by the
// hand-edited config in src/data/feed.ts.
export const prerender = true;

const SITE = (import.meta.env.SITE ?? 'https://forkcast.org').replace(/\/$/, '');

interface TldrHighlight {
  highlight: string;
}

interface TldrJson {
  meeting?: string;
  highlights?: Record<string, TldrHighlight[]>;
}

interface KeyDecisionsJson {
  key_decisions?: { original_text: string; context?: string }[];
}

const artifactPath = (call: (typeof protocolCalls)[number], file: string): string =>
  join(process.cwd(), 'public', 'artifacts', call.type, `${call.date}_${call.number}`, file);

/** Loads tldr.json for the reviewed calls; a call without one is skipped. */
function loadReviewedCallSummaries(): CallSummaryInput[] {
  if (!feedConfig.callSummaries.enabled) return [];
  const reviewed = new Set(feedConfig.callSummaries.reviewedCalls);
  const summaries: CallSummaryInput[] = [];

  for (const call of protocolCalls) {
    if (!reviewed.has(call.path)) continue;
    try {
      const tldr = JSON.parse(readFileSync(artifactPath(call, 'tldr.json'), 'utf-8')) as TldrJson;
      summaries.push({
        call,
        displayName: getCallDisplayName(call),
        tldrMeeting: tldr.meeting,
        highlights: Object.values(tldr.highlights ?? {})
          .flat()
          .map((entry) => entry.highlight)
          .slice(0, 5),
      });
    } catch {
      console.warn(`feed.xml: no readable tldr.json for reviewed call ${call.path}, skipping`);
    }
  }

  return summaries;
}

/** Loads key_decisions.json for the reviewed calls; a call without one is skipped. */
function loadReviewedCallDecisions(): CallDecisionInput[] {
  if (!feedConfig.callDecisions.enabled) return [];
  const reviewed = new Set(feedConfig.callSummaries.reviewedCalls);
  const decisions: CallDecisionInput[] = [];

  for (const call of protocolCalls) {
    if (!reviewed.has(call.path)) continue;
    try {
      const parsed = JSON.parse(
        readFileSync(artifactPath(call, 'key_decisions.json'), 'utf-8'),
      ) as KeyDecisionsJson;
      decisions.push(
        ...(parsed.key_decisions ?? []).map((entry, index) => ({
          call,
          displayName: getCallDisplayName(call),
          text: entry.original_text,
          index,
          context: entry.context,
        })),
      );
    } catch {
      console.warn(`feed.xml: no readable key_decisions.json for reviewed call ${call.path}, skipping`);
    }
  }

  return decisions;
}

export const GET: APIRoute = () => {
  const items = buildFeedItems(
    feedConfig,
    {
      stageChanges: getRecentStageChanges(eipsData, feedConfig.eipStageChanges.count),
      callSummaries: loadReviewedCallSummaries(),
      callDecisions: loadReviewedCallDecisions(),
      upgrades: networkUpgrades,
    },
    SITE,
  );

  const xml = buildRssXml(
    {
      title: 'Forkcast',
      link: SITE,
      description: 'Updates on Ethereum network upgrades: EIP stage changes, protocol call summaries and decisions, and upgrade status changes.',
    },
    items,
  );

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
