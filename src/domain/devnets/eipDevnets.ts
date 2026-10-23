import type { DevnetSpec } from '../../types';

export interface DevnetAppearance {
  /** Full spec id, e.g. "bogota-devnet-2". */
  id: string;
  /**
   * The id with the redundant word dropped, e.g. "bogota-2". The series is kept: a fork's
   * feature devnets give way to a merged series partway through, so "devnet-0" alone stops
   * identifying anything the moment bogota-devnet-2 is followed by hegota-devnet-0.
   */
  label: string;
  series: string;
  number: number;
  /** How the devnet spec marks the EIP: new, updated, optional, … */
  status: string | null;
  /** Genesis has passed, so the EIP is running somewhere rather than merely planned. */
  launched: boolean;
  genesisTime?: number;
}

/** "bogota-devnet-2" within series "bogota-devnet" is 2, matching getDevnetSeriesSiblings. */
const seriesNumber = (id: string, series: string): number =>
  Number.parseInt(id.slice(series.length + 1), 10);

const shortLabel = (id: string): string => id.replace(/-devnets?-/, '-');

/**
 * Where an EIP has been put on a network, across the devnet series a fork ships on, oldest
 * first.
 *
 * Series are given rather than derived, in the order the fork moves through them: they are
 * named for the fork's halves rather than the fork ("bogota-devnet" for Hegotá's execution
 * devnets), they have already been renamed once, and a fork's feature devnets are followed
 * by a merged series. Ordering follows that declaration, then the number within a series,
 * since numbering restarts at zero whenever the series changes.
 */
export function devnetsForEip(
  eipId: number,
  series: readonly string[],
  specs: readonly DevnetSpec[],
  now: number = Date.now()
): DevnetAppearance[] {
  return specs
    .flatMap((spec) => {
      const order = series.findIndex((name) => spec.id.startsWith(`${name}-`));
      if (order === -1) return [];
      const eip = spec.eips.find((item) => item.number === eipId);
      if (!eip) return [];

      const appearance: DevnetAppearance = {
        id: spec.id,
        label: shortLabel(spec.id),
        series: series[order],
        number: seriesNumber(spec.id, series[order]),
        status: eip.status ?? null,
        launched: spec.genesisTime !== undefined && spec.genesisTime * 1000 <= now,
        ...(spec.genesisTime !== undefined ? { genesisTime: spec.genesisTime } : {}),
      };
      return [{ order, appearance }];
    })
    .sort((a, b) => a.order - b.order || a.appearance.number - b.appearance.number)
    .map((item) => item.appearance);
}

export interface DevnetStanding {
  /** The devnet the state is claimed about, so a label and its styling always agree. */
  shown: DevnetAppearance;
  /** Whether the EIP is already on a network, or only booked onto a future one. */
  state: 'running' | 'planned';
  /** A later devnet still to launch, when the EIP is already running in an earlier one. */
  upcoming: DevnetAppearance | null;
}

/**
 * What one cell should say about an EIP's devnet history.
 *
 * The newest devnet alone would be misleading: an EIP carried from a live devnet into the
 * next planned one would read as merely planned, which is the opposite of the truth. So the
 * badge names the newest devnet that has actually launched where there is one, and the
 * planned devnet is carried alongside it.
 */
export function devnetStanding(appearances: readonly DevnetAppearance[]): DevnetStanding | null {
  if (appearances.length === 0) return null;

  const launched = appearances.filter((item) => item.launched);
  const newest = appearances[appearances.length - 1];
  if (launched.length === 0) return { shown: newest, state: 'planned', upcoming: null };

  const shown = launched[launched.length - 1];
  return {
    shown,
    state: 'running',
    upcoming: newest.launched ? null : newest,
  };
}

/**
 * How to write the upcoming devnet beside the one already named. Within a series its number
 * is enough; once the fork has moved on to another series the name has to come along, or
 * "bogota-2 →0" would read as going backwards.
 */
export function upcomingLabel(standing: DevnetStanding): string | null {
  if (!standing.upcoming) return null;
  return standing.upcoming.series === standing.shown.series
    ? `→${standing.upcoming.number}`
    : `→ ${standing.upcoming.label}`;
}
