import React, { useEffect, useMemo, useState } from 'react';
import {
  buildEpochCandidates,
  byFitThenQuality,
  candidateAtOrAfter,
  candidateBefore,
  DEFAULT_ZONES,
  formatUtc,
  isIsoDate,
  localZone,
  readZone,
  scoreReadings,
  slotToEpoch,
  slotToTimestamp,
  timestampToSlot,
  toIsoDate,
  utcMidnight,
  decodeZones,
  encodeZones,
  zoneOptionsWithLocal,
  type CandidateScore,
  type EpochCandidate,
  type EpochFilter,
  type HourBand,
  type ZoneReading,
} from '../../domain/schedule/slots';
import { publicNetworks } from '../../domain/networks/networks';
import { useSearchParams } from '../navigation';
import { SegmentedControl, Tooltip } from '../ui';

interface Preset {
  label: string;
  /** `YYYY-MM-DD`. */
  date: string;
}

interface ActivationSlotPickerProps {
  /** Dates worth jumping to, usually the planning table's projected activations. */
  presets?: Preset[];
}

const SPANS = [
  { days: 1, label: '1 day' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 30, label: '1 month' },
] as const;

const FILTERS: { id: EpochFilter; label: string; param: string; hint: string }[] = [
  {
    id: 'historical-root',
    label: 'Boundaries',
    param: 'boundary',
    hint: 'Epochs divisible by 256, where the beacon state rolls up its historical roots. Every mainnet consensus fork from Altair to Fusaka activated on one of these.',
  },
  {
    id: 'round',
    label: 'Every 100th',
    param: 'round',
    hint: 'A coarse sweep of the window — useful for devnets and testnets, where the epoch is usually just announced round.',
  },
  {
    id: 'all',
    label: 'All',
    param: 'all',
    hint: 'All 225 epochs that start in each day of the window.',
  },
];

const DEFAULT_SPAN_DAYS = 30;
const DEFAULT_FILTER: EpochFilter = 'historical-root';

/** Rows past this are summarised rather than rendered; the ranking still covers them all. */
const RENDER_LIMIT = 500;
/**
 * Caps how many candidates are materialised. The walk itself still visits every epoch in
 * the window to report `total`, which the span control bounds at a month.
 */
const CANDIDATE_LIMIT = 20000;

/**
 * How available an hour is, as one sequential emerald ramp rather than a traffic light:
 * the eye should be pulled to the best rows, not to the worst cells. `night` is the ramp's
 * zero and takes no fill at all. Steps are validated per mode — monotone in lightness, a
 * readable gap between neighbours, and inside one hue (compositing emerald over the dark
 * surface drifts 61° toward teal, so the dark steps are solid, not translucent).
 */
const BAND_CLASSES: Record<HourBand, string> = {
  work: 'bg-emerald-400 text-emerald-950 dark:bg-emerald-400 dark:text-emerald-950',
  fringe: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-700 dark:text-emerald-50',
  edge: 'bg-emerald-50 text-slate-600 dark:bg-emerald-900 dark:text-emerald-200',
  night: 'text-slate-400',
};

/** Not a step on the ramp but a state: nobody is on duty, whatever the hour says. */
const WEEKEND_CLASSES = 'bg-slate-200 dark:bg-slate-900 text-slate-400';

const BAND_LABELS: Record<HourBand, string> = {
  work: 'Working hours',
  fringe: 'Early or late',
  edge: 'Off-hours',
  night: 'Asleep',
};

const BAND_HOURS: Record<HourBand, string> = {
  work: '09:00–17:59',
  fringe: '07:00–08:59, 18:00–20:59',
  edge: '06:00–06:59, 21:00–22:59',
  night: '23:00–05:59',
};

const cellClasses = (reading: ZoneReading): string =>
  reading.isWeekend ? WEEKEND_CLASSES : BAND_CLASSES[reading.band];

const zoneCells = (readings: readonly ZoneReading[]) =>
  readings.map((reading) => (
    <td
      key={reading.zone}
      className={`px-3 py-1.5 whitespace-nowrap font-mono ${cellClasses(reading)}`}
    >
      {reading.time}
      {/* The weekday only earns its place where it differs from the UTC row. */}
      {reading.dayOffset !== 0 && (
        <span className="ml-1.5 font-sans text-[10px] opacity-70">{reading.weekday}</span>
      )}
    </td>
  ));

/** Shaped to sit flush beside a `SegmentedControl`, at the density this table wants. */
const CONTROL_CLASSES =
  'px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500';

const LABEL_CLASSES =
  'text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider';

/**
 * Mainnet first, then the long-lived public testnets, each with the genesis the beacon
 * chain actually started at.
 *
 * Promoted devnets are left out: one is stood up per fork, runs that fork's testing and is
 * torn down, so there is never a future activation to schedule on it. `promotedLabel` is
 * non-null for exactly those, which keeps the next one out of here too.
 */
const NETWORKS: { key: string; label: string; genesisTime: number }[] = publicNetworks.flatMap(
  (network) =>
    network.genesisTime === null || network.promotedLabel !== null
      ? []
      : [
          {
            key: network.key,
            label: network.displayName.charAt(0).toUpperCase() + network.displayName.slice(1),
            genesisTime: network.genesisTime,
          },
        ],
);

interface ScoredCandidate {
  epoch: number;
  slot: number;
  timestamp: number;
  isHistoricalRootBoundary: boolean;
  /** Short weekday in UTC, so the fixed column scans like the zone ones. */
  utcWeekday: string;
  readings: ZoneReading[];
  score: CandidateScore;
}

/** The line a facilitator pastes into an issue or a PR. */
const summaryLine = (candidate: ScoredCandidate, networkLabel: string): string =>
  `${networkLabel} epoch ${candidate.epoch} (slot ${candidate.slot}) — ${formatUtc(candidate.timestamp)} UTC — timestamp ${candidate.timestamp}`;

/** `2026-10-19 14:59:35` split so the table can mute the parts nobody scans. */
const splitUtc = (timestamp: number): { date: string; time: string; seconds: string } => {
  const [date, clock] = formatUtc(timestamp).split(' ');
  return { date, time: clock.slice(0, 5), seconds: clock.slice(5) };
};

const ActivationSlotPicker: React.FC<ActivationSlotPickerProps> = ({ presets = [] }) => {
  const viewerZone = useMemo(() => localZone(), []);
  const today = useMemo(() => toIsoDate(Date.now() / 1000), []);

  // Every control lives in the query string, so any view can be linked to. Defaults drop
  // their param, which keeps a pristine URL clean; see `shareLink` for how a share
  // normalises the omitted ones back in.
  const [searchParams, setSearchParams] = useSearchParams();
  const update = (changes: Record<string, string | null>) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );

  const networkKey =
    NETWORKS.find((option) => option.key === searchParams.get('net'))?.key ??
    NETWORKS[0]?.key ??
    'mainnet';
  // A hand-mangled or truncated link should still open on something usable. The check has
  // to be stricter than "parses": an overflow date like 2026-02-30 parses as 2 March, which
  // would draw the table from a day the date control cannot display.
  const fromParam = searchParams.get('from');
  const startDate = fromParam && isIsoDate(fromParam) ? fromParam : today;
  const spanDays =
    SPANS.find((span) => String(span.days) === searchParams.get('span'))?.days ?? DEFAULT_SPAN_DAYS;
  const filter =
    FILTERS.find((option) => option.param === searchParams.get('epochs'))?.id ?? DEFAULT_FILTER;
  const sortByFit = searchParams.get('sort') === 'fit';

  const defaultZones = useMemo(
    () =>
      DEFAULT_ZONES.includes(viewerZone) ? [...DEFAULT_ZONES] : [...DEFAULT_ZONES, viewerZone],
    [viewerZone],
  );
  const zoneParam = searchParams.get('tz');
  const zones = useMemo(() => {
    if (zoneParam === null) return defaultZones;
    const decoded = decodeZones(zoneParam);
    // An empty `tz` is a deliberate "compare nothing"; a non-empty one that decodes to
    // nothing is a broken link, and defaults beat an empty board.
    if (decoded.length === 0 && zoneParam !== '') return defaultZones;
    return decoded;
  }, [zoneParam, defaultZones]);

  const expandedParam = Number(searchParams.get('epoch'));
  const expanded = Number.isInteger(expandedParam) && expandedParam > 0 ? expandedParam : null;

  const setNetworkKey = (value: string) =>
    update({ net: value === NETWORKS[0]?.key ? null : value });
  const setStartDate = (value: string) => update({ from: value === today ? null : value });
  const setSpanDays = (value: number) =>
    update({ span: value === DEFAULT_SPAN_DAYS ? null : String(value) });
  const setFilter = (value: EpochFilter) =>
    update({
      epochs: value === DEFAULT_FILTER ? null : FILTERS.find((o) => o.id === value)!.param,
    });
  const setSortByFit = (value: boolean) => update({ sort: value ? 'fit' : null });
  const setExpanded = (value: number | null) => update({ epoch: value === null ? null : String(value) });

  // The page is `client:only`, so the browser resolves `#activation-slots` before this
  // island exists and its own scroll goes nowhere. Repeat it once, after hydration.
  useEffect(() => {
    if (window.location.hash !== '#activation-slots') return;
    document.getElementById('activation-slots')?.scrollIntoView();
  }, []);

  const [addingZone, setAddingZone] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [sharedLink, setSharedLink] = useState(false);
  const [slotInput, setSlotInput] = useState('');
  const [timeInput, setTimeInput] = useState('');

  const network = NETWORKS.find((candidate) => candidate.key === networkKey) ?? NETWORKS[0];
  const genesisTime = network?.genesisTime ?? 0;

  const zoneOptions = useMemo(
    () => zoneOptionsWithLocal(viewerZone, zones),
    [viewerZone, zones],
  );

  // Columns follow the catalogue's order rather than the order they were ticked, so the
  // table reads west-to-east however the set was assembled.
  const shownZones = useMemo(
    () => zoneOptions.filter((option) => zones.includes(option.id)),
    [zoneOptions, zones],
  );
  /** Canonical order for the query string, so one comparison set is always one URL. */
  const orderZones = (ids: readonly string[]) =>
    zoneOptionsWithLocal(viewerZone, ids)
      .filter((option) => ids.includes(option.id))
      .map((option) => option.id);
  const unpickedZones = zoneOptions.filter((option) => !zones.includes(option.id));

  const { scored, total, before, after } = useMemo(() => {
    const from = utcMidnight(startDate);
    const to = from + spanDays * 24 * 60 * 60;
    if (Number.isNaN(from)) {
      return { scored: [] as ScoredCandidate[], total: 0, before: null, after: null };
    }

    const { candidates, total: found } = buildEpochCandidates({
      genesisTime,
      from,
      to,
      filter,
      limit: CANDIDATE_LIMIT,
    });

    const score = (candidate: EpochCandidate): ScoredCandidate => {
      const readings = shownZones.map((option) => readZone(candidate.timestamp, option.id));
      return {
        ...candidate,
        utcWeekday: readZone(candidate.timestamp, 'UTC').weekday,
        readings,
        score: scoreReadings(readings),
      };
    };

    // Boundaries sit 27.3 hours apart, so they drift later each day and skip one about
    // every eighth day: a window drawn to a calendar date can sit just past a good one, or
    // hold none at all. Bracketing it keeps the neighbours visible without making `From`
    // mean anything other than what it says. The denser filters need no such help.
    const brackets = filter === 'historical-root';
    const before = brackets ? candidateBefore(genesisTime, from, filter) : null;
    const after = brackets ? candidateAtOrAfter(genesisTime, to, filter) : null;

    return {
      scored: candidates.map(score),
      total: found,
      before: before ? score(before) : null,
      after: after ? score(after) : null,
    };
  }, [genesisTime, startDate, spanDays, filter, shownZones]);

  // Ranking runs over the whole window even when the table below is truncated, so the
  // shortlist can surface a candidate the rendered rows stop short of. The shortlist and
  // the Fit column sort share this one ordering.
  const ranked = useMemo(() => [...scored].sort(byFitThenQuality), [scored]);

  const visibleRows = (sortByFit ? ranked : scored).slice(0, RENDER_LIMIT);
  const shortlist = ranked.slice(0, 3);
  // The best any candidate in the window manages, so the column shows which rows tie for it.
  const bestWorking = scored.reduce((best, row) => Math.max(best, row.score.working), 0);

  const toggleZone = (id: string) => {
    const next = zones.includes(id) ? zones.filter((zone) => zone !== id) : [...zones, id];
    // An emptied set still has to round-trip, so it is written as an empty param rather
    // than dropped — dropping it would read back as the default set.
    update({ tz: encodeZones(orderZones(next)) });
  };

  /**
   * Shares the view exactly as it stands. Defaults are omitted from the URL while browsing,
   * but a link that leaves them out would re-resolve against the recipient's own defaults —
   * their timezone, their today — so the share writes every param explicitly first.
   */
  const shareLink = () => {
    update({
      net: networkKey,
      from: startDate,
      span: String(spanDays),
      epochs: FILTERS.find((option) => option.id === filter)!.param,
      sort: sortByFit ? 'fit' : null,
      tz: encodeZones(orderZones(zones)),
    });
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#activation-slots`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setSharedLink(true);
        setTimeout(() => setSharedLink(false), 2000);
      })
      .catch(() => setSharedLink(false));
  };

  const copySummary = (candidate: ScoredCandidate) => {
    navigator.clipboard
      .writeText(summaryLine(candidate, network?.label ?? networkKey))
      .then(() => {
        setCopied(candidate.epoch);
        setTimeout(() => setCopied(null), 2000);
      })
      .catch(() => setCopied(null));
  };

  const slotNumber = slotInput.trim() === '' ? null : Number(slotInput);
  const slotLookup =
    slotNumber === null || !Number.isFinite(slotNumber) || slotNumber < 0
      ? null
      : (() => {
          const timestamp = slotToTimestamp(Math.floor(slotNumber), genesisTime);
          return {
            timestamp,
            utc: formatUtc(timestamp),
            local: readZone(timestamp, viewerZone),
            epoch: slotToEpoch(Math.floor(slotNumber)),
          };
        })();

  const timeLookup =
    timeInput === ''
      ? null
      : (() => {
          const parsed = Date.parse(`${timeInput}:00Z`);
          if (Number.isNaN(parsed)) return null;
          const slot = timestampToSlot(parsed / 1000, genesisTime);
          return { slot, epoch: slotToEpoch(slot), timestamp: parsed / 1000 };
        })();

  const columnCount = 2 + shownZones.length + 1;

  /**
   * A candidate just outside the window, shown so the nearest boundary is never more than
   * a glance away. Its epoch is the control: clicking redraws the window to start on its
   * UTC date, which pulls it in as an ordinary row.
   */
  const outsideRow = (candidate: ScoredCandidate, side: 'before' | 'after') => {
    const utc = splitUtc(candidate.timestamp);
    return (
      <tr
        className={`bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 ${
          side === 'before'
            ? 'border-b border-dashed border-slate-300 dark:border-slate-600'
            : 'border-t border-dashed border-slate-300 dark:border-slate-600'
        }`}
      >
        <td className="px-3 py-1.5 whitespace-nowrap">
          <button
            onClick={() => setStartDate(toIsoDate(candidate.timestamp))}
            title="Redraw the window to start here"
            className="font-mono text-purple-700 dark:text-purple-300 underline decoration-dotted underline-offset-2 hover:text-purple-900 dark:hover:text-purple-200 transition-colors cursor-pointer"
          >
            {candidate.epoch.toLocaleString()}
          </button>
        </td>
        <td className="px-3 py-1.5 whitespace-nowrap font-mono">
          <span>{utc.date}</span> <span>{utc.time}</span>
          <span className="text-slate-400 dark:text-slate-500">{utc.seconds}</span>
          <span className="ml-1.5 font-sans text-[10px] text-slate-400 dark:text-slate-500">
            {candidate.utcWeekday}
          </span>
          <span className="ml-2 font-sans text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {side === 'before' ? 'before window' : 'after window'}
          </span>
        </td>
        {zoneCells(candidate.readings)}
        <td className="px-3 py-1.5 font-mono whitespace-nowrap text-slate-400 dark:text-slate-500">
          {candidate.score.working}
        </td>
      </tr>
    );
  };


  return (
    <div
      id="activation-slots"
      className="mb-10 scroll-mt-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
    >
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Activation Slot Picker
          </h2>
          <Tooltip text={sharedLink ? 'Copied!' : 'Copy link to slot picker'}>
            <button
              onClick={shareLink}
              className={`relative top-0.5 transition-colors cursor-pointer ${
                sharedLink ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label="Copy link to slot picker"
            >
              {sharedLink ? (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              )}
            </button>
          </Tooltip>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          A fork activates on an epoch boundary. Pick a window and see what hour each candidate
          lands on for the teams who have to watch it go out. Adapted from{' '}
          <a
            href="https://slots.symphonious.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-900 dark:hover:text-slate-100"
          >
            slot-finder
          </a>
          .
        </p>
      </div>

      {/* Window controls */}
      <div className="px-6 py-4 border-y border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div className="flex flex-col gap-1">
            <span className={LABEL_CLASSES}>Network</span>
            <SegmentedControl
              label="Network"
              value={networkKey}
              onChange={setNetworkKey}
              options={NETWORKS.map((option) => ({ value: option.key, label: option.label }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className={LABEL_CLASSES}>From (UTC)</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={CONTROL_CLASSES}
              />
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setStartDate(preset.date)}
                  className="text-xs text-slate-500 dark:text-slate-400 underline decoration-dotted underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title={`Start the window at ${preset.date}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className={LABEL_CLASSES}>Span</span>
            <SegmentedControl
              label="Span"
              value={String(spanDays)}
              onChange={(value) => setSpanDays(Number(value))}
              options={SPANS.map((span) => ({ value: String(span.days), label: span.label }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className={LABEL_CLASSES}>Candidates</span>
            <SegmentedControl
              label="Candidate epochs"
              value={filter}
              onChange={setFilter}
              options={FILTERS.map((option) => ({
                value: option.id,
                label: option.label,
                title: option.hint,
              }))}
            />
          </div>
        </div>

        {/* Comparison set — only what is being compared, with the rest a click away. */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`${LABEL_CLASSES} mr-1`}>Comparing</span>
          {shownZones.map((option) => (
            <button
              key={option.id}
              onClick={() => toggleZone(option.id)}
              title={`${option.id} — remove`}
              className="group px-2 py-0.5 text-xs rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors cursor-pointer"
            >
              {option.label}
              <span className="ml-1 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
                ×
              </span>
            </button>
          ))}
          {unpickedZones.length > 0 &&
            (addingZone ? (
              <>
                {unpickedZones.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleZone(option.id)}
                    title={option.id}
                    className="px-2 py-0.5 text-xs rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                  >
                    + {option.label}
                  </button>
                ))}
                <button
                  onClick={() => setAddingZone(false)}
                  className="px-1.5 py-0.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Done
                </button>
              </>
            ) : (
              <button
                onClick={() => setAddingZone(true)}
                className="px-2 py-0.5 text-xs rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
              >
                + Add zone
              </button>
            ))}
        </div>
      </div>

      {/* Shortlist — the ranking covers the whole window, including rows the table cuts. */}
      {shortlist.length > 0 && shownZones.length > 0 && (
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className={LABEL_CLASSES}>Best fit</span>
          {shortlist.map((candidate, index) => (
            <span
              key={candidate.epoch}
              className={`text-xs ${index === 0 ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <span className="font-mono">{splitUtc(candidate.timestamp).date}</span>{' '}
              <span className="font-mono">{splitUtc(candidate.timestamp).time}</span> UTC
              <span className="text-slate-400">
                {' '}
                · epoch {candidate.epoch.toLocaleString()} · {candidate.score.working}/
                {shownZones.length} working
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Candidate table */}
      <div className="overflow-x-auto">
        <div className="max-h-[30rem] overflow-y-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-700">
              <tr className="text-left text-slate-600 dark:text-slate-300">
                <th className="px-3 py-2 font-medium whitespace-nowrap">
                  <button
                    onClick={() => setSortByFit(false)}
                    className="cursor-pointer hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    Epoch{!sortByFit && <span className="ml-1 text-purple-600 dark:text-purple-400">↓</span>}
                  </button>
                </th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">UTC</th>
                {shownZones.map((option) => (
                  <th
                    key={option.id}
                    className="px-3 py-2 font-medium whitespace-nowrap"
                    title={option.id}
                  >
                    {option.label}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium whitespace-nowrap">
                  <Tooltip text="Zones where the activation lands in working hours on a weekday. Click to rank the whole window by it.">
                    <button
                      onClick={() => setSortByFit(true)}
                      className="cursor-pointer hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Fit
                      <span className="font-normal text-slate-400">
                        {' '}
                        /{shownZones.length}
                      </span>
                      {sortByFit && <span className="ml-1 text-purple-600 dark:text-purple-400">↓</span>}
                    </button>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {before && outsideRow(before, 'before')}
              {visibleRows.map((candidate) => {
                const utc = splitUtc(candidate.timestamp);
                const isOpen = expanded === candidate.epoch;
                return (
                  <React.Fragment key={candidate.epoch}>
                    <tr className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setExpanded(isOpen ? null : candidate.epoch)}
                          aria-expanded={isOpen}
                          className="font-mono text-slate-900 dark:text-slate-100 hover:text-purple-700 dark:hover:text-purple-300 transition-colors cursor-pointer"
                          title="Slot, timestamp and a line to copy"
                        >
                          {candidate.epoch.toLocaleString()}
                          <span className="ml-1 text-slate-400">
                            {isOpen ? '▾' : '▸'}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap font-mono">
                        <span className="text-slate-400">{utc.date}</span>{' '}
                        <span className="text-slate-800 dark:text-slate-100">{utc.time}</span>
                        <span className="text-slate-400">{utc.seconds}</span>
                        <span className="ml-1.5 font-sans text-[10px] text-slate-400">
                          {candidate.utcWeekday}
                        </span>
                      </td>
                      {zoneCells(candidate.readings)}
                      <td
                        className={`px-3 py-1.5 font-mono font-semibold whitespace-nowrap ${
                          candidate.score.working === bestWorking && bestWorking > 0
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {candidate.score.working}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50 dark:bg-slate-700/40">
                        <td
                          colSpan={columnCount}
                          className="px-3 py-2 text-slate-600 dark:text-slate-300"
                        >
                          <span className="font-mono">slot {candidate.slot.toLocaleString()}</span>
                          <span className="mx-2 text-slate-300 dark:text-slate-500">·</span>
                          <span className="font-mono">timestamp {candidate.timestamp}</span>
                          <span className="mx-2 text-slate-300 dark:text-slate-500">·</span>
                          <span className="font-mono">{formatUtc(candidate.timestamp)} UTC</span>
                          {candidate.isHistoricalRootBoundary && (
                            <>
                              <span className="mx-2 text-slate-300 dark:text-slate-500">·</span>
                              <span className="text-purple-600 dark:text-purple-400">
                                historical-root boundary
                              </span>
                            </>
                          )}
                          <button
                            onClick={() => copySummary(candidate)}
                            className="ml-3 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            {copied === candidate.epoch ? 'Copied' : 'Copy'}
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                  >
                    {before || after
                      ? 'No boundary starts in this window — the nearest on either side are shown.'
                      : 'No epochs in this window. Try a later date or a wider span.'}
                  </td>
                </tr>
              )}
              {after && outsideRow(after, 'after')}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-500 dark:text-slate-400">
        {(Object.keys(BAND_CLASSES) as HourBand[]).map((band) => (
          <span key={band} className="flex items-center gap-1.5" title={BAND_HOURS[band]}>
            <span
              className={`inline-block w-3 h-3 rounded-sm border border-slate-300 dark:border-slate-600 ${BAND_CLASSES[band]}`}
            />
            {BAND_LABELS[band]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block w-3 h-3 rounded-sm border border-slate-300 dark:border-slate-600 ${WEEKEND_CLASSES}`}
          />
          Weekend
        </span>
        {total > visibleRows.length && (
          <span className="ml-auto">
            Showing {visibleRows.length.toLocaleString()} of {total.toLocaleString()}; all are
            ranked.
          </span>
        )}
      </div>

      {/* Slot ↔ time — a second tool, folded away until it is wanted. */}
      <details className="border-t border-slate-200 dark:border-slate-700 group">
        <summary className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer select-none">
          Convert a slot or a time on {network?.label ?? networkKey}
        </summary>
        <div className="px-6 pb-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Slot</span>
              <input
                type="number"
                min="0"
                value={slotInput}
                onChange={(event) => setSlotInput(event.target.value)}
                placeholder="13164544"
                className={`${CONTROL_CLASSES} w-32 font-mono`}
              />
            </label>
            <div className="text-xs text-slate-600 dark:text-slate-300 font-mono">
              {slotLookup ? (
                <>
                  <div>{slotLookup.utc} UTC</div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {slotLookup.local.time} {slotLookup.local.weekday} local · epoch{' '}
                    {slotLookup.epoch.toLocaleString()} · ts {slotLookup.timestamp}
                  </div>
                </>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Time (UTC)</span>
              <input
                type="datetime-local"
                value={timeInput}
                onChange={(event) => setTimeInput(event.target.value)}
                className={`${CONTROL_CLASSES} font-mono`}
              />
            </label>
            <div className="text-xs text-slate-600 dark:text-slate-300 font-mono">
              {timeLookup ? (
                timeLookup.slot < 0 ? (
                  <span className="text-slate-400">Before genesis</span>
                ) : (
                  <>
                    <div>slot {timeLookup.slot.toLocaleString()}</div>
                    <div className="text-slate-500 dark:text-slate-400">
                      epoch {timeLookup.epoch.toLocaleString()} · ts {timeLookup.timestamp}
                    </div>
                  </>
                )
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
};

export default ActivationSlotPicker;
