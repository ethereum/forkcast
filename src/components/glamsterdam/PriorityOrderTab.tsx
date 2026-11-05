import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from '../navigation';
import { eipById, eipsData } from '../../data/eips';
import { EipDrawer } from '../eip/EipDrawer';
import {
  formatPriorityOrder,
  getPriorityOrder,
  groupPairedEntries,
  priorityOrderDrift,
  sortUnrankedRows,
  unrankedLayerEntries,
  UNRANKED_SORT_DIRECTIONS,
  UNRANKED_SORT_FIELDS,
  type SortDirection,
  type PriorityLayer,
  type PriorityOrderEntry,
  type PriorityOrderGroup,
  type PriorityOrderLayer,
  type UnrankedLayer,
  type UnrankedRow,
  type UnrankedSortField,
} from '../../domain/prioritization/priorityOrder';
import { usePrioritizationData } from '../../hooks/usePrioritizationData';
import {
  devnetsForEip,
  devnetStanding,
  upcomingLabel,
  type DevnetStanding,
} from '../../domain/devnets/eipDevnets';
import { devnetSpecs } from '../../data/devnet-specs';
import { useComplexityData } from '../../domain/complexity/useComplexityData';
import { ComplexityScoreBadge } from '../ui';
import { getMaxScore, getMinScore, getScoreColor } from '../../utils/prioritization';
import {
  getInclusionStage,
  getInclusionStageSortRank,
  getLaymanTitle,
  getProposalPrefix,
  getStageAbbreviation,
  isHeadliner,
} from '../../utils/eip';
import { getInclusionStageColor } from '../../utils/colors';
import { formatDate, parseDate } from '../../utils/date';
import { abbreviateLastName } from '../../utils/names';
import type { EipAggregateStance } from '../../types/prioritization';
import type { EipComplexity } from '../../domain/complexity/types';
import type { InclusionStage } from '../../types';

interface PriorityOrderTabProps {
  fork: string;
}

const LAYER_NAMES: Record<string, string> = {
  EL: 'Execution layer',
  CL: 'Consensus layer',
};

const EMPTY = <span className="text-slate-300 dark:text-slate-600">&mdash;</span>;

/**
 * Which columns a section's table carries. The sections differ in what they can say: an
 * unranked layer has no rank to show and no STEEL assessment to point at, and the watch
 * list has neither a rank nor a layer to average over.
 */
interface SectionShape {
  /** The layer whose client ratings to average, or null where the rows have no layer. */
  layer: PriorityLayer | null;
  /** The devnet series to look each EIP up in, where the section ships on one. */
  devnetSeries?: readonly string[];
  ranked: boolean;
  steel: boolean;
  /** Whether the column headers sort. Only ever true where there is no ranking to displace. */
  sortable: boolean;
}

/**
 * Query values are user input, so anything off the known list falls back to the default.
 * Same reading as the client-stance board's, since the two tabs share a vocabulary.
 */
const readEnum = <T extends string>(value: string | null, allowed: readonly T[]): T | null =>
  allowed.includes(value as T) ? (value as T) : null;

/** Tiers are spaced far wider than any fork's devnet count, so a tier always wins. */
const DEVNET_TIER: Record<DevnetStanding['state'], number> = { running: 2e6, planned: 1e6 };

/**
 * How far along an EIP's devnet history is, as one number: on a network beats booked onto a
 * future one beats neither, and within a tier the later devnet is the further along.
 */
const devnetRank = (
  standing: DevnetStanding | null,
  series: readonly string[] | undefined
): number =>
  standing
    ? DEVNET_TIER[standing.state] +
      (series ?? []).indexOf(standing.shown.series) * 1e3 +
      standing.shown.number
    : 0;

/**
 * Rank and STEEL are the two optional columns, so the table narrows as they drop away. The
 * floor is what the fixed columns need plus a readable stub of a title: under it the table
 * scrolls inside its own box, which is how a phone gets it.
 */
const minTableWidth = (shape: SectionShape) =>
  ['min-w-[40rem]', 'min-w-[44rem]', 'min-w-[48rem]'][Number(shape.ranked) + Number(shape.steel)];

/**
 * For a watched EIP whose layer places it under no section on the page. It has no layer to
 * average over and no series to have been put on a devnet of, so those columns stay empty.
 */
const ORPHAN_WATCHING_SHAPE: SectionShape = {
  layer: null,
  ranked: false,
  steel: true,
  sortable: false,
};

/**
 * The mean rating the EIP's own layer of client teams have published, on the fork's scale.
 * One number rather than a mark per team: the queue is read down the page, and what a
 * reader is looking for here is how well supported each item is relative to its neighbours.
 */
const StanceAverage: React.FC<{
  aggregate: EipAggregateStance | undefined;
  layer: PriorityLayer;
  maxScore: number;
  minScore: number;
}> = ({ aggregate, layer, maxScore, minScore }) => {
  const score = layer === 'CL' ? aggregate?.clAverageScore : aggregate?.elAverageScore;
  const count = layer === 'CL' ? aggregate?.clStanceCount : aggregate?.elStanceCount;
  if (score === null || score === undefined) return EMPTY;

  return (
    <span
      className={`px-1.5 py-0.5 text-xs font-medium rounded tabular-nums ${getScoreColor(Math.round(score), true, maxScore)}`}
      title={`Mean ${layer} client rating: ${score.toFixed(2)} of ${maxScore}, from ${count} team${count === 1 ? '' : 's'} (scale ${minScore}–${maxScore})`}
    >
      {score.toFixed(1)}
    </span>
  );
};

/**
 * The queue client and testing teams work down, as the fork's facilitators publish it.
 *
 * A published ranking is a flat read: no sorting or filtering, because an order that can be
 * rearranged on screen is no longer the one thing everyone is reading off, and the board
 * next door already answers how each EIP got there. A layer nobody has ranked is the other
 * way round — there is no order to displace, only a list to look through — so those tables
 * sort, by one column shared across them and held in the query string so a view can be sent.
 */
const PriorityOrderTab: React.FC<PriorityOrderTabProps> = ({ fork }) => {
  const [drawerEipId, setDrawerEipId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const order = getPriorityOrder(fork);

  const sortField = readEnum(searchParams.get('sort'), UNRANKED_SORT_FIELDS) ?? 'eip';
  // Only a column pointing the unusual way is written out, so a pristine view has no params.
  const sortDirection: SortDirection =
    readEnum(searchParams.get('dir'), ['asc', 'desc'] as const) ??
    UNRANKED_SORT_DIRECTIONS[sortField];

  const toggleSort = (field: UnrankedSortField) => {
    const direction: SortDirection =
      sortField === field
        ? sortDirection === 'asc'
          ? 'desc'
          : 'asc'
        : UNRANKED_SORT_DIRECTIONS[field];

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (field === 'eip') next.delete('sort');
        else next.set('sort', field);
        if (direction === UNRANKED_SORT_DIRECTIONS[field]) next.delete('dir');
        else next.set('dir', direction);
        return next;
      },
      { replace: true }
    );
  };

  const { aggregates } = usePrioritizationData(fork);
  const { complexityMap } = useComplexityData();
  const aggregateById = useMemo(
    () => new Map(aggregates.map((aggregate) => [aggregate.eipId, aggregate])),
    [aggregates]
  );
  const maxScore = getMaxScore(fork);
  const minScore = getMinScore(fork);

  // The EIP links stay real anchors, so keep every navigating gesture — modifier clicks,
  // middle click, "open in new tab" — and only take over the plain click.
  const openDrawer = (eipId: number) => (event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setDrawerEipId(eipId);
  };

  if (!order) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No priority order has been published for this upgrade yet.
      </p>
    );
  }

  const copyOrder = () => {
    const markdown = formatPriorityOrder(
      order,
      (eipId) => {
        const eip = eipById.get(eipId);
        return eip ? getLaymanTitle(eip) : undefined;
      },
      window.location.origin,
      eipsData
    );
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const eipLink = (eipId: number, className: string) => {
    const eip = eipById.get(eipId);
    return (
      <Link
        to={`/eips/${eipId}`}
        onClick={eip ? openDrawer(eipId) : undefined}
        className={className}
      >
        {eip ? `${getProposalPrefix(eip)}-${eipId}` : `EIP-${eipId}`}
      </Link>
    );
  };

  /**
   * Title and the marks that qualify it. The facilitator's note on an entry is left to the
   * source list and the Markdown copy: down a table of twenty it reads as twenty asides of
   * differing weight rather than a queue, and it is the queue the page is for.
   *
   * `alongside` are the ids sharing a unit, whose pairing the row grouping already states,
   * so only a partner outside the unit is named.
   */
  const proposalCell = (entry: PriorityOrderEntry, alongside: readonly number[]) => {
    const eip = eipById.get(entry.eipId);
    const title = eip ? getLaymanTitle(eip) : `EIP-${entry.eipId}`;
    const partners = (entry.pairedWith ?? []).filter((id) => !alongside.includes(id));

    return (
      <>
        <div className="flex items-center gap-x-2">
          {/* `min-w-0` so the title gives way to the badges rather than pushing them out. */}
          <Link
            to={`/eips/${entry.eipId}`}
            onClick={eip ? openDrawer(entry.eipId) : undefined}
            title={title}
            className="min-w-0 truncate text-sm text-slate-900 hover:text-purple-600 dark:text-slate-100 dark:hover:text-purple-400 transition-colors"
          >
            {title}
          </Link>
          {eip && isHeadliner(eip, order.fork) && (
            <span
              className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
              title="Selected headliner"
            >
              Headliner
            </span>
          )}
          {entry.tag && (
            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {entry.tag}
            </span>
          )}
        </div>

        {partners.length > 0 && (
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Reviewed with{' '}
            {partners.map((partnerId, index) => (
              <React.Fragment key={partnerId}>
                {index > 0 && ', '}
                {eipLink(
                  partnerId,
                  'underline decoration-1 underline-offset-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors'
                )}
              </React.Fragment>
            ))}
            .
          </p>
        )}
      </>
    );
  };

  /**
   * Who to ask about this EIP. Scoped to the fork, since championship can change between
   * them. Surnames are shortened to an initial so two champions still fit on one line; the
   * full name is on the hover, alongside the handle to reach them on.
   */
  const championCell = (entry: PriorityOrderEntry) => {
    const relationship = eipById
      .get(entry.eipId)
      ?.forkRelationships.find((item) => item.forkName.toLowerCase() === order.fork.toLowerCase());
    const champions = (relationship?.champions ?? []).filter((champion) => champion.name);
    if (champions.length === 0) return EMPTY;

    return (
      <span className="text-xs text-slate-600 dark:text-slate-300">
        {champions.map((champion, index) => {
          const handle = champion.discord ?? champion.telegram ?? champion.email;
          return (
            <React.Fragment key={champion.name}>
              {index > 0 && <>,&nbsp;</>}
              <span title={handle ? `${champion.name} (${handle})` : champion.name}>
                {abbreviateLastName(champion.name)}
              </span>
            </React.Fragment>
          );
        })}
      </span>
    );
  };

  /**
   * Whether the EIP is already on a network. The badge names the devnet it claims that of,
   * so a solid "devnet-1" means live there, while a dashed badge is a devnet still to come
   * — the same mark the STEEL badge uses for an assessment that is not final.
   */
  const devnetCell = (entry: PriorityOrderEntry, devnetSeries: readonly string[] | undefined) => {
    if (!devnetSeries?.length) return EMPTY;
    const appearances = devnetsForEip(entry.eipId, devnetSeries, devnetSpecs);
    const standing = devnetStanding(appearances);
    if (!standing) return EMPTY;

    const history = appearances
      .map((item) => `${item.id}${item.status ? ` (${item.status})` : ''}`)
      .join(', ');
    const summary =
      standing.state === 'running'
        ? `Running in ${standing.shown.id}${standing.upcoming ? `, and planned for ${standing.upcoming.id}` : ''}.`
        : `Planned for ${standing.shown.id}, which has not launched.`;

    const badge = (text: string, to: string, title: string, solid: boolean) => (
      <Link
        key={to}
        to={to}
        className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
          solid
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
            : 'text-slate-600 outline outline-1 outline-dashed outline-slate-400 hover:bg-slate-100 dark:text-slate-300 dark:outline-slate-500 dark:hover:bg-slate-700'
        }`}
        title={title}
      >
        {text}
      </Link>
    );

    return (
      <span className="inline-flex items-center gap-1">
        {badge(
          standing.shown.label,
          `/networks/${standing.shown.id}`,
          `${summary} In ${history}.`,
          standing.state === 'running'
        )}
        {standing.upcoming &&
          badge(
            upcomingLabel(standing)!,
            `/networks/${standing.upcoming.id}`,
            `Also planned for ${standing.upcoming.id}, which has not launched.`,
            false
          )}
      </span>
    );
  };

  const stageCell = (entry: PriorityOrderEntry) => {
    const eip = eipById.get(entry.eipId);
    const stage = eip ? getInclusionStage(eip, order.fork) : 'Unknown';
    return (
      <span
        className={`px-1.5 py-0.5 text-[10px] rounded ${getInclusionStageColor(stage as InclusionStage)}`}
        title={stage}
      >
        {getStageAbbreviation(stage)}
      </span>
    );
  };

  /** A pending assessment opens its pull request, where the review is; a merged one, the file. */
  const steelCell = (complexity: EipComplexity | undefined) => {
    if (!complexity) return EMPTY;
    const href = complexity.pullRequest?.url ?? complexity.assessmentUrl;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500 transition-opacity"
        title={
          complexity.pullRequest
            ? `Open pull request #${complexity.pullRequest.number} in the STEEL repository`
            : 'Open the STEEL assessment file'
        }
      >
        <ComplexityScoreBadge complexity={complexity} />
      </a>
    );
  };

  /**
   * One row per EIP, with a pair's rank cell spanning its members so the unit reads as one
   * block without repeating anything. Row borders sit on the first row of each unit only.
   */
  const renderRows = (groups: PriorityOrderGroup[], shape: SectionShape) =>
    groups.map((group) => {
      const memberIds = group.entries.map((entry) => entry.eipId);
      const paired = group.entries.length > 1;

      return group.entries.map((entry, index) => (
        <tr
          key={entry.eipId}
          className={index === 0 ? 'border-t border-slate-200 dark:border-slate-700' : ''}
        >
          {shape.ranked && index === 0 && (
            <td
              rowSpan={group.entries.length}
              className="align-top py-3 pl-4 pr-2 text-sm font-mono tabular-nums whitespace-nowrap text-slate-500 dark:text-slate-300"
            >
              {paired ? `${group.fromRank}–${group.toRank}` : group.fromRank}
              {paired && (
                <span className="mt-0.5 block text-[10px] font-sans font-medium uppercase tracking-wide text-slate-400 dark:text-slate-400">
                  together
                </span>
              )}
            </td>
          )}
          <td
            className={`align-top py-3 pr-3 text-sm font-mono whitespace-nowrap${shape.ranked ? '' : ' pl-4'}`}
          >
            {eipLink(
              entry.eipId,
              'text-slate-500 hover:text-purple-600 dark:text-slate-300 dark:hover:text-purple-400 transition-colors'
            )}
          </td>
          <td className="align-top py-3 pr-3">{proposalCell(entry, memberIds)}</td>
          <td className="align-top py-3 pr-3">{championCell(entry)}</td>
          <td className="align-top py-3 pr-3 whitespace-nowrap">{stageCell(entry)}</td>
          <td className="align-top py-3 pr-3 whitespace-nowrap">
            {devnetCell(entry, shape.devnetSeries)}
          </td>
          <td
            className={`align-top py-3 text-right whitespace-nowrap${shape.steel ? ' pr-3' : ' pr-4'}`}
          >
            {shape.layer ? (
              <StanceAverage
                aggregate={aggregateById.get(entry.eipId)}
                layer={shape.layer}
                maxScore={maxScore}
                minScore={minScore}
              />
            ) : (
              EMPTY
            )}
          </td>
          {shape.steel && (
            <td className="align-top py-3 pr-4 whitespace-nowrap">
              {steelCell(complexityMap.get(entry.eipId))}
            </td>
          )}
        </tr>
      ));
    });

  /** A caret that points the way the column is pointing, or sits grey on a column that isn't. */
  const SortCaret = ({ field }: { field: UnrankedSortField }) => {
    if (sortField !== field) {
      return (
        <svg
          className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      );
    }
    return (
      <svg
        className="w-3 h-3 shrink-0 text-purple-600 dark:text-purple-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
        />
      </svg>
    );
  };

  /** The header's text on a section that doesn't sort, and the button that sorts it on one that does. */
  const headerLabel = (shape: SectionShape, field: UnrankedSortField, label: string) =>
    shape.sortable ? (
      <button
        type="button"
        onClick={() => toggleSort(field)}
        // `-my-2 py-2` grows the tap target into the header's own padding, without moving it.
        className="inline-flex items-center gap-1 -my-2 py-2 uppercase tracking-wide rounded hover:text-slate-700 dark:hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500 transition-colors"
      >
        {label}
        <SortCaret field={field} />
      </button>
    ) : (
      label
    );

  /**
   * What a screen reader is told about a column. A sortable column that isn't the one in
   * use reports `none` rather than nothing, which is what says it sorts at all.
   */
  const ariaSort = (shape: SectionShape, field: UnrankedSortField) => {
    if (!shape.sortable) return undefined;
    if (sortField !== field) return 'none' as const;
    return sortDirection === 'asc' ? ('ascending' as const) : ('descending' as const);
  };

  const tableHead = (shape: SectionShape) => (
    <thead>
      <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {shape.ranked && <th className="w-20 py-2 pl-4 pr-2 font-medium">#</th>}
        <th
          className={`py-2 pr-3 font-medium ${shape.ranked ? 'w-20' : 'w-24 pl-4'}`}
          aria-sort={ariaSort(shape, 'eip')}
        >
          {headerLabel(shape, 'eip', 'EIP')}
        </th>
        <th className="py-2 pr-3 font-medium">Proposal</th>
        <th className="w-32 py-2 pr-3 font-medium">Champion</th>
        <th className="w-14 py-2 pr-3 font-medium" aria-sort={ariaSort(shape, 'stage')}>
          {headerLabel(shape, 'stage', 'Stage')}
        </th>
        <th
          className="w-24 py-2 pr-3 font-medium"
          title="Whether the EIP is already running on a devnet of this layer's series, or only planned for one"
          aria-sort={ariaSort(shape, 'devnet')}
        >
          {headerLabel(shape, 'devnet', 'Devnet')}
        </th>
        <th
          className={`w-14 py-2 font-medium text-right${shape.steel ? ' pr-3' : ' pr-4'}`}
          title={`Mean client rating from the layer's teams, on this fork's ${minScore}–${maxScore} scale`}
          aria-sort={ariaSort(shape, 'avg')}
        >
          {headerLabel(shape, 'avg', 'Avg')}
        </th>
        {shape.steel && (
          <th
            className="w-24 py-2 pr-4 font-medium"
            title="STEEL test-complexity score, where an assessment exists"
          >
            STEEL
          </th>
        )}
      </tr>
    </thead>
  );

  const watching = order.watching ?? [];

  /**
   * The watch list belongs to the layer it would join: an EIP expected to want a slot wants
   * one in its own layer's queue, so it reads as a tail of that queue rather than a page
   * footer that a reader has to work out the layer of. Entries are left in the order the
   * list declares them — unlike an unranked layer, this is an authored list.
   */
  const renderWatching = (
    entries: readonly PriorityOrderEntry[],
    shape: SectionShape,
    Heading: 'h2' | 'h3'
  ) => {
    if (entries.length === 0) return null;
    const subheading = Heading === 'h3';

    return (
      <div className={subheading ? 'space-y-3 pt-2' : 'space-y-3'}>
        <div className="flex flex-wrap items-baseline gap-2">
          <Heading
            className={`font-medium text-slate-900 dark:text-slate-100 ${subheading ? 'text-sm' : 'text-lg'}`}
          >
            Watching
          </Heading>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Still awaiting a CFI/DFI decision
          </span>
        </div>
        <div className={"overflow-x-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded"}>
          <table className={`w-full table-fixed ${minTableWidth(shape)}`}>
            {tableHead(shape)}
            <tbody>
              {renderRows(
                entries.map((entry) => ({ entries: [entry], fromRank: 0, toRank: 0 })),
                shape
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /** The watched EIPs of one layer, which is the layer their EIP data gives them. */
  const watchingIn = (layer: PriorityLayer) =>
    watching.filter((entry) => eipById.get(entry.eipId)?.layer === layer);

  /**
   * The unranked sections that have something to show, resolved before anything reads them.
   * The watch list is split by this very list rather than by the declared layers, so a layer
   * can never claim a watched EIP into a section that then doesn't render.
   */
  const unrankedSections = (order.unrankedLayers ?? [])
    .map((layer) => ({ layer, entries: unrankedLayerEntries(order, layer, eipsData) }))
    .filter((section) => section.entries.length > 0);

  /**
   * Watched EIPs that no section on the page claims, because the tracker gives them a layer
   * the order covers neither way, no layer at all, or one whose section has nothing in it.
   * They keep a section of their own, so that a gap in EIP data drops an EIP off the page's
   * sections but never off the page.
   */
  const sectionLayers = new Set<string>([
    ...order.layers.map((layer) => layer.layer),
    ...unrankedSections.map((section) => section.layer.layer),
  ]);
  const orphanWatching = watching.filter((entry) => {
    const layer = eipById.get(entry.eipId)?.layer;
    return !layer || !sectionLayers.has(layer);
  });

  const renderLayer = (layer: PriorityOrderLayer) => {
    const drift = priorityOrderDrift(order, layer, eipsData);
    const hasDrift = drift.moved.length > 0 || drift.unplaced.length > 0;
    const shape: SectionShape = {
      layer: layer.layer,
      devnetSeries: layer.devnetSeries,
      ranked: true,
      steel: true,
      sortable: false,
    };

    return (
      <section key={layer.layer} className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            {LAYER_NAMES[layer.layer] ?? layer.layer}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {layer.entries.length} EIPs
          </span>
        </div>

        {hasDrift && (
          <div className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded px-3 py-2 space-y-1">
            <p className="font-medium">This order is behind the board.</p>
            {drift.moved.length > 0 && (
              <p>
                No longer up for review:{' '}
                {drift.moved.map((item) => `EIP-${item.eipId} (${item.stage})`).join(', ')}.
              </p>
            )}
            {drift.unplaced.length > 0 && (
              <p>Not yet placed: {drift.unplaced.map((eipId) => `EIP-${eipId}`).join(', ')}.</p>
            )}
          </div>
        )}

        <div className={"overflow-x-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded"}>
          <table className={`w-full table-fixed ${minTableWidth(shape)}`}>
            {tableHead(shape)}
            <tbody>{renderRows(groupPairedEntries(layer.entries), shape)}</tbody>
          </table>
        </div>

        {renderWatching(watchingIn(layer.layer), { ...shape, ranked: false }, 'h3')}
      </section>
    );
  };

  /**
   * A layer nobody has ordered. Same table, minus the two columns that would imply an
   * ordering it doesn't have — a rank, and the STEEL assessments that inform one and are
   * only written for execution-layer proposals — and with the rest sortable, since there is
   * no ranking here for a reader's sort to overwrite.
   */
  const renderUnrankedLayer = ({
    layer,
    entries,
  }: {
    layer: UnrankedLayer;
    entries: PriorityOrderEntry[];
  }) => {
    const shape: SectionShape = {
      layer: layer.layer,
      devnetSeries: layer.devnetSeries,
      ranked: false,
      steel: false,
      sortable: true,
    };

    const rows: UnrankedRow[] = entries.map((entry) => {
      const eip = eipById.get(entry.eipId);
      const standing = layer.devnetSeries?.length
        ? devnetStanding(devnetsForEip(entry.eipId, layer.devnetSeries, devnetSpecs))
        : null;
      const aggregate = aggregateById.get(entry.eipId);
      return {
        entry,
        stageRank: getInclusionStageSortRank(eip ? getInclusionStage(eip, order.fork) : 'Unknown'),
        devnetRank: devnetRank(standing, layer.devnetSeries),
        average:
          (layer.layer === 'CL' ? aggregate?.clAverageScore : aggregate?.elAverageScore) ?? null,
      };
    });

    const sorted = sortUnrankedRows(rows, sortField, sortDirection).map((row) => row.entry);

    return (
      <section key={`unranked-${layer.layer}`} className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            {LAYER_NAMES[layer.layer] ?? layer.layer}
          </h2>
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            Not ranked
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {entries.length} EIPs
          </span>
        </div>

        {layer.note && (
          <p className="text-xs text-slate-600 dark:text-slate-300 border-l-2 border-amber-300 dark:border-amber-700 pl-3">
            {layer.note}
          </p>
        )}

        <div className={"overflow-x-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded"}>
          <table className={`w-full table-fixed ${minTableWidth(shape)}`}>
            {tableHead(shape)}
            <tbody>{renderRows(groupPairedEntries(sorted), shape)}</tbody>
          </table>
        </div>

        {renderWatching(watchingIn(layer.layer), { ...shape, sortable: false }, 'h3')}
      </section>
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          The order client and testing teams are asked to work down. EIP-7723 asks that
          &ldquo;facilitators should work with the testing teams to propose a priority
          ordering of CFI EIPs to be reviewed by client developers&rdquo;; this is that
          ordering for {order.displayName ?? order.fork}.
        </p>
        <button
          onClick={copyOrder}
          className="shrink-0 px-2.5 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors"
          title="Copy the whole order as Markdown"
        >
          {copied ? 'Copied' : 'Copy as Markdown'}
        </button>
      </div>
      <p
        className={`mt-1 text-xs text-slate-500 dark:text-slate-400${order.scopeNote ? '' : ' mb-6'}`}
      >
        Published {formatDate(parseDate(order.lastUpdated))}
        {order.source.maintainer && ` by ${order.source.maintainer}`} &middot;{' '}
        <a
          href={order.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-1 underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          {order.source.label}
        </a>
        . It is rearranged as the upgrade is scoped, so it may move after a call.
      </p>
      {order.scopeNote && (
        <p className="mt-2 mb-6 text-xs text-slate-600 dark:text-slate-300 border-l-2 border-slate-200 dark:border-slate-600 pl-3">
          {order.scopeNote}
        </p>
      )}

      <div className="space-y-8">
        {order.layers.map(renderLayer)}
        {unrankedSections.map(renderUnrankedLayer)}
        {/* A watched EIP the page has no section for still has to appear somewhere. */}
        {renderWatching(orphanWatching, ORPHAN_WATCHING_SHAPE, 'h2')}
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Avg is the mean rating from that layer&rsquo;s client teams, on the {minScore}&ndash;
        {maxScore} scale this fork&rsquo;s teams rate against; the{' '}
        <Link
          to={`/upgrade/${fork}/client-priority`}
          className="underline decoration-1 underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          Client Preferences
        </Link>{' '}
        board has the full ratings and the sources behind them. STEEL scores come from the{' '}
        <Link
          to={`/upgrade/${fork}/test-complexity`}
          className="underline decoration-1 underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          Test Complexity
        </Link>{' '}
        assessments, which are written for execution-layer proposals only; a dashed badge is
        still an open pull request. Devnet names where the EIP
        has been put on a network: a solid badge is a devnet that has launched, a dashed one
        is still to come.
      </p>

      <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-400">
        <p>Maintained by the upgrade&rsquo;s facilitators, mirrored here from the source above.</p>
      </div>

      <EipDrawer eipId={drawerEipId} onClose={() => setDrawerEipId(null)} />
    </>
  );
};

export default PriorityOrderTab;
