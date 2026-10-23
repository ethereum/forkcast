import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REVIEW_ORDER_DIR = path.join(__dirname, '../../src/data/priority-order');

/**
 * Mirrors REVIEWABLE_STAGES in src/domain/prioritization/priorityOrder.ts, which the audit
 * cannot import (TS). These are raw statusHistory statuses rather than display stages.
 */
const REVIEWABLE_STATUSES = new Set(['Considered', 'Scheduled']);

/** Every published order, as `{ fork, file, order }`. */
export function loadPriorityOrders() {
  if (!fs.existsSync(REVIEW_ORDER_DIR)) return [];
  return fs
    .readdirSync(REVIEW_ORDER_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const order = JSON.parse(fs.readFileSync(path.join(REVIEW_ORDER_DIR, file), 'utf8'));
      return { fork: order.fork, file, order };
    });
}

function currentStatus(eip, forkName) {
  const fr = (eip.forkRelationships || []).find(
    (r) => r.forkName.toLowerCase() === forkName.toLowerCase()
  );
  const history = fr?.statusHistory;
  if (!history || history.length === 0) return null;
  return history[history.length - 1].status;
}

/**
 * How far the order has fallen behind the board, per layer. An order is drawn up against
 * the stages as they stood on one call, and every later call can move them.
 */
export function reconcileBoard(order, eips) {
  const byId = new Map(eips.map((eip) => [eip.id, eip]));

  return order.layers.map((layer) => {
    const placed = new Set(layer.entries.map((entry) => entry.eipId));

    const moved = layer.entries.flatMap((entry) => {
      const eip = byId.get(entry.eipId);
      if (!eip) return [{ eipId: entry.eipId, status: 'no EIP data file' }];
      const status = currentStatus(eip, order.fork);
      return REVIEWABLE_STATUSES.has(status) ? [] : [{ eipId: entry.eipId, status: status ?? 'none' }];
    });

    const unplaced = eips
      .filter(
        (eip) =>
          eip.layer === layer.layer &&
          !placed.has(eip.id) &&
          REVIEWABLE_STATUSES.has(currentStatus(eip, order.fork))
      )
      .map((eip) => eip.id)
      .sort((a, b) => a - b);

    return { layer: layer.layer, moved, unplaced };
  });
}

/**
 * Pull the EIP ids out of the source list's markdown, in the order it gives them.
 *
 * Only the ordering is read back. The notes, pairings and tags in our copy are editorial —
 * transcribed by hand because the source writes them as prose — so re-deriving them here
 * would only produce a worse version of what is already checked in.
 */
export function parsePublishedOrder(markdown) {
  const sections = new Map();
  let heading = null;

  for (const line of markdown.split('\n')) {
    const match = line.match(/^#{1,4}\s+(.*)$/);
    if (match) {
      heading = match[1].trim().toLowerCase();
      sections.set(heading, []);
      continue;
    }
    if (heading) sections.get(heading).push(line);
  }

  const idsIn = (lines, bullet) => {
    const ids = [];
    const unparsed = [];
    for (const line of lines) {
      if (!bullet.test(line)) continue;
      const id = line.match(/eip-?(\d{1,5})/i);
      if (id) ids.push(Number(id[1]));
      else unparsed.push(line.trim());
    }
    return { ids, unparsed };
  };

  const eipsSection = sections.get('eips');
  if (!eipsSection) {
    throw new Error('no "## EIPs" section; the source list layout likely changed');
  }

  const ranked = idsIn(eipsSection, /^\s*\d+\.\s/);
  if (ranked.ids.length === 0) {
    // Otherwise an upstream restructure reads as a clean audit.
    throw new Error('parsed 0 EIPs from the "## EIPs" section');
  }

  const notes = sections.get('notes');
  const watching = notes ? idsIn(notes, /^\s*[*-]\s/) : { ids: [], unparsed: [] };

  return {
    ids: ranked.ids,
    watching: watching.ids,
    unparsed: [...ranked.unparsed, ...watching.unparsed],
  };
}

/**
 * The ids both lists hold, in the longest order they agree on. What falls outside it is the
 * smallest set of EIPs that have to have been picked up and dropped elsewhere — without
 * this, moving one EIP to the top reads as every EIP below it moving down one.
 */
function longestCommonOrder(ours, theirs) {
  const grid = Array.from({ length: ours.length + 1 }, () => new Array(theirs.length + 1).fill(0));
  for (let i = ours.length - 1; i >= 0; i--) {
    for (let j = theirs.length - 1; j >= 0; j--) {
      grid[i][j] =
        ours[i] === theirs[j] ? grid[i + 1][j + 1] + 1 : Math.max(grid[i + 1][j], grid[i][j + 1]);
    }
  }

  const common = [];
  let i = 0;
  let j = 0;
  while (i < ours.length && j < theirs.length) {
    if (ours[i] === theirs[j]) {
      common.push(ours[i]);
      i++;
      j++;
    } else if (grid[i + 1][j] >= grid[i][j + 1]) i++;
    else j++;
  }
  return common;
}

/**
 * Compare the published list against our copy. Layers are flattened: one source list backs
 * the whole file, so a per-layer comparison would need a source per layer first.
 */
export function reconcilePublished(order, published) {
  const ours = order.layers.flatMap((layer) => layer.entries.map((entry) => entry.eipId));
  const theirs = published.ids;
  const ourIds = new Set(ours);
  const theirIds = new Set(theirs);

  const added = theirs.filter((id) => !ourIds.has(id));
  const removed = ours.filter((id) => !theirIds.has(id));

  const settled = new Set(
    longestCommonOrder(
      ours.filter((id) => theirIds.has(id)),
      theirs.filter((id) => ourIds.has(id))
    )
  );
  const reranked = theirs.flatMap((id, index) =>
    settled.has(id) || !ourIds.has(id)
      ? []
      : [{ eipId: id, from: ours.indexOf(id) + 1, to: index + 1 }]
  );

  const ourWatching = (order.watching ?? []).map((entry) => entry.eipId);
  const watchingAdded = published.watching.filter((id) => !ourWatching.includes(id));
  const watchingRemoved = ourWatching.filter((id) => !published.watching.includes(id));

  return {
    added,
    removed,
    reranked,
    watchingAdded,
    watchingRemoved,
    unparsed: published.unparsed,
  };
}

export async function fetchPublishedOrder(rawUrl) {
  const response = await fetch(rawUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${rawUrl}`);
  return parsePublishedOrder(await response.text());
}
