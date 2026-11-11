import React from 'react';
import { Link, useSearchParams } from './navigation';
import { EipDrawerProvider, preloadEipDrawer, useOpenEipOnClick } from './eip/EipDrawerProvider';
import {
  northStars,
  researchAreas,
  STRAWMAP_URL,
  type NorthStarId,
  type ResearchArea,
  type ResearchLink,
  type ResearchLinkKind,
  type Headliner,
} from '../data/research';

/**
 * One accent per goal, used only as a small dot — in the goals list, and again
 * beside each goal named on a research area. Enough colour to tie the two
 * together at a glance, not enough to turn a dozen rows into confetti.
 */
const GOAL_DOT: Record<NorthStarId, string> = {
  'fast-l1': 'bg-amber-500 dark:bg-amber-400',
  'gigagas-l1': 'bg-blue-500 dark:bg-blue-400',
  'teragas-l2': 'bg-emerald-500 dark:bg-emerald-400',
  'post-quantum-l1': 'bg-fuchsia-500 dark:bg-fuchsia-400',
  'private-l1': 'bg-indigo-500 dark:bg-indigo-400',
};

/** What the reader is being sent to. `eip` is implied by a link's `eipId`. */
const LINK_KIND_LABEL: Record<ResearchLinkKind, string> = {
  research: 'Research',
  spec: 'Spec',
  notes: 'Notes',
  site: 'Site',
};

const northStarById = new Map(northStars.map((star) => [star.id, star]));

const AREAS_PER_GOAL = new Map<NorthStarId, number>(
  northStars.map((star) => [
    star.id,
    researchAreas.filter((area) => area.northStars.includes(star.id)).length,
  ]),
);

const chipClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
    active
      ? 'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-700 dark:bg-purple-500/15 dark:text-purple-200'
      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100'
  }`;

const purpleLinkClass =
  'text-purple-700 underline decoration-1 underline-offset-2 transition-colors hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-200';

const listClass =
  'divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800';

/** Carries its weight through case and letter-spacing, not through contrast. */
const HeadlinerBadge: React.FC<{ title?: string }> = ({
  title = 'Carries a proposal prominent enough to anchor a whole upgrade',
}) => (
  <span
    title={title}
    className="inline-block shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-200"
  >
    Headliner
  </span>
);

const Dot: React.FC<{ id: NorthStarId; className?: string }> = ({ id, className = '' }) => (
  <span aria-hidden="true" className={`shrink-0 rounded-full ${GOAL_DOT[id]} ${className}`} />
);

const ExternalIcon = () => (
  <svg
    className="h-3 w-3 shrink-0 opacity-60"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

/**
 * Opens the shared drawer rather than navigating, so a reader can check what an
 * EIP says without losing their place in the list. Still a real `<Link>` with the
 * `/eips/{id}` href, and the handler bails on modifier and middle clicks, so
 * cmd-click still opens a tab.
 *
 * No `enabled` guard: the drawer renders nothing for an EIP Forkcast doesn't
 * carry, and a test asserts every `eipId` here resolves in `eipsData`.
 */
const EipReadingLink: React.FC<{ eipId: number; label: string; className: string }> = ({
  eipId,
  label,
  className,
}) => {
  const openDrawer = useOpenEipOnClick(eipId);
  return (
    <Link
      to={`/eips/${eipId}`}
      onClick={openDrawer}
      onMouseEnter={preloadEipDrawer}
      onFocus={preloadEipDrawer}
      className={className}
    >
      {label}
    </Link>
  );
};

/**
 * Two columns: what the document is, then what it says. The left column is the
 * point — a formal spec and a forum thread carry very different weight, and a
 * bare list of titles gives a reader no way to tell them apart.
 */
const AreaLink: React.FC<{ link: ResearchLink; isHeadliner: boolean }> = ({
  link,
  isHeadliner,
}) => (
  <li className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
    <span className="shrink-0 text-xs text-slate-500 tabular-nums dark:text-slate-400 sm:w-24">
      {link.eipId !== undefined ? `EIP-${link.eipId}` : LINK_KIND_LABEL[link.kind ?? 'site']}
    </span>
    {link.eipId !== undefined ? (
      <EipReadingLink
        eipId={link.eipId}
        label={link.label}
        className={`text-[13px] ${purpleLinkClass}`}
      />
    ) : (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-baseline gap-1.5 text-[13px] ${purpleLinkClass}`}
      >
        {link.label}
        <ExternalIcon />
      </a>
    )}
    {isHeadliner && <HeadlinerBadge title="This is the headliner proposal for this area" />}
  </li>
);

const GoalTag: React.FC<{ id: NorthStarId }> = ({ id }) => {
  const star = northStarById.get(id);
  if (!star) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
      <Dot id={id} className="h-1.5 w-1.5" />
      {star.label}
    </span>
  );
};

/**
 * Reading order is name, then the problem, then the goals it serves — the goals
 * last because they are the least of the three, and putting them on the title
 * line gave the smallest idea the most prominent slot.
 */
const AreaRow: React.FC<{ area: ResearchArea }> = ({ area }) => {
  const headliners: Headliner[] = area.headliners ?? [];
  const isHeadlinerLink = (link: ResearchLink) =>
    headliners.some(
      (headliner) =>
        (headliner.eipId !== undefined && headliner.eipId === link.eipId) ||
        (headliner.url !== undefined && headliner.url === link.url),
    );
  // A headliner with no EIP and no write-up yet has no row to mark, so it is the
  // only thing the panel still has to say in words.
  const unlisted = headliners.filter(
    (headliner) => headliner.eipId === undefined && headliner.url === undefined,
  );

  return (
  <li>
    <details className="group">
      <summary className="cursor-pointer list-none px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 [&::-webkit-details-marker]:hidden">
        <span className="flex items-baseline gap-3">
          <span className="flex flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
              {area.name}
            </span>
            {area.alsoKnownAs && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{area.alsoKnownAs}</span>
            )}
            {area.headliners && <HeadlinerBadge />}
          </span>
          <svg
            className="h-4 w-4 shrink-0 translate-y-0.5 text-slate-400 transition-transform group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>

        <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {area.summary}
        </span>

        {area.northStars.length > 0 && (
          <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {area.northStars.length > 1 ? 'Goals' : 'Goal'}
            </span>
            {area.northStars.map((id) => (
              <GoalTag key={id} id={id} />
            ))}
          </span>
        )}
      </summary>

      {/* An inset panel rather than a rule: it gives the detail its own padding
          and makes plain where the one-line teaser ends. */}
      <div className="px-5 pb-5">
        <div className="rounded-lg bg-slate-50 p-5 dark:bg-slate-900/40">
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {area.description}
          </p>

          {unlisted.length > 0 && (
            <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {unlisted.length === headliners.length
                  ? unlisted.length > 1
                    ? 'Headliners'
                    : 'Headliner'
                  : unlisted.length > 1
                    ? 'Also headliners'
                    : 'Also a headliner'}
                :
              </span>{' '}
              {unlisted.map((headliner) => headliner.name).join(', ')}.
            </p>
          )}

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Further reading
          </p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {area.links.map((link) => (
              <AreaLink
                key={link.url ?? `eip-${link.eipId}`}
                link={link}
                isHeadliner={isHeadlinerLink(link)}
              />
            ))}
          </ul>
        </div>
      </div>
    </details>
  </li>
  );
};

const ResearchPageInner: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('goal');
  // An unknown value falls back to showing everything rather than an empty list.
  const activeGoal = northStars.some((star) => star.id === requested)
    ? (requested as NorthStarId)
    : null;

  const visibleAreas = activeGoal
    ? researchAreas.filter((area) => area.northStars.includes(activeGoal))
    : researchAreas;

  const selectGoal = (id: NorthStarId | null) => {
    const next = new URLSearchParams(searchParams);
    // The default drops its param, so an unfiltered view has a clean URL.
    if (id === null) next.delete('goal');
    else next.set('goal', id);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-3xl">
        <a
          href="/upgrades/"
          className="mb-6 inline-block text-sm font-medium text-slate-600 transition-colors hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
        >
          ← All Network Upgrades
        </a>

        <header className="mb-10">
          <h1 className="mb-3 text-3xl font-light tracking-tight text-slate-900 dark:text-slate-100">
            Research
          </h1>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Glamsterdam and Hegotá have scopes. Past them is a wide field researchers and client
            teams are actively exploring, broken into the areas below. Open one for the longer
            version and where to read on.
          </p>

          {/* A rule rather than bullet glyphs: these are a caveat on the page above,
              not a list of three things. */}
          <div className="mt-5 border-l-2 border-slate-200 pl-4 text-sm leading-relaxed text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <p>
              <span className="font-medium text-slate-700 dark:text-slate-200">No dates.</span>{' '}
              Most of this is unscheduled work.
            </p>
            <p className="mt-1.5">
              <span className="font-medium text-slate-700 dark:text-slate-200">No ranking.</span>{' '}
              Listed alphabetically, not by priority or maturity.
            </p>
            <p className="mt-1.5">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                One perspective.
              </span>{' '}
              Mostly from the{' '}
              <a
                href={STRAWMAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={purpleLinkClass}
              >
                strawmap
              </a>
              , EF Protocol's take; teams differ more on order than on content.
            </p>
          </div>
        </header>

        <section className="mb-10">
          <h2 className="mb-1.5 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Long-range goals
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            The strawmap defines five north stars and sorts everything under them. They are its
            framing, not an agreed set. Each area below is tagged with the ones it serves.
          </p>
          <ul className={listClass}>
            {northStars.map((star) => (
              <li
                key={star.id}
                className="flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-start sm:gap-5"
              >
                <span className="flex shrink-0 items-center gap-2 sm:w-36">
                  <Dot id={star.id} className="h-2 w-2" />
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {star.label}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-slate-900 dark:text-slate-100">
                    {star.target}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {star.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-1.5 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Research areas
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            A <HeadlinerBadge /> marks a proposal prominent enough to anchor an entire upgrade. Each fork may include one on the consensus side and one on the
            execution side, so the badge marks what could define a fork, not what matters most. Open
            a row to see which proposal carries it.
          </p>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => selectGoal(null)}
              aria-pressed={activeGoal === null}
              className={chipClass(activeGoal === null)}
            >
              All
              <span className="tabular-nums opacity-60">{researchAreas.length}</span>
            </button>
            {northStars.map((star) => (
              <button
                key={star.id}
                type="button"
                onClick={() => selectGoal(activeGoal === star.id ? null : star.id)}
                aria-pressed={activeGoal === star.id}
                title={star.target}
                className={chipClass(activeGoal === star.id)}
              >
                <Dot id={star.id} className="h-1.5 w-1.5" />
                {star.label}
                <span className="tabular-nums opacity-60">{AREAS_PER_GOAL.get(star.id)}</span>
              </button>
            ))}
          </div>

          <ul className={listClass}>
            {visibleAreas.map((area) => (
              <AreaRow key={area.id} area={area} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

/** Hosts the shared EIP drawer for the reading-list links below. */
const ResearchPage: React.FC = () => (
  <EipDrawerProvider>
    <ResearchPageInner />
  </EipDrawerProvider>
);

export default ResearchPage;
