/**
 * Flattens cartographoor's per-layer fork maps into one chronological schedule.
 *
 * Two shapes have to be reconciled. Forks are keyed per layer (consensus forks
 * carry an epoch, execution forks a block) even though a network upgrade
 * activates both at the same instant, and the same activation is sometimes listed
 * twice under different names — hoodi and sepolia carry both `fulu` and `fusaka`
 * at one timestamp. Merging by timestamp collapses both cases into a single row.
 */
import { getCombinedUpgradeName, getUpgradePagePath } from '../../data/upgrades';
import type { ForkActivation, NetworkForks } from '../../types/networks';

export interface ForkRow {
  timestamp: number;
  /** Combined upgrade name ("fusaka"), or null for forks that predate the naming. */
  upgradeName: string | null;
  /** Internal page for `upgradeName`, or null when that upgrade has no page. */
  upgradePath: string | null;
  consensus: { name: string; epoch?: number } | null;
  execution: { name: string; block?: number } | null;
  minClientVersions: Record<string, string>;
  activated: boolean;
}

interface Layer {
  names: string[];
  activations: ForkActivation[];
}

function emptyLayer(): Layer {
  return { names: [], activations: [] };
}

/**
 * Last match wins. Several forks share a timestamp on every network's genesis
 * row, where everything up to the launch fork activates at once — hoodi turns on
 * altair through deneb together. Consensus fork names are alphabetical by design
 * and cartographoor emits them in that order, so the last one listed is the
 * newest, and the only one worth naming the row after.
 */
function pickLast<T>(values: T[], predicate: (value: T) => boolean): T | undefined {
  for (let i = values.length - 1; i >= 0; i--) {
    if (predicate(values[i])) return values[i];
  }
  return undefined;
}

/**
 * The name to show for a layer: the layer-specific one, so a row reads
 * "fusaka / fulu" rather than repeating the combined name. Falls back to the
 * combined name when that's all the layer reports.
 */
function layerName(layer: Layer, upgradeName: string | null): string | null {
  if (layer.names.length === 0) return null;
  return (
    pickLast(layer.names, (name) => name !== upgradeName) ?? layer.names[layer.names.length - 1]
  );
}

export function buildForkRows(forks: NetworkForks | undefined, now: number): ForkRow[] {
  if (!forks) return [];

  const byTimestamp = new Map<number, { consensus: Layer; execution: Layer }>();

  for (const layer of ['consensus', 'execution'] as const) {
    for (const [name, activation] of Object.entries(forks[layer] ?? {})) {
      let row = byTimestamp.get(activation.timestamp);
      if (!row) {
        row = { consensus: emptyLayer(), execution: emptyLayer() };
        byTimestamp.set(activation.timestamp, row);
      }
      row[layer].names.push(name);
      row[layer].activations.push(activation);
    }
  }

  const rows: ForkRow[] = [];

  for (const [timestamp, { consensus, execution }] of byTimestamp) {
    const allNames = [...consensus.names, ...execution.names];
    const newestNamed = pickLast(allNames, (name) => getCombinedUpgradeName(name) !== null);
    const upgradeName = newestNamed ? getCombinedUpgradeName(newestNamed) : null;

    const minClientVersions: Record<string, string> = {};
    for (const activation of [...consensus.activations, ...execution.activations]) {
      Object.assign(minClientVersions, activation.minClientVersions);
    }

    const clName = layerName(consensus, upgradeName);
    const elName = layerName(execution, upgradeName);

    rows.push({
      timestamp,
      upgradeName,
      upgradePath: upgradeName ? getUpgradePagePath(upgradeName) : null,
      consensus: clName
        ? { name: clName, epoch: consensus.activations[consensus.names.indexOf(clName)]?.epoch }
        : null,
      execution: elName
        ? { name: elName, block: execution.activations[execution.names.indexOf(elName)]?.block }
        : null,
      minClientVersions,
      activated: timestamp <= now,
    });
  }

  rows.sort((a, b) => a.timestamp - b.timestamp);
  return rows;
}
