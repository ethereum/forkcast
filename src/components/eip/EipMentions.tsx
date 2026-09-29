import React, { useState } from 'react';
import { Link } from '../navigation';
import { getCallTypeName } from '../../data/callSeries';
import type { MentionCall } from '../../data/eipMentions';
import { mentionCallKey } from '../../data/eipMentions';
import type { EipCallMention } from '../../hooks/useEipMentions';
import { getAdjustedVideoTime, getDisplayTimestamp } from '../../utils/timestamp';

/**
 * The AllCoreDevs calls are known by their slug, and their full names are long
 * enough to crowd the date and badge beside them. Every other series reads as
 * its full name, which is the only thing that identifies it.
 */
const ABBREVIATED_SERIES = new Set(['acdc', 'acde', 'acdt']);

const seriesLabel = (type: string): string =>
  ABBREVIATED_SERIES.has(type) ? type.toUpperCase() : getCallTypeName(type);

/**
 * A one-off's hand-written name is already a full title; everything else is
 * "{series} #{number}". `getCallTypeName` comes from `callSeries` rather than
 * `calls`, which would drag the whole call list into this bundle.
 */
const callLabel = (call: MentionCall): string => {
  const base = call.name ?? `${seriesLabel(call.type)} #${call.number}`;
  return call.breakout ? `${base} (${call.breakout.toUpperCase()} breakout)` : base;
};

/**
 * `call.path` is literally the `/calls/{path}` route param, so no padding or
 * repair is needed here — unlike the hand-authored refs `formatCallReference`
 * exists to fix.
 */
const callHref = (call: MentionCall, search?: string): string => {
  const params = new URLSearchParams(search);
  if (call.breakout) params.set('breakout', call.breakout);
  const query = params.toString();
  return `/calls/${call.path}${query ? `?${query}` : ''}`;
};

const formatDate = (date: string): string =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

interface EipMentionsProps {
  mentions: EipCallMention[];
  loading: boolean;
  /** Calls the index promised but whose artifact didn't load. */
  failed: number;
}

const EipMentions: React.FC<EipMentionsProps> = ({ mentions, loading, failed }) => {
  // Collapsed by default: the summary is the scannable line, and the moments
  // underneath it are the evidence you open when you want the detail.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  };

  const allExpanded = expanded.size === mentions.length;
  const toggleAll = () => {
    setExpanded(allExpanded ? new Set() : new Set(mentions.map(({ call }) => mentionCallKey(call))));
  };

  if (loading && mentions.length === 0) {
    return <div className="text-sm text-slate-400 dark:text-slate-500">Loading mentions…</div>;
  }

  // The tab only exists because the bundled index named some calls, so an empty
  // list means those calls failed to load — say so rather than rendering the
  // header and an empty rule.
  if (mentions.length === 0) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        {failed > 0
          ? 'Could not load the mentions for this EIP. Reopen the tab to try again.'
          : 'No mentions on the calls indexed so far.'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <p className="flex-1 min-w-[16rem] text-xs text-slate-500 dark:text-slate-400">
          Calls where this EIP was brought up, newest first. Indexing is per call and ongoing, so
          this covers the calls processed so far rather than every call in the archive.
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-normal text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300 cursor-pointer"
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border-t border-slate-100 dark:border-slate-700/60">
        {mentions.map(({ call, mention }) => {
          const key = mentionCallKey(call);
          const isOpen = expanded.has(key);
          return (
            <div key={key} className="py-3">
              <div className="flex items-baseline gap-2">
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  aria-expanded={isOpen}
                  aria-label={`${callLabel(call)} moments`}
                  className="shrink-0 self-center cursor-pointer"
                >
                  <svg
                    className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0">
                  {/* The call header opens the call's own EIPs tab; a moment below seeks
                      the video instead. Kept separate so the two don't fight over scroll. */}
                  <Link
                    to={callHref(call, 'summary=eips')}
                    className="text-sm font-semibold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                  >
                    {callLabel(call)}
                  </Link>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(call.date)}</span>
                  {mention.weight === 'mentioned' && (
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[0.6875rem] font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      in passing
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                  {mention.moments.length} {mention.moments.length === 1 ? 'moment' : 'moments'}
                </span>
              </div>
              {!isOpen && (
                <p className="mt-1 ml-[1.125rem] text-sm text-slate-600 dark:text-slate-300">{mention.summary}</p>
              )}
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  {/* Timestamp in a fixed monospace gutter, whole row clickable — the same
                      shape the transcript pane uses for a time + text pair. */}
                  <ul className="mt-1 ml-[1.125rem]">
                    {mention.moments.map((moment, index) => {
                      const seconds = getAdjustedVideoTime(moment.timestamp, call.sync ?? undefined);
                      const label = getDisplayTimestamp(moment.timestamp, call.sync ?? undefined);
                      const time = (
                        <span
                          className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
                          style={{ minWidth: '64px' }}
                        >
                          {label}
                        </span>
                      );
                      const context = (
                        <span className="flex-1 min-w-0 text-sm text-slate-600 dark:text-slate-400">
                          {moment.context}
                        </span>
                      );
                      return (
                        <li key={index}>
                          {seconds >= 0 ? (
                            <Link
                              to={`${callHref(call)}#t=${Math.floor(seconds)}`}
                              className="group flex gap-3 rounded px-2 -mx-2 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                            >
                              {time}
                              {context}
                            </Link>
                          ) : (
                            // The moment predates the recording, so there is nothing to seek to.
                            <div className="flex gap-3 px-2 -mx-2 py-1">
                              {time}
                              {context}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {failed > 0 && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-500">
          {failed} more {failed === 1 ? 'call' : 'calls'} could not be loaded. Reopen the tab to try
          again.
        </p>
      )}
    </div>
  );
};

export default EipMentions;
