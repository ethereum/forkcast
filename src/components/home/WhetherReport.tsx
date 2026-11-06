import React from 'react';
import { Link } from '../navigation';
import { getUpgradePagePath, networkUpgrades, shortUpgradeName } from '../../data/upgrades';
import {
  whetherReport,
  type WhetherReportAction,
  type WhetherReportItem,
} from '../../data/whether-report';
import { linkKind, parseBriefText } from '../../domain/home/briefText';
import { formatDate, parseDate } from '../../utils/date';

const upgradeById = new Map(networkUpgrades.map((upgrade) => [upgrade.id, upgrade]));

const LINK_CLASS =
  'underline decoration-1 underline-offset-2 hover:text-slate-900 dark:hover:text-slate-200 transition-colors';

/** A heading that links where it has somewhere to go, and is plain text where it doesn't. */
const Heading: React.FC<{ href?: string; children: React.ReactNode }> = ({ href, children }) => {
  const className = 'text-sm font-medium text-slate-900 dark:text-slate-100';
  if (!href) return <span className={className}>{children}</span>;

  const hover = `${className} hover:text-purple-600 dark:hover:text-purple-400 transition-colors`;
  return href.startsWith('/') ? (
    <Link to={href} className={hover}>
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={hover}>
      {children}
    </a>
  );
};

/**
 * The byline. Self-hosted rather than hotlinked from the profile it came from: that URL
 * rotates, and it would route every visitor through a third party to render a 20px circle.
 */
const Byline = () => (
  <img
    src="/wolovim.jpg"
    alt=""
    width={20}
    height={20}
    className="w-5 h-5 shrink-0 rounded-full ring-1 ring-purple-200 dark:ring-purple-900/70"
  />
);

/** The brief's prose: a site path stays in the app, an http URL opens away from it. */
const Body: React.FC<{ text: string }> = ({ text }) => (
  <>
    {parseBriefText(text).map((segment, index) => {
      if (!segment.href) return <React.Fragment key={index}>{segment.text}</React.Fragment>;
      return segment.external ? (
        <a
          key={index}
          href={segment.href}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {segment.text}
        </a>
      ) : (
        <Link key={index} to={segment.href} className={LINK_CLASS}>
          {segment.text}
        </Link>
      );
    })}
  </>
);

/**
 * The asks an item carries, set below its prose as chips rather than left in the sentence
 * that explains them. A reader scanning the brief should be able to see there is something
 * to do here without reading to the end of the line.
 *
 * A `mailto:` is opened in place: handing an address to the mail client is the whole
 * action, and a new tab for it would open and sit there empty.
 */
const Actions: React.FC<{ actions: readonly WhetherReportAction[] }> = ({ actions }) => {
  const className =
    // py-1 rather than py-0.5: 22px of chip is under the 24px minimum target size.
    'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium border ' +
    'border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400 ' +
    'dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/40 ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500 transition-colors';

  const chips = actions.flatMap((action) => {
    const kind = linkKind(action.href);
    if (!kind) return [];

    const label = (
      <>
        {action.label}
        <span aria-hidden="true">&rarr;</span>
      </>
    );

    return [
      kind === 'internal' ? (
        <Link key={action.href} to={action.href} className={className}>
          {label}
        </Link>
      ) : (
        <a
          key={action.href}
          href={action.href}
          {...(kind === 'external' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className={className}
        >
          {label}
        </a>
      ),
    ];
  });

  if (chips.length === 0) return null;
  return <div className="mt-1.5 flex flex-wrap gap-1.5">{chips}</div>;
};

/**
 * The hand-written summary that opens the homepage. Deliberately the smallest block on the
 * page: one box, one line of chrome, one sentence an item. At the weight of the generated
 * sections below it, it stops reading as a brief.
 */
const WhetherReport: React.FC = () => {
  const { date, tagline, items } = whetherReport;
  if (items.length === 0) return null;

  /**
   * An item's own `title` wins the heading; the fork it names wins the link. The link comes
   * from `getUpgradePagePath` rather than the upgrade's `path`, since a fork without a
   * public page has no route to point at.
   */
  const chrome = (item: WhetherReportItem) => {
    const upgrade = item.fork ? upgradeById.get(item.fork) : undefined;
    return {
      label: item.title ?? (upgrade ? shortUpgradeName(upgrade.name) : (item.fork ?? '')),
      href: (item.fork ? getUpgradePagePath(item.fork) : item.href) ?? undefined,
    };
  };

  return (
    <div className="mb-12 bg-gradient-to-br from-purple-50 via-white to-cyan-50 dark:from-purple-950/40 dark:via-slate-800 dark:to-cyan-950/30 border border-purple-200 dark:border-purple-900/60 rounded-lg px-4 py-3">
      {/* Wraps to a second line, standfirst first and then the date, below about 760px. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pb-2 mb-2 border-b border-purple-200/60 dark:border-purple-900/40">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Byline />
          <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            wolovim&rsquo;s Whether Report
          </h2>
          {/* Not slate-500: that is a background step in the dark palette, see index.css. */}
          <span aria-hidden="true" className="text-xs text-slate-600 dark:text-slate-400">
            &middot;
          </span>
          <p className="text-xs italic text-slate-600 dark:text-slate-400">{tagline}</p>
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-400">
          Updated {formatDate(parseDate(date))}
        </span>
      </div>

      <ul className="space-y-1.5 list-none">
        {items.map((item, index) => {
          const { label, href } = chrome(item);
          return (
            <li
              key={item.fork ?? item.title ?? index}
              className="flex gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
            >
              {/* The marker is its own column so a wrapped line hangs under the text. */}
              <span
                aria-hidden="true"
                className="shrink-0 select-none text-purple-600 dark:text-purple-400"
              >
                &rarr;
              </span>
              <div className="min-w-0">
                <Heading href={href}>{label}</Heading>
                {': '}
                <Body text={item.body} />
                {item.actions && <Actions actions={item.actions} />}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default WhetherReport;
