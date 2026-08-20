import { Link } from '../navigation';
import { getUpgradePagePath } from '../../data/upgrades';
import type { CadenceTimeline as Timeline, TimelineFork } from '../../domain/cadence/timeline';

const PLOT_HEIGHT_PX = 200;
/** Headroom inside the plot so the tallest bar's count label has somewhere to sit. */
const BAR_MAX_PX = PLOT_HEIGHT_PX - 28;
/** Adjacent gaps share a boundary, so inset the abutting sides to keep a break. */
const GAP_INSET_PX = 2;

/**
 * A label centred on its mark, except at the axis edges where centring would
 * push the text outside the plot.
 */
const anchor = (offsetPct: number): { left: string; transform?: string } => {
  if (offsetPct < 6) return { left: '0%' };
  if (offsetPct > 88) return { left: '100%', transform: 'translateX(-100%)' };
  return { left: `${offsetPct}%`, transform: 'translateX(-50%)' };
};

/**
 * Hangs a label at 45° with its right end on the mark, so six of them fit across
 * a phone. Composed as one transform rather than Tailwind's rotate utility,
 * which would apply before the offset and swing the label off its mark.
 */
const hanging = (offsetPct: number) => ({
  left: `${offsetPct}%`,
  transformOrigin: '100% 0',
  transform: 'translateX(-100%) rotate(-45deg)',
});

interface AxisLabel {
  key: string;
  offsetPct: number;
  text: string;
  path: string | null;
  className: string;
}

const LabelText = ({ label }: { label: AxisLabel }) =>
  label.path ? (
    // Out of the tab order: the chart is `aria-hidden`, so focus landing here
    // would put a keyboard user on a node assistive tech has been told isn't
    // there. The links stay clickable, and the sr-only table carries the data.
    <Link to={label.path} tabIndex={-1} className="hover:underline">
      {label.text}
    </Link>
  ) : (
    <>{label.text}</>
  );

const ForkMark = ({ fork, isLast }: { fork: TimelineFork; isLast: boolean }) => (
  <div
    className="absolute bottom-0 flex flex-col items-center"
    style={{ left: `${fork.offsetPct}%`, transform: 'translateX(-50%)' }}
  >
    {fork.eips != null && (
      <div
        className={`mb-1 whitespace-nowrap text-xs font-medium tabular-nums ${
          isLast ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-300'
        }`}
      >
        {fork.eips}
        {/* No room to spell out the unit once the chart shrinks to a phone. */}
        {isLast && <span className="hidden font-normal sm:inline"> EIPs</span>}
      </div>
    )}
    <div
      className={`w-2.5 rounded-t-sm sm:w-3 ${
        isLast ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'
      }`}
      style={{ height: `${(fork.heightPct / 100) * BAR_MAX_PX}px` }}
    />
  </div>
);

interface Props {
  timeline: Timeline;
}

const CadenceTimeline = ({ timeline }: Props) => {
  const {
    origin,
    forks,
    gaps,
    yearTicks,
    nowPct,
    daysSinceLast,
    lastFork,
    medianGapDays,
    projection,
  } = timeline;
  const openGap = gaps.find((g) => g.open)!;

  // One list, rendered twice: centred above `sm`, hanging at 45° below it.
  const labels: AxisLabel[] = [
    {
      key: origin.id,
      offsetPct: origin.offsetPct,
      text: origin.name,
      path: getUpgradePagePath(origin.id),
      className: 'text-slate-400 dark:text-slate-400',
    },
    ...forks.map((fork, i) => ({
      key: fork.id,
      offsetPct: fork.offsetPct,
      text: fork.name,
      path: getUpgradePagePath(fork.id),
      className:
        i === forks.length - 1
          ? 'font-medium text-purple-600 dark:text-purple-400'
          : 'text-slate-600 dark:text-slate-200',
    })),
    ...(projection
      ? [
          {
            key: projection.id,
            offsetPct: projection.offsetPct,
            text: projection.name,
            path: projection.path,
            className: 'italic text-slate-400 dark:text-slate-400',
          },
        ]
      : []),
  ];

  return (
    <>
      {/* The chart is decorative duplication of the table below it. */}
      {/* Extra left room below `sm`: the origin sits near the axis start and its
          hanging label runs back past it. */}
      <div className="-mx-2 overflow-x-auto pb-1 pl-6 pr-2 sm:px-2" aria-hidden="true">
        {/* Above `sm` the chart holds a comfortable fixed width. Below it, it
            shrinks to the viewport instead of scrolling, which the fork labels
            pay for by hanging at an angle. */}
        <div className="sm:min-w-[640px]">
          {/* Year scale */}
          <div className="relative mb-1.5 h-4">
            {yearTicks.map((tick) => (
              <div
                key={tick.year}
                className="absolute bottom-0 text-xs tabular-nums text-slate-400 dark:text-slate-400"
                style={{ left: `${tick.offsetPct}%`, transform: 'translateX(-50%)' }}
              >
                {tick.year}
              </div>
            ))}
          </div>

          <div className="relative" style={{ height: `${PLOT_HEIGHT_PX}px` }}>
            {/* Credit, inside the plot so it survives a screenshot crop. */}
            <div className="pointer-events-none absolute inset-0 flex select-none items-center justify-center">
              <span className="inline-flex items-center gap-1.5 text-slate-900 opacity-[0.13] dark:text-slate-100 dark:opacity-[0.09]">
                <span className="text-sm font-bold" aria-hidden="true">
                  ⎇
                </span>
                {/* .forkcast-wordmark is the nav's monocolor filter. */}
                <img
                  src="/forkcast-logo.svg"
                  alt=""
                  width="907"
                  height="213"
                  loading="lazy"
                  className="forkcast-wordmark h-4 w-auto"
                />
              </span>
            </div>

            {/* The open stretch since the last fork. Drawn before the gridlines
                so it never hides one. */}
            <div
              className="absolute inset-y-0 bg-linear-to-r from-transparent to-purple-100 dark:to-purple-500/15"
              style={{ left: `${openGap.startPct}%`, width: `${openGap.widthPct}%` }}
            />

            {/* Year gridlines, so time passing is visible inside the plot. */}
            {yearTicks.map((tick) => (
              <div
                key={tick.year}
                className="absolute inset-y-0 border-l border-slate-200 dark:border-slate-600/50"
                style={{ left: `${tick.offsetPct}%` }}
              />
            ))}

            {/* The next upgrade, in the same grammar as a shipped fork but
                hollow: both its date and its EIP set can still move. */}
            {projection && (
              <div
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${projection.offsetPct}%`, transform: 'translateX(-50%)' }}
              >
                <div className="mb-1 whitespace-nowrap text-xs tabular-nums text-slate-400 dark:text-slate-400">
                  {projection.eips}
                </div>
                <div
                  className="w-2.5 rounded-t-sm border border-dashed border-slate-400 bg-transparent sm:w-3"
                  style={{ height: `${(projection.heightPct / 100) * BAR_MAX_PX}px` }}
                />
              </div>
            )}

            <div
              className="absolute inset-y-0 border-l border-dashed border-purple-400"
              style={{ left: `${nowPct}%` }}
            />
            {/* Left of its own line, rather than centred on it: the projection
                is always to the right of today, and centring puts this label on
                top of that bar's count whenever the estimate is close. */}
            <div
              className="absolute top-0 text-xs font-medium uppercase tracking-wider text-purple-600 dark:text-purple-400"
              style={{ left: `${nowPct}%`, transform: 'translateX(calc(-100% - 6px))' }}
            >
              today
            </div>

            {forks.map((fork, i) => (
              <ForkMark key={fork.id} fork={fork} isLast={i === forks.length - 1} />
            ))}
          </div>

          {/* Axis. Forks are marked by their bar; the origin has none, so it
              gets a tick below the line instead. */}
          <div className="relative h-px bg-slate-300 dark:bg-slate-600">
            <div
              className="absolute top-0 h-1.5 border-l border-slate-400"
              style={{ left: `${origin.offsetPct}%` }}
            />
          </div>

          {/* Fork names, the origin among them. Two layers rather than one
              responsive layer, because the positioning is inline `style` and an
              inline style can't carry a breakpoint. */}
          <div className="relative h-14 sm:h-6">
            <div className="sm:hidden">
              {labels.map((label) => (
                <div
                  key={label.key}
                  className={`absolute top-0 whitespace-nowrap text-[10px] ${label.className}`}
                  style={hanging(label.offsetPct)}
                >
                  <LabelText label={label} />
                </div>
              ))}
            </div>
            <div className="hidden sm:block">
              {labels.map((label) => (
                <div
                  key={label.key}
                  className={`absolute top-1 whitespace-nowrap text-sm ${label.className}`}
                  style={anchor(label.offsetPct)}
                >
                  <LabelText label={label} />
                </div>
              ))}
            </div>
          </div>

          {/* Gap durations, bracketed between the two upgrades they separate. */}
          <div className="relative mt-1 h-5">
            {gaps.map((gap, i) => {
              const stroke = gap.open
                ? 'border-purple-300 dark:border-purple-500'
                : 'border-slate-300 dark:border-slate-500';
              // Only inset a side that abuts another bracket; the outer ends sit
              // on the origin tick and the today line.
              const leftInset = i === 0 ? 0 : GAP_INSET_PX;
              const rightInset = gap.open ? 0 : GAP_INSET_PX;
              return (
                <div
                  key={gap.toFork ?? 'open'}
                  className="absolute inset-y-0"
                  style={{
                    left: `calc(${gap.startPct}% + ${leftInset}px)`,
                    width: `calc(${gap.widthPct}% - ${leftInset + rightInset}px)`,
                  }}
                >
                  <div className={`absolute left-0 top-0 h-1.5 border-l ${stroke}`} />
                  <div className={`absolute right-0 top-0 h-1.5 border-r ${stroke}`} />
                  <div className={`absolute inset-x-0 top-1.5 border-t border-dashed ${stroke}`} />
                  <div
                    className={`absolute inset-x-0 top-0 text-center text-[10px] tabular-nums sm:text-xs ${
                      gap.open
                        ? 'font-medium text-purple-600 dark:text-purple-400'
                        : 'text-slate-400 dark:text-slate-400'
                    }`}
                  >
                    <span className="bg-white px-1 sm:px-1.5 dark:bg-slate-800">{gap.days}d</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {projection && (
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2 shrink-0 rounded-sm border border-dashed border-slate-400" />
            <span>
              {projection.name}: expected late Q4,{' '}
              <span className="tabular-nums">{projection.eips}</span> EIPs scheduled
            </span>
          </span>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-slate-400 dark:text-slate-400">
        Position is activation date, bar height is EIPs shipped. Median gap since {origin.name} is{' '}
        <span className="tabular-nums">{medianGapDays}</span> days.{' '}
        {projection && (
          <>
            {projection.name}&apos;s date and EIP count can still change; see{' '}
            <Link
              to="/schedule"
              className="underline hover:text-slate-600 dark:hover:text-slate-300"
            >
              the schedule
            </Link>
            .
          </>
        )}
      </p>

      {/* The chart's content for screen readers. Also the only crawlable copy of
          these numbers, since the page renders client-side.

          `sr-only` goes on a wrapping block rather than the table itself: its
          `width:1px` is only a *minimum* on a table box, so applied directly the
          nowrap caption widens the page. */}
      <div className="sr-only">
        <table>
          <caption>
            Mainnet upgrades since {origin.name} ({origin.activationDate}): activation date,
            included EIPs, and days since the previous upgrade.
          </caption>
          <thead>
            <tr>
              <th scope="col">Upgrade</th>
              <th scope="col">Activated</th>
              <th scope="col">Included EIPs</th>
              <th scope="col">Days since previous</th>
            </tr>
          </thead>
          <tbody>
            {forks.map((fork) => (
              <tr key={fork.id}>
                <th scope="row">{fork.name}</th>
                <td>{fork.activationDate}</td>
                <td>{fork.eips ?? 'Not tracked'}</td>
                <td>{fork.gapDays}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Today</th>
              <td>No upgrade yet</td>
              <td>Not applicable</td>
              <td>
                {daysSinceLast} days since {lastFork.name}
              </td>
            </tr>
            {projection && (
              <tr>
                <th scope="row">{projection.name} (estimated, not announced)</th>
                <td>{projection.date.toLocaleDateString('en-US', { dateStyle: 'long' })}</td>
                <td>{projection.eips} scheduled</td>
                <td>{projection.gapDays}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default CadenceTimeline;
