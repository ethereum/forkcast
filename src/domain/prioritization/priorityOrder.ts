import type { EIP } from '../../types/eip';
import { getInclusionStage } from '../../utils/eip';

import hegotaOrder from '../../data/priority-order/hegota.json';

export type PriorityLayer = 'EL' | 'CL';

/**
 * One EIP's place in the order. The rank is the index, never a stored number: the list is
 * republished whole on every rerank, and an ordinal per entry would only be one more thing
 * to keep in step.
 */
export interface PriorityOrderEntry {
  eipId: number;
  /** A grouping the list itself asserts, like the frames cluster, that EIP data doesn't carry. */
  tag?: string;
  /** Why this EIP sits here, in the facilitator's words. */
  note?: string;
  /** EIPs that have to be reviewed alongside this one. */
  pairedWith?: number[];
}

export interface PriorityOrderLayer {
  layer: PriorityLayer;
  /**
   * The devnet series this layer's EIPs ship on, e.g. ["bogota-devnet", "hegota-devnet"],
   * in the order the fork moves through them. Not derivable from the fork name: the series
   * are named for its halves, they have been renamed once, and feature devnets give way to
   * a merged series partway through.
   */
  devnetSeries?: string[];
  entries: PriorityOrderEntry[];
}

export interface PriorityOrderSource {
  label: string;
  url: string;
  /** Plain-text form of `url`, read only by `scripts/audit-eips.mjs` to spot a rerank. */
  rawUrl?: string;
  maintainer?: string;
}

export interface PriorityOrder {
  /** Fork name as EIP data spells it, so stage lookups match without normalizing. */
  fork: string;
  /** How the fork is written for readers, where that differs from the data spelling. */
  displayName?: string;
  lastUpdated: string;
  source: PriorityOrderSource;
  layers: PriorityOrderLayer[];
  /** Why the order covers the layers it does, where a layer is deliberately left out. */
  scopeNote?: string;
  /** EIPs not yet CFI that the list expects to want a slot soon. */
  watching?: PriorityOrderEntry[];
}

/**
 * Orders published per fork. A fork is absent until its facilitators draw one up, which is
 * what keeps the tab off forks that have none.
 */
const FORK_ORDERS: Record<string, PriorityOrder> = {
  hegota: hegotaOrder as PriorityOrder,
};

export const getPriorityOrder = (fork: string): PriorityOrder | null =>
  FORK_ORDERS[fork.toLowerCase()] ?? null;

/**
 * The stages an order covers. EIP-7723 asks for an ordering of the CFI EIPs; the headliner
 * is already SFI and still leads the queue, so both stages count.
 */
export const REVIEWABLE_STAGES = ['Scheduled for Inclusion', 'Considered for Inclusion'];

/** Entries reviewed as one piece of work, and the ranks they span. */
export interface PriorityOrderGroup {
  entries: PriorityOrderEntry[];
  fromRank: number;
  toRank: number;
}

/**
 * Collapse neighbouring entries that pair with each other into single units, since a pair
 * is picked up, implemented and tested as one piece of work.
 *
 * Only neighbours are collapsed. A pair the list has split apart is saying something by
 * splitting it, and closing that gap here would quietly restate the order.
 */
export function groupPairedEntries(entries: readonly PriorityOrderEntry[]): PriorityOrderGroup[] {
  const groups: PriorityOrderGroup[] = [];

  let start = 0;
  while (start < entries.length) {
    const members = [entries[start]];
    let next = start + 1;
    while (
      next < entries.length &&
      members.some((member) => (member.pairedWith ?? []).includes(entries[next].eipId))
    ) {
      members.push(entries[next]);
      next++;
    }
    groups.push({ entries: members, fromRank: start + 1, toRank: next });
    start = next;
  }

  return groups;
}

/**
 * The order as markdown, shaped like the source list it mirrors so a paste of it reads the
 * way its readers already expect — and so the audit script can parse what comes back.
 */
export function formatPriorityOrder(
  order: PriorityOrder,
  titleFor: (eipId: number) => string | undefined,
  origin: string
): string {
  const eipUrl = (eipId: number) => `${origin}/eips/${eipId}/`;

  const line = (entry: PriorityOrderEntry, marker: string) => {
    const asides = [
      ...(entry.pairedWith ?? []).map(
        (partnerId) => `Reviewed with EIP-${partnerId}`
      ),
      ...(entry.tag ? [entry.tag] : []),
      ...(entry.note ? [entry.note] : []),
    ];
    const title = titleFor(entry.eipId) ?? 'Untitled';
    const tail = asides.length > 0 ? `. _${asides.join('. ')}_` : '';
    return `${marker} [EIP-${entry.eipId}](${eipUrl(entry.eipId)}): ${title}${tail}`;
  };

  const sections = [`# ${order.displayName ?? order.fork} priority order`, '', `Published ${order.lastUpdated} · source: ${order.source.url}`];

  for (const layer of order.layers) {
    sections.push('', order.layers.length > 1 ? `## ${layer.layer} EIPs` : '## EIPs', '');
    layer.entries.forEach((entry, index) => sections.push(line(entry, `${index + 1}.`)));
  }

  if (order.watching && order.watching.length > 0) {
    sections.push('', '## Notes', '');
    for (const entry of order.watching) sections.push(line(entry, '-'));
  }

  sections.push('', `Copied from ${origin}/upgrade/${order.fork.toLowerCase()}/priority-order/`);
  return sections.join('\n');
}

export interface PriorityOrderDrift {
  /** Placed EIPs whose stage has since moved out of SFI/CFI. */
  moved: { eipId: number; stage: string }[];
  /** SFI/CFI EIPs of this layer that the order doesn't place. */
  unplaced: number[];
}

/**
 * How far one layer's order has fallen behind the board. An order is drawn up against the
 * stages as they stood on a given call and every later call can move them, so the gap is
 * computed rather than asserted — the page can say how stale it is instead of quietly
 * presenting a queue that no longer matches what is up for review.
 */
export function priorityOrderDrift(
  order: PriorityOrder,
  layer: PriorityOrderLayer,
  eips: readonly EIP[]
): PriorityOrderDrift {
  const byId = new Map(eips.map((eip) => [eip.id, eip]));
  const placed = new Set(layer.entries.map((entry) => entry.eipId));

  const moved = layer.entries.flatMap((entry) => {
    const eip = byId.get(entry.eipId);
    const stage = eip ? getInclusionStage(eip, order.fork) : 'Unknown';
    return REVIEWABLE_STAGES.includes(stage) ? [] : [{ eipId: entry.eipId, stage }];
  });

  const unplaced = eips
    .filter(
      (eip) =>
        eip.layer === layer.layer &&
        !placed.has(eip.id) &&
        REVIEWABLE_STAGES.includes(getInclusionStage(eip, order.fork))
    )
    .map((eip) => eip.id)
    .sort((a, b) => a - b);

  return { moved, unplaced };
}
