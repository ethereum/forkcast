import { useEffect, useState } from 'react';
import { Link } from './navigation';
import CadenceTimeline from './cadence/CadenceTimeline';
import { networkUpgrades } from '../data/upgrades';
import {
  buildCadenceStats,
  buildCadenceTimeline,
  shortUpgradeName,
  type CadenceStats,
} from '../domain/cadence/timeline';

const nextUpgrade = networkUpgrades.find((u) => u.status === 'Upcoming');

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Ticks once at the next local midnight, then daily — the day count is the only live value. */
const useToday = () => {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const midnight = new Date(today);
    midnight.setHours(24, 0, 0, 0);
    const id = setTimeout(() => setToday(new Date()), midnight.getTime() - Date.now() + 1000);
    return () => clearTimeout(id);
  }, [today]);

  return today;
};

/** Credit level with each chart's heading, so a cropped screenshot still carries it. */
const ChartMark = () => (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute right-0 top-1 inline-flex select-none items-center gap-1 text-slate-900 opacity-[0.13] dark:text-slate-100 dark:opacity-25"
  >
    <span className="text-[0.65rem] font-bold">⎇</span>
    {/* .forkcast-wordmark is the nav's monocolor filter. */}
    <img
      src="/forkcast-logo.svg"
      alt=""
      width="907"
      height="213"
      loading="lazy"
      className="forkcast-wordmark h-3 w-auto"
    />
  </span>
);

type BarVariant = 'normal' | 'highlight' | 'projected';

const BarRow = ({
  label,
  value,
  max,
  display,
  variant = 'normal',
}: {
  label: string;
  value: number;
  max: number;
  display: string;
  variant?: BarVariant;
}) => (
  // The two gutters are fixed-width, so on a narrow screen they crowd out the bar
  // — the only thing on the row that actually encodes the number. They give up
  // width below `sm` and are unchanged from there up.
  <div className="flex items-center gap-2 text-sm sm:gap-3">
    <div
      className={`w-16 shrink-0 truncate sm:w-24 ${
        variant === 'projected'
          ? 'italic text-slate-400 dark:text-slate-400'
          : 'text-slate-600 dark:text-slate-200'
      }`}
    >
      {label}
    </div>
    <div className="h-2.5 flex-1 rounded-sm bg-slate-100 sm:h-3 dark:bg-slate-700/60">
      <div
        className={`h-full rounded-r-sm ${
          variant === 'projected'
            ? 'border border-dashed border-slate-400'
            : variant === 'highlight'
              ? 'bg-purple-500'
              : 'bg-slate-300 dark:bg-slate-600'
        }`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
    <div
      className={`w-20 shrink-0 text-right tabular-nums sm:w-24 ${
        variant === 'projected'
          ? 'text-slate-400 dark:text-slate-400'
          : variant === 'highlight'
            ? 'font-medium text-purple-600 dark:text-purple-400'
            : 'text-slate-500 dark:text-slate-300'
      }`}
    >
      {display}
    </div>
  </div>
);

const CadencePage = () => {
  const today = useToday();
  const timeline = buildCadenceTimeline(today);

  if (!timeline) return null;

  const stats = buildCadenceStats(timeline);
  const { projection } = timeline;
  // `rates` is empty until a fork has both a gap and a known EIP count, so the
  // leader is optional rather than assumed.
  const latest = stats.rates.at(-1);
  const priorMax = Math.max(...stats.rates.slice(0, -1).map((r) => r.perMonth), 0);
  const multiple = latest && priorMax > 0 ? latest.perMonth / priorMax : 0;

  // The projected fork shares the rate chart so the trend is readable end to end,
  // but stays visually hollow — its EIP set isn't final.
  const rateRows = [
    ...stats.rates.map((rate) => ({ ...rate, projected: false })),
    ...(projection
      ? [
          {
            name: projection.name,
            eips: projection.eips,
            days: projection.gapDays,
            perMonth: projection.perMonth,
            projected: true,
          },
        ]
      : []),
  ];
  const rateMax = Math.max(...rateRows.map((r) => r.perMonth));

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-2xl font-light tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            Is Ethereum shipping faster?
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-200">
            Every mainnet upgrade since The Merge.
          </p>
        </div>

        {/* The whole argument in one object: gaps narrowing, bars growing. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 dark:border-slate-700 dark:bg-slate-800">
          <CadenceTimeline timeline={timeline} />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 dark:border-slate-700 dark:bg-slate-800">
          <div className="relative">
            <ChartMark />
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
              EIP shipping rate
            </h2>
            <div className="space-y-2">
              {rateRows.map((rate) => (
                <BarRow
                  key={rate.name}
                  label={rate.name}
                  value={rate.perMonth}
                  max={rateMax}
                  display={`${rate.projected ? '~' : ''}${rate.perMonth.toFixed(2)}/mo`}
                  variant={
                    rate.projected
                      ? 'projected'
                      : rate.name === latest?.name
                        ? 'highlight'
                        : 'normal'
                  }
                />
              ))}
            </div>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-slate-600 dark:text-slate-200">
            {latest && multiple > 1.2 && (
              <>
                <span className="font-medium text-slate-900 dark:text-slate-100">{latest.name}</span>{' '}
                shipped <span className="tabular-nums">{latest.eips}</span> EIPs in{' '}
                <span className="tabular-nums">{latest.days}</span> days, roughly{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {multiple.toFixed(1)}x
                </span>{' '}
                the rate of any upgrade before it.{' '}
              </>
            )}
            {projection && (
              <>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {projection.name}
                </span>
                's row is an estimate: neither its date nor its EIP list is final. On today's estimate
                of {formatDate(projection.date)} with{' '}
                <span className="tabular-nums">{projection.eips}</span> EIPs scheduled, it would be{' '}
                <span className="tabular-nums">{projection.gapDays}</span> days at{' '}
                <span className="tabular-nums">{projection.perMonth.toFixed(2)}</span>/mo.
              </>
            )}
          </p>

          <p className="mt-3 text-xs leading-relaxed text-slate-400 dark:text-slate-400">
            Rate is a fork's included EIPs over the days since the previous fork. Only{' '}
            {stats.gapDays.length} intervals since The Merge (median{' '}
            <span className="tabular-nums">{timeline.medianGapDays}</span> days), so read the trend
            loosely. {projection && <>{projection.name} counts scheduled EIPs, not shipped. </>}
          </p>
        </div>

        <SpecCharts spec={stats.spec} specProjection={stats.specProjection} />

        {nextUpgrade && (
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-300">
            Next up:{' '}
            <Link
              to={nextUpgrade.path}
              className="font-medium text-purple-600 hover:underline dark:text-purple-400"
            >
              {shortUpgradeName(nextUpgrade.name)}
            </Link>{' '}
            ·{' '}
            <Link to="/schedule" className="underline hover:text-slate-700 dark:hover:text-slate-300">
              see the projected schedule
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default CadencePage;

/**
 * Secondary to the charts above: EIP counts are the headline, spec volume is the
 * check on them. A component rather than inline JSX so its derivations — which
 * all assume at least one fork with spec data — sit behind the emptiness check
 * instead of running ahead of it.
 */
const SpecCharts = ({
  spec,
  specProjection,
}: {
  spec: CadenceStats['spec'];
  specProjection: CadenceStats['specProjection'];
}) => {
  if (spec.length === 0) return null;

  // Same treatment as the rate chart: the projection shares the scale so the
  // trend reads end to end, but never takes the highlight, which marks the
  // leading *shipped* fork.
  const specRows = [
    ...spec.map((s) => ({ ...s, projected: false })),
    ...(specProjection ? [{ ...specProjection, projected: true }] : []),
  ];
  const linesMax = Math.max(...specRows.map((s) => s.lines), 0);
  const linesPerMonthMax = Math.max(...specRows.map((s) => s.linesPerMonth), 0);
  const bulkiest = spec.reduce((a, b) => (b.lines > a.lines ? b : a));
  const densest = spec.reduce((a, b) => (b.linesPerMonth > a.linesPerMonth ? b : a));
  const latestSpec = spec[spec.length - 1];
  const lighterBy = Math.round(((bulkiest.lines - latestSpec.lines) / bulkiest.lines) * 100);

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 p-4 sm:p-8 dark:border-slate-700">
      <div className="relative">
        <ChartMark />
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
          Spec size
        </h2>
        <div className="space-y-2">
          {specRows.map((s) => (
            <BarRow
              key={s.name}
              label={s.name}
              value={s.lines}
              max={linesMax}
              display={`${s.projected ? '~' : ''}${s.lines.toLocaleString()}`}
              variant={s.projected ? 'projected' : s.name === bulkiest.name ? 'highlight' : 'normal'}
            />
          ))}
        </div>
      </div>

      {lighterBy > 0 && (
        <p className="mt-6 text-sm leading-relaxed text-slate-600 dark:text-slate-200">
          EIP count says little about how much a fork actually specifies.{' '}
          <span className="font-medium text-slate-900 dark:text-slate-100">{latestSpec.name}</span>{' '}
          shipped more EIPs than {bulkiest.name} on{' '}
          <span className="tabular-nums">{lighterBy}%</span> less spec text.
        </p>
      )}

      <div className="relative mt-8">
        <ChartMark />
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
          Spec lines per month
        </h2>
        <div className="space-y-2">
          {specRows.map((s) => (
            <BarRow
              key={s.name}
              label={s.name}
              value={s.linesPerMonth}
              max={linesPerMonthMax}
              display={`${s.projected ? '~' : ''}${Math.round(s.linesPerMonth).toLocaleString()}/mo`}
              variant={s.projected ? 'projected' : s.name === densest.name ? 'highlight' : 'normal'}
            />
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-slate-600 dark:text-slate-200">
        Measured against the length of each cycle,{' '}
        <span className="font-medium text-slate-900 dark:text-slate-100">{densest.name}</span> leads
        the shipped forks at{' '}
        <span className="tabular-nums">{Math.round(densest.linesPerMonth).toLocaleString()}</span>{' '}
        lines a month.
        {specProjection && (
          <>
            {' '}
            {specProjection.name} would clear both charts, but its specs are still being edited and
            its EIP list is not final.
          </>
        )}
      </p>

      <p className="mt-3 text-xs leading-relaxed text-slate-400 dark:text-slate-400">
        Lines of specification markdown across each fork's included EIPs. A crude size proxy: it
        counts prose and test vectors alongside the spec itself, and says nothing about
        implementation difficulty.
      </p>
    </div>
  );
};
