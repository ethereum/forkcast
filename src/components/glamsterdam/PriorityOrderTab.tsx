import React, { useMemo, useState } from 'react';
import { Link } from '../navigation';
import { eipById, eipsData } from '../../data/eips';
import { EipDrawer } from '../eip/EipDrawer';
import {
  formatPriorityOrder,
  getPriorityOrder,
  groupPairedEntries,
  priorityOrderDrift,
  type PriorityLayer,
  type PriorityOrderEntry,
  type PriorityOrderGroup,
  type PriorityOrderLayer,
} from '../../domain/prioritization/priorityOrder';
import { usePrioritizationData } from '../../hooks/usePrioritizationData';
import { devnetsForEip, devnetStanding, upcomingLabel } from '../../domain/devnets/eipDevnets';
import { devnetSpecs } from '../../data/devnet-specs';
import { useComplexityData } from '../../domain/complexity/useComplexityData';
import { ComplexityScoreBadge } from '../ui';
import { getMaxScore, getMinScore, getScoreColor } from '../../utils/prioritization';
import {
  getInclusionStage,
  getLaymanTitle,
  getProposalPrefix,
  getStageAbbreviation,
  isHeadliner,
} from '../../utils/eip';
import { getInclusionStageColor } from '../../utils/colors';
import { formatDate, parseDate } from '../../utils/date';
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

/** The width the stance board breaks out to, so the two tables read as one pair. */
const BREAKOUT = 'lg:relative lg:left-1/2 lg:-translate-x-1/2 lg:w-[72rem] lg:max-w-[calc(100vw-3rem)]';

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
 * Deliberately a flat read: no sorting, filtering or view state. The board next door answers
 * how each EIP got here, and an order that can be rearranged on screen is no longer the one
 * thing everyone is reading off.
 */
const PriorityOrderTab: React.FC<PriorityOrderTabProps> = ({ fork }) => {
  const [drawerEipId, setDrawerEipId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const order = getPriorityOrder(fork);

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
      window.location.origin
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
   * Title, the marks that qualify it, and the facilitator's note. `alongside` are the ids
   * sharing a unit, whose pairing the row grouping already states — naming them again on
   * every row was the redundancy that made a pair read as two unrelated neighbours.
   */
  const proposalCell = (entry: PriorityOrderEntry, alongside: readonly number[]) => {
    const eip = eipById.get(entry.eipId);
    const partners = (entry.pairedWith ?? []).filter((id) => !alongside.includes(id));

    return (
      <>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/eips/${entry.eipId}`}
            onClick={eip ? openDrawer(entry.eipId) : undefined}
            className="text-sm text-slate-900 hover:text-purple-600 dark:text-slate-100 dark:hover:text-purple-400 transition-colors"
          >
            {eip ? getLaymanTitle(eip) : `EIP-${entry.eipId}`}
          </Link>
          {eip && isHeadliner(eip, order.fork) && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
              title="Selected headliner"
            >
              Headliner
            </span>
          )}
          {entry.tag && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {entry.tag}
            </span>
          )}
        </div>

        {(partners.length > 0 || entry.note) && (
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {partners.length > 0 && (
              <>
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
                {entry.note ? '. ' : '.'}
              </>
            )}
            {entry.note}
          </p>
        )}
      </>
    );
  };

  /** Who to ask about this EIP. Scoped to the fork, since championship can change between them. */
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
                {champion.name}
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
  const devnetCell = (entry: PriorityOrderEntry, layer: PriorityOrderLayer | null) => {
    if (!layer?.devnetSeries?.length) return EMPTY;
    const appearances = devnetsForEip(entry.eipId, layer.devnetSeries, devnetSpecs);
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
   * A null layer is the watch list, which has no rank and no layer to average over.
   */
  const renderRows = (groups: PriorityOrderGroup[], layer: PriorityOrderLayer | null) =>
    groups.map((group) => {
      const memberIds = group.entries.map((entry) => entry.eipId);
      const paired = group.entries.length > 1;

      return group.entries.map((entry, index) => (
        <tr
          key={entry.eipId}
          className={index === 0 ? 'border-t border-slate-200 dark:border-slate-700' : ''}
        >
          {index === 0 && (
            <td
              rowSpan={group.entries.length}
              className="align-top py-3 pl-4 pr-2 text-sm font-mono tabular-nums whitespace-nowrap text-slate-500 dark:text-slate-300"
            >
              {layer === null
                ? '·'
                : paired
                  ? `${group.fromRank}–${group.toRank}`
                  : group.fromRank}
              {paired && (
                <span className="mt-0.5 block text-[10px] font-sans font-medium uppercase tracking-wide text-slate-400 dark:text-slate-400">
                  together
                </span>
              )}
            </td>
          )}
          <td className="align-top py-3 pr-3 text-sm font-mono whitespace-nowrap">
            {eipLink(
              entry.eipId,
              'text-slate-500 hover:text-purple-600 dark:text-slate-300 dark:hover:text-purple-400 transition-colors'
            )}
          </td>
          <td className="align-top py-3 pr-3">{proposalCell(entry, memberIds)}</td>
          <td className="align-top py-3 pr-3">{championCell(entry)}</td>
          <td className="align-top py-3 pr-3 whitespace-nowrap">{stageCell(entry)}</td>
          <td className="align-top py-3 pr-3 whitespace-nowrap">{devnetCell(entry, layer)}</td>
          <td className="align-top py-3 pr-3 text-right whitespace-nowrap">
            {layer ? (
              <StanceAverage
                aggregate={aggregateById.get(entry.eipId)}
                layer={layer.layer}
                maxScore={maxScore}
                minScore={minScore}
              />
            ) : (
              EMPTY
            )}
          </td>
          <td className="align-top py-3 pr-4 whitespace-nowrap">
            {steelCell(complexityMap.get(entry.eipId))}
          </td>
        </tr>
      ));
    });

  const tableHead = (
    <thead>
      <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <th className="w-20 py-2 pl-4 pr-2 font-medium">#</th>
        <th className="w-24 py-2 pr-3 font-medium">EIP</th>
        <th className="py-2 pr-3 font-medium">Proposal</th>
        <th className="w-40 py-2 pr-3 font-medium">Champion</th>
        <th className="w-16 py-2 pr-3 font-medium">Stage</th>
        <th
          className="w-28 py-2 pr-3 font-medium"
          title="Whether the EIP is already running on a devnet of this layer's series, or only planned for one"
        >
          Devnet
        </th>
        <th
          className="w-14 py-2 pr-3 font-medium text-right"
          title={`Mean client rating from the layer's teams, on this fork's ${minScore}–${maxScore} scale`}
        >
          Avg
        </th>
        <th
          className="w-28 py-2 pr-4 font-medium"
          title="STEEL test-complexity score, where an assessment exists"
        >
          STEEL
        </th>
      </tr>
    </thead>
  );

  const renderLayer = (layer: PriorityOrderLayer) => {
    const drift = priorityOrderDrift(order, layer, eipsData);
    const hasDrift = drift.moved.length > 0 || drift.unplaced.length > 0;

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

        <div className={`overflow-x-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded ${BREAKOUT}`}>
          <table className="w-full min-w-[60rem] table-fixed">
            {tableHead}
            <tbody>{renderRows(groupPairedEntries(layer.entries), layer)}</tbody>
          </table>
        </div>
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

      <div className="space-y-8">{order.layers.map(renderLayer)}</div>

      {order.watching && order.watching.length > 0 && (
        <section className="mt-8 space-y-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">Watching</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Not CFI yet, and expected to want a slot
            </span>
          </div>
          <div className={`overflow-x-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded ${BREAKOUT}`}>
            <table className="w-full min-w-[60rem] table-fixed">
              {tableHead}
              <tbody>
                {renderRows(
                  order.watching.map((entry) => ({ entries: [entry], fromRank: 0, toRank: 0 })),
                  null
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
        assessments; a dashed badge is still an open pull request. Devnet names where the EIP
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
