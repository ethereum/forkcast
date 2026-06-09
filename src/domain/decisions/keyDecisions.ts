/**
 * Build-time loaders for ACD "key decisions" artifacts.
 *
 * In Phase 1 these were fetched at runtime (`fetch('/artifacts/.../key_decisions.json')`)
 * from React `useEffect`s. The artifacts are committed static files, so Phase 2 reads them
 * from disk in `.astro` frontmatter instead and renders the decisions as static HTML.
 *
 * fs-backed — import only from `.astro` frontmatter (build time), never from a client island.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { protocolCalls, type Call } from '../../data/calls';
import type { KeyDecision } from '../../types/eip';

export interface MeetingDecisions {
  call: Call;
  decisions: KeyDecision[];
}

const ACD_TYPES = ['acdc', 'acde', 'acdt'];

/** `public/artifacts/{type}/{date}_{number}/key_decisions.json`, matching the SPA fetch path. */
const artifactPath = (call: Call): string =>
  join(
    process.cwd(),
    'public',
    'artifacts',
    call.type,
    `${call.date}_${call.number}`,
    'key_decisions.json',
  );

const readDecisions = (call: Call): KeyDecision[] | null => {
  try {
    const data = JSON.parse(readFileSync(artifactPath(call), 'utf-8'));
    const decisions: KeyDecision[] | undefined = data?.key_decisions;
    return Array.isArray(decisions) && decisions.length > 0 ? decisions : null;
  } catch {
    // Missing artifact — same as a 404 on the SPA fetch: skip this call.
    return null;
  }
};

/** Every ACD meeting with recorded decisions, newest first. Mirrors `DecisionsPage`. */
export const loadAcdMeetings = (): MeetingDecisions[] =>
  protocolCalls
    .filter((call) => ACD_TYPES.includes(call.type))
    .map((call) => ({ call, decisions: readDecisions(call) }))
    .filter((m): m is MeetingDecisions => m.decisions !== null)
    .sort((a, b) => b.call.date.localeCompare(a.call.date));

/** The most recent ACD meeting with decisions. Mirrors `HomePage.fetchLatestMeetingDecisions`. */
export const loadLatestAcdMeeting = (): MeetingDecisions | null => loadAcdMeetings()[0] ?? null;
