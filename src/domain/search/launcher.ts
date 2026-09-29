/**
 * What global search offers before anything is typed: the pages the reader last
 * opened, then a short fixed list of places worth being one keystroke from.
 *
 * Every entry is an ordinary `GlobalResult`, so the existing result rows render
 * it and the keyboard navigation already treats it as selectable — the launcher
 * adds rows, not a second way to move through them.
 */
import type { Call } from '../../data/calls';
import { networkUpgrades } from '../../data/upgrades';
import type { EIP } from '../../types/eip';
import { toCallEntityResult } from './callEntitySearch';
import type { FlatRow, GlobalResult, SearchScope, SiteEntity } from './types';

/** The two calls the release process keeps time by. */
const JUMP_CALL_TYPES = ['acde', 'acdc'] as const;

/** Forks with decisions still open. `Live` and `Research` have nothing pending. */
const JUMP_UPGRADE_STATUSES = ['Upcoming', 'Planning'] as const;

const RECENT_LIMIT = 5;

/** Which scope chip a launcher row belongs to. Transcripts have no jump-to form. */
const RESULT_SCOPE: Record<'eip' | 'call' | 'site', Exclude<SearchScope, 'all' | 'transcripts'>> = {
  eip: 'eips',
  call: 'calls',
  site: 'site',
};

export interface LauncherInput {
  /** Most recent first, as stored by `recentSearches`. */
  recentHrefs: string[];
  calls: Call[];
  entities: SiteEntity[];
  /** Null until the EIP chunk lands; recent EIPs fill in when it does. */
  eipById: Map<number, EIP> | null;
  scope: SearchScope;
}

const trimSlash = (href: string) => (href.length > 1 ? href.replace(/\/$/, '') : href);

const siteResult = (entity: SiteEntity): GlobalResult => ({
  kind: 'site',
  entity,
  score: 0,
  identity: 0,
  href: entity.href,
});

/**
 * Turns a stored href back into a renderable row, or null when it no longer
 * points at anything — a call that was unpublished, an EIP the reader saw before
 * the chunk finished loading, a route that has since moved.
 */
function resolveHref(href: string, input: LauncherInput): GlobalResult | null {
  const path = trimSlash(href);

  const eipId = /^\/eips\/(\d+)$/.exec(path)?.[1];
  if (eipId) {
    const eip = input.eipById?.get(Number(eipId));
    return eip ? { kind: 'eip', eip, matchedFields: [], score: 0, identity: 0, href } : null;
  }

  const callPath = /^\/calls\/(.+)$/.exec(path)?.[1];
  if (callPath) {
    const call = input.calls.find((candidate) => candidate.path === callPath);
    return call ? toCallEntityResult(call) : null;
  }

  const entity = input.entities.find((candidate) => trimSlash(candidate.href) === path);
  return entity ? siteResult(entity) : null;
}

/**
 * The standing destinations: the latest call of each pace-setting series, then
 * the forks still being decided. Derived from the data rather than listed, so
 * the panel follows the process instead of needing to be kept up with it.
 */
function jumpResults(calls: Call[], entities: SiteEntity[]): GlobalResult[] {
  const latestCalls = JUMP_CALL_TYPES.flatMap((type) => {
    const latest = calls
      .filter((call) => call.type === type)
      .reduce<Call | null>((best, call) => (!best || call.date > best.date ? call : best), null);
    return latest ? [toCallEntityResult(latest)] : [];
  });

  const upgrades = JUMP_UPGRADE_STATUSES.flatMap((status) =>
    networkUpgrades
      .filter((upgrade) => !upgrade.disabled && upgrade.status === status)
      .flatMap((upgrade) => {
        const entity = entities.find(
          (candidate) => candidate.group === 'upgrades' && candidate.id === upgrade.id,
        );
        return entity ? [siteResult(entity)] : [];
      }),
  );

  return [...latestCalls, ...upgrades];
}

const pushGroup = (
  rows: FlatRow[],
  sectionId: 'recent' | 'jump',
  label: string,
  results: GlobalResult[],
) => {
  if (results.length === 0) return;
  rows.push({ type: 'header', sectionId, label, total: results.length });
  for (const result of results) rows.push({ type: 'result', sectionId, result });
};

/**
 * Returns an empty list when nothing qualifies — a fresh reader in a scope with
 * no jump-to form — which leaves the modal showing its description panel.
 */
export function buildLauncherRows(input: LauncherInput): FlatRow[] {
  const inScope = (result: GlobalResult) =>
    input.scope === 'all' ||
    (result.kind !== 'summary' && result.kind !== 'transcript' && RESULT_SCOPE[result.kind] === input.scope);

  const recent = input.recentHrefs
    .flatMap((href) => resolveHref(href, input) ?? [])
    .filter(inScope)
    .slice(0, RECENT_LIMIT);

  const alreadyListed = new Set(recent.map((result) => trimSlash(result.href)));
  const jump = jumpResults(input.calls, input.entities)
    .filter((result) => !alreadyListed.has(trimSlash(result.href)))
    .filter(inScope);

  const rows: FlatRow[] = [];
  pushGroup(rows, 'recent', 'Recent', recent);
  pushGroup(rows, 'jump', 'Jump to', jump);
  return rows;
}
