import { useEffect, useState } from 'react';
import { Link } from './navigation';
import { networkUpgrades, getUpgradePagePath, NetworkUpgrade } from '../data/upgrades';
import { parseShortDate, daysBetween } from './schedule/forkDateCalculator';

// Strip the trailing "Upgrade" so "Fusaka Upgrade" reads as "Fusaka".
const short = (name: string): string => name.replace(/\s+Upgrade$/i, '');

// Live mainnet upgrades with a concrete activation date, oldest → newest.
// This resolves to The Merge → Shapella → Dencun → Pectra → Fusaka: the modern
// (post-Merge) cadence that is actually comparable to the current wait. Sourced
// from the same upgrade data the rest of Forkcast uses.
const timeline = networkUpgrades
  .filter(
    (u): u is NetworkUpgrade & { activationDate: string } =>
      u.status === 'Live' && !!u.activationDate && parseShortDate(u.activationDate) !== null,
  )
  .map((u) => ({ upgrade: u, date: parseShortDate(u.activationDate)! }))
  .sort((a, b) => a.date.getTime() - b.date.getTime());

// The gap (in days) leading up to each upgrade after The Merge.
const gaps = timeline.slice(1).map((entry, i) => ({
  name: short(entry.upgrade.name),
  days: daysBetween(timeline[i].date, entry.date),
}));

const last = timeline[timeline.length - 1];
const pmAvg = gaps.length ? Math.round(gaps.reduce((sum, g) => sum + g.days, 0) / gaps.length) : 0;
const pmMin = gaps.length ? Math.min(...gaps.map((g) => g.days)) : 0;
const pmMax = gaps.length ? Math.max(...gaps.map((g) => g.days)) : 0;

const nextUpgrade = networkUpgrades.find((u) => u.status === 'Upcoming');

interface BarRowProps {
  label: string;
  days: number;
  chartMax: number;
  highlight?: boolean;
}

const BarRow = ({ label, days, chartMax, highlight = false }: BarRowProps) => (
  <div className="flex items-center gap-3">
    <div className="w-24 shrink-0 truncate text-right text-xs sm:text-sm text-slate-600 dark:text-slate-400">
      {label}
    </div>
    <div className="relative h-2.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-700/60">
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out ${
          highlight ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
        style={{ width: `${Math.min(100, (days / chartMax) * 100)}%` }}
      />
    </div>
    <div
      className={`w-12 shrink-0 text-right text-xs sm:text-sm tabular-nums ${
        highlight ? 'font-medium text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'
      }`}
    >
      {days.toLocaleString()}
    </div>
  </div>
);

const CadencePage = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // The day count only changes at midnight; a one-minute cadence flips it
    // promptly without busy-looping.
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const sinceDays = Math.max(0, daysBetween(last.date, now));
  const chartMax = Math.max(pmMax, pmAvg, sinceDays) * 1.12 || 1;
  const avgFraction = pmAvg / chartMax;
  // Track lane starts after the w-24 label (+gap-3) and ends before the w-12
  // value (+gap-3), so the average line lands at the same scale as the bars.
  const avgLeft = `calc(6.75rem + (100% - 10.5rem) * ${avgFraction})`;

  const diff = sinceDays - pmAvg;
  const absDiff = Math.abs(diff);
  const dayWord = absDiff === 1 ? 'day' : 'days';
  const lastPagePath = getUpgradePagePath(last.upgrade.id);
  const lastShort = short(last.upgrade.name);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight mb-2">
            Upgrade Cadence
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            How long it's been since Ethereum's last network upgrade — and how that pace compares to
            the rhythm since The Merge.
          </p>
        </div>

        {/* Hero: days since the last upgrade */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-12 text-center">
          <div className="mb-4 text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Days since {lastShort}
          </div>
          <div className="text-7xl sm:text-8xl font-light leading-none tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
            {sinceDays.toLocaleString()}
          </div>
          <div className="mt-6 text-sm text-slate-600 dark:text-slate-400">
            {lastPagePath ? (
              <Link
                to={lastPagePath}
                className="font-medium text-purple-600 dark:text-purple-400 hover:underline"
              >
                {last.upgrade.name}
              </Link>
            ) : (
              <span className="font-medium text-slate-700 dark:text-slate-300">{last.upgrade.name}</span>
            )}
            <span className="text-slate-400 dark:text-slate-500"> · activated {last.upgrade.activationDate}</span>
          </div>
        </div>

        {/* Post-Merge cadence chart */}
        <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 sm:p-8">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Days between upgrades since The Merge
          </h2>

          <div className="relative pt-6">
            {/* Average reference line + label */}
            <div
              className="pointer-events-none absolute top-6 bottom-1 z-10 border-l border-dashed border-slate-300 dark:border-slate-500"
              style={{ left: avgLeft }}
            />
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap text-[0.65rem] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 tabular-nums"
              style={{ left: avgLeft }}
            >
              avg {pmAvg}
            </div>

            {/* Bars */}
            <div className="space-y-3">
              {gaps.map((g) => (
                <BarRow key={g.name} label={g.name} days={g.days} chartMax={chartMax} />
              ))}
              <BarRow label={`since ${lastShort}`} days={sinceDays} chartMax={chartMax} highlight />
            </div>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {absDiff <= 2 ? (
              <>
                Right around the{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">{pmAvg}-day</span>{' '}
                post-Merge average.
              </>
            ) : (
              <>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {absDiff.toLocaleString()} {dayWord}
                </span>{' '}
                {diff < 0 ? 'under' : 'beyond'} the{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">{pmAvg}-day</span>{' '}
                post-Merge average.
              </>
            )}{' '}
            The last {gaps.length} upgrades came{' '}
            <span className="tabular-nums">
              {pmMin}–{pmMax}
            </span>{' '}
            days apart.
          </p>
        </div>

        {/* Next upgrade + source */}
        {nextUpgrade && (
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Next up:{' '}
            <Link
              to={nextUpgrade.path}
              className="font-medium text-purple-600 dark:text-purple-400 hover:underline"
            >
              {short(nextUpgrade.name)}
            </Link>{' '}
            — expected {nextUpgrade.activationDate}
          </p>
        )}

        <p className="mt-10 text-center text-xs text-slate-400 dark:text-slate-500">
          Activation dates from Forkcast's{' '}
          <Link to="/upgrades" className="underline hover:text-slate-600 dark:hover:text-slate-300">
            upgrade data
          </Link>
          . Cadence measured across mainnet upgrades since The Merge.
        </p>
      </div>
    </div>
  );
};

export default CadencePage;
