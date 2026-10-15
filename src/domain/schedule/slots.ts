/**
 * Slot/epoch arithmetic and timezone scoring for picking a fork activation time.
 *
 * A fork activates on an epoch boundary, so the choice facilitators actually make is
 * "which epoch", and the consequence they care about is what hour that lands on for the
 * client teams who have to watch it. This module turns a date window into the candidate
 * epochs inside it and reads each one in every timezone being compared.
 *
 * Ported from Adrian Sutton's slot-finder (https://github.com/ajsutton/slot-finder).
 */

/** Beacon chain constants. Every Ethereum network in the snapshot shares these. */
export const SECONDS_PER_SLOT = 12;
export const SLOTS_PER_EPOCH = 32;
export const SECONDS_PER_EPOCH = SECONDS_PER_SLOT * SLOTS_PER_EPOCH;

/**
 * `SLOTS_PER_HISTORICAL_ROOT` from the consensus specs: where the beacon state rolls its
 * block and state roots into `historical_summaries`. Every mainnet consensus fork so far
 * — Altair through Fusaka — has activated on one of these boundaries, so they are the
 * shortlist a mainnet activation is usually drawn from.
 */
export const SLOTS_PER_HISTORICAL_ROOT = 8192;
export const EPOCHS_PER_HISTORICAL_ROOT = SLOTS_PER_HISTORICAL_ROOT / SLOTS_PER_EPOCH;

/** Epochs between the rows of the `round` filter — activations are often announced on one. */
export const ROUND_EPOCH_STEP = 100;

export const slotToTimestamp = (slot: number, genesisTime: number): number =>
  genesisTime + slot * SECONDS_PER_SLOT;

export const timestampToSlot = (timestamp: number, genesisTime: number): number =>
  Math.floor((timestamp - genesisTime) / SECONDS_PER_SLOT);

export const epochToSlot = (epoch: number): number => epoch * SLOTS_PER_EPOCH;

export const slotToEpoch = (slot: number): number => Math.floor(slot / SLOTS_PER_EPOCH);

export interface EpochCandidate {
  epoch: number;
  slot: number;
  /** Unix seconds at the first slot of the epoch. */
  timestamp: number;
  isHistoricalRootBoundary: boolean;
}

export type EpochFilter = 'all' | 'round' | 'historical-root';

const FILTER_STEPS: Record<EpochFilter, number> = {
  all: 1,
  round: ROUND_EPOCH_STEP,
  'historical-root': EPOCHS_PER_HISTORICAL_ROOT,
};

export interface EpochWindow {
  genesisTime: number;
  /** Unix seconds, inclusive. */
  from: number;
  /** Unix seconds, exclusive. */
  to: number;
  filter: EpochFilter;
  /** Rows to return. The remainder is reported as `truncated` rather than rendered. */
  limit: number;
}

const makeCandidate = (genesisTime: number, epoch: number): EpochCandidate => {
  const slot = epochToSlot(epoch);
  return {
    epoch,
    slot,
    timestamp: genesisTime + epoch * SECONDS_PER_EPOCH,
    isHistoricalRootBoundary: slot % SLOTS_PER_HISTORICAL_ROOT === 0,
  };
};

/** The first epoch the filter admits that starts at or after `timestamp`. */
const firstAdmittedFrom = (genesisTime: number, timestamp: number, step: number): number =>
  Math.max(0, Math.ceil(Math.ceil((timestamp - genesisTime) / SECONDS_PER_EPOCH) / step) * step);

/**
 * The candidate epochs starting inside `[from, to)`, in time order. Epochs before genesis
 * are skipped: they have no slot on the chain being scheduled.
 */
export function buildEpochCandidates(window: EpochWindow): {
  candidates: EpochCandidate[];
  total: number;
} {
  const { genesisTime, from, to, filter, limit } = window;
  const step = FILTER_STEPS[filter];
  if (to <= from) return { candidates: [], total: 0 };

  const start = firstAdmittedFrom(genesisTime, from, step);

  const candidates: EpochCandidate[] = [];
  let total = 0;
  for (let epoch = start; ; epoch += step) {
    const timestamp = genesisTime + epoch * SECONDS_PER_EPOCH;
    if (timestamp >= to) break;
    total++;
    if (candidates.length < limit) candidates.push(makeCandidate(genesisTime, epoch));
  }
  return { candidates, total };
}

/**
 * The last candidate starting strictly before `timestamp`, or null when that would fall
 * before genesis.
 *
 * Historical-root boundaries are 27.3 hours apart, so they drift later each day and skip
 * one about every eighth day. A window drawn to a calendar date can therefore sit just
 * past a good boundary, or hold none at all, and the caller needs to be able to show what
 * lies immediately outside it.
 */
export function candidateBefore(
  genesisTime: number,
  timestamp: number,
  filter: EpochFilter,
): EpochCandidate | null {
  const step = FILTER_STEPS[filter];
  // The last epoch starting before `timestamp`, rounded down to one the filter admits.
  const lastBefore = Math.ceil((timestamp - genesisTime) / SECONDS_PER_EPOCH) - 1;
  const epoch = Math.floor(lastBefore / step) * step;
  return epoch < 0 ? null : makeCandidate(genesisTime, epoch);
}

/** The first candidate starting at or after `timestamp`. The counterpart to the above. */
export function candidateAtOrAfter(
  genesisTime: number,
  timestamp: number,
  filter: EpochFilter,
): EpochCandidate {
  return makeCandidate(genesisTime, firstAdmittedFrom(genesisTime, timestamp, FILTER_STEPS[filter]));
}

/**
 * How sociable an hour is for whoever lives in that timezone. The bands are the ones
 * slot-finder shaded for; the weights below are what turn them into a ranking.
 */
export type HourBand = 'work' | 'fringe' | 'edge' | 'night';

export function hourBand(hour: number): HourBand {
  if (hour >= 9 && hour < 18) return 'work';
  if (hour >= 7 && hour < 21) return 'fringe';
  if (hour >= 6 && hour < 23) return 'edge';
  return 'night';
}

export interface ZoneReading {
  zone: string;
  /** 24-hour local time, `HH:mm`. */
  time: string;
  hour: number;
  /** Short local weekday, e.g. `Thu`. */
  weekday: string;
  isWeekend: boolean;
  /** Local calendar date minus the UTC calendar date, in whole days: -1, 0 or +1. */
  dayOffset: number;
  band: HourBand;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const zoneSupport = new Map<string, boolean>();

/**
 * Whether this platform can format in `zone`.
 *
 * `Intl.DateTimeFormat` throws a `RangeError` on an id it does not know, and every caller
 * here runs inside a render, so an unknown id would take the page down rather than lose a
 * column. Ids reach us from the query string and from the browser's own guess, neither of
 * which is trustworthy: a link can be mistyped, and tzdata differs between browsers, so an
 * id that is perfectly valid for the sender may be unknown to the recipient.
 */
export function isSupportedZone(zone: string): boolean {
  const cached = zoneSupport.get(zone);
  if (cached !== undefined) return cached;
  let supported = false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
    supported = true;
  } catch {
    supported = false;
  }
  zoneSupport.set(zone, supported);
  return supported;
}

function zoneFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour12: false,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    formatterCache.set(zone, formatter);
  }
  return formatter;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Reads one instant in one timezone. `timestamp` is unix seconds. */
export function readZone(timestamp: number, zone: string): ZoneReading {
  const parts = zoneFormatter(zone).formatToParts(new Date(timestamp * 1000));
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  // `en-GB` renders midnight as hour 24; the rest of the day is unaffected.
  const hour = Number(part('hour')) % 24;
  const weekday = part('weekday');
  const localDay = Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day')));
  const utcDate = new Date(timestamp * 1000);
  const utcDay = Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());

  return {
    zone,
    time: `${String(hour).padStart(2, '0')}:${part('minute')}`,
    hour,
    weekday,
    isWeekend: weekday === 'Sat' || weekday === 'Sun',
    dayOffset: Math.round((localDay - utcDay) / MS_PER_DAY),
    band: hourBand(hour),
  };
}

/**
 * A weekend contributes the same whatever the hour: an activation nobody is rostered for
 * is a bad one even at 2pm. Night is penalised so a slot that wakes a team sorts below a
 * merely awkward one, rather than tying with it.
 */
const BAND_WEIGHTS: Record<HourBand, number> = { work: 3, fringe: 1, edge: 0, night: -2 };
const WEEKEND_WEIGHT = -1;

export interface CandidateScore {
  /** Zones in working hours on a weekday — the headline figure. */
  working: number;
  /** Zones where the activation falls between 23:00 and 06:00. */
  asleep: number;
  /** Zones where it falls on a Saturday or Sunday. */
  weekend: number;
  /** Tie-breaker within a `working` count; `byFitThenQuality` is the ordering. */
  score: number;
}

/**
 * Best first: most zones in working hours, then overall quality, then earliest.
 *
 * `working` leads because it is the number the table prints under "Fit" — ranking on the
 * composite alone would order the rows by something the reader cannot see, and put the
 * shortlist's pick somewhere down a Fit-sorted table.
 */
export function byFitThenQuality(
  a: { score: CandidateScore; timestamp: number },
  b: { score: CandidateScore; timestamp: number },
): number {
  return (
    b.score.working - a.score.working ||
    b.score.score - a.score.score ||
    a.timestamp - b.timestamp
  );
}

export function scoreReadings(readings: readonly ZoneReading[]): CandidateScore {
  let working = 0;
  let asleep = 0;
  let weekend = 0;
  let score = 0;

  for (const reading of readings) {
    if (reading.band === 'night') asleep++;
    if (reading.isWeekend) {
      weekend++;
      // A weekend never scores positively — nobody is rostered whatever the clock says —
      // but a weekend night is still worse than a weekend afternoon, so the night penalty
      // stays and only the positive bands are dropped.
      score += Math.min(BAND_WEIGHTS[reading.band], 0) + WEEKEND_WEIGHT;
      continue;
    }
    if (reading.band === 'work') working++;
    score += BAND_WEIGHTS[reading.band];
  }

  return { working, asleep, weekend, score };
}

export interface ZoneOption {
  id: string;
  label: string;
  /**
   * Short, stable token for the query string. Deliberately not derived from `label`,
   * which is display text and may be reworded; a shared link must keep resolving.
   */
  code: string;
}

/**
 * The comparison set offered in the picker, roughly tracking where client and testing
 * teams sit, west to east. UTC is not among them: it has a column of its own, and scoring
 * it as a timezone would put a working day nobody lives in into the denominator.
 */
export const ZONE_OPTIONS: readonly ZoneOption[] = [
  { id: 'America/Los_Angeles', label: 'US West', code: 'usw' },
  { id: 'America/Chicago', label: 'US Central', code: 'usc' },
  { id: 'America/New_York', label: 'US East', code: 'use' },
  { id: 'America/Sao_Paulo', label: 'Brazil', code: 'br' },
  { id: 'Europe/London', label: 'UK', code: 'uk' },
  { id: 'Europe/Berlin', label: 'Germany', code: 'de' },
  { id: 'Europe/Warsaw', label: 'Poland', code: 'pl' },
  { id: 'Europe/Bucharest', label: 'Romania', code: 'ro' },
  { id: 'Asia/Jerusalem', label: 'Israel', code: 'il' },
  { id: 'Asia/Kolkata', label: 'India', code: 'in' },
  { id: 'Asia/Singapore', label: 'Singapore', code: 'sg' },
  { id: 'Asia/Tokyo', label: 'Japan', code: 'jp' },
  { id: 'Australia/Brisbane', label: 'Australia', code: 'au' },
  { id: 'Pacific/Auckland', label: 'New Zealand', code: 'nz' },
];

export const DEFAULT_ZONES: readonly string[] = [
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Singapore',
  'Australia/Brisbane',
];

/** The viewer's own zone, or `UTC` where the browser won't say or names one it cannot format. */
export function localZone(): string {
  const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return resolved && isSupportedZone(resolved) ? resolved : 'UTC';
}

/** `America/Argentina/Buenos_Aires` -> `Buenos Aires`. */
const zoneName = (id: string): string => id.split('/').pop()?.replace(/_/g, ' ') ?? id;

/**
 * The offered zones with the viewer's own folded in: marked where it is already listed,
 * prepended under its IANA name where it is not, so a local column is always available.
 *
 * `alsoInclude` appends anything else that is already being compared. A shared link can
 * name a zone this catalogue has never heard of — the colleague who built it lives
 * somewhere unlisted — and without this the recipient would silently lose that column.
 */
export function zoneOptionsWithLocal(
  local: string,
  alsoInclude: readonly string[] = [],
): ZoneOption[] {
  const listed = ZONE_OPTIONS.some((option) => option.id === local);
  const options: ZoneOption[] = listed
    ? ZONE_OPTIONS.map((option) =>
        option.id === local ? { ...option, label: `${option.label} · local` } : option,
      )
    : [{ id: local, label: `${zoneName(local)} · local`, code: local }, ...ZONE_OPTIONS];

  const known = new Set(options.map((option) => option.id));
  for (const id of alsoInclude) {
    if (known.has(id)) continue;
    known.add(id);
    options.push({ id, label: zoneName(id), code: id });
  }
  return options;
}

const CODE_TO_ID = new Map(ZONE_OPTIONS.map((option) => [option.code, option.id]));
const ID_TO_CODE = new Map(ZONE_OPTIONS.map((option) => [option.id, option.code]));

/**
 * Serialises a comparison set for the query string. Listed zones use their short code; a
 * viewer's own unlisted zone falls back to its IANA id, which survives the round trip at
 * the cost of a longer link.
 */
export function encodeZones(ids: readonly string[]): string {
  return ids.map((id) => ID_TO_CODE.get(id) ?? id).join(',');
}

/**
 * The inverse. Tokens that are neither a known code nor a zone this platform can format
 * are dropped rather than guessed at — passing one through would reach `readZone` and
 * throw mid-render.
 */
export function decodeZones(param: string): string[] {
  const seen = new Set<string>();
  for (const token of param.split(',')) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const id = CODE_TO_ID.get(trimmed) ?? trimmed;
    if (isSupportedZone(id)) seen.add(id);
  }
  return [...seen];
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** `YYYY-MM-DD HH:mm:ss` UTC, the form activation times are announced in. */
export function formatUtc(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/**
 * Whether `value` is a real `YYYY-MM-DD` date.
 *
 * `Date.parse` is not enough on its own: V8's legacy fallback rolls overflow dates over,
 * so `2026-02-30` parses happily as 2 March. The round trip catches those.
 */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const seconds = utcMidnight(value);
  return Number.isFinite(seconds) && toIsoDate(seconds) === value;
}

/** Midnight UTC on a `YYYY-MM-DD` date string, in unix seconds. */
export function utcMidnight(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`) / 1000;
}

/** `YYYY-MM-DD` for a unix timestamp, in UTC. */
export function toIsoDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}
