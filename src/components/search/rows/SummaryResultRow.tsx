import type { LightEntryKind, SummaryResult } from '../../../domain/search/types';
import { formatDate, parseDate } from '../../../utils/date';
import { SearchMatch } from '../SearchUi';

const KIND_ICON: Record<LightEntryKind, string> = {
  highlight: '📋',
  decision: '⚖️',
  action: '✅',
  target: '🎯',
  note: '🗒️',
};

const KIND_COLOR: Record<LightEntryKind, string> = {
  highlight: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50',
  decision: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50',
  action: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50',
  target: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50',
  note: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700',
};

export default function SummaryResultRow({ result }: { result: SummaryResult }) {
  const { entry } = result;
  // A note's indexed text is "heading\nsummary\nbody"; the heading gets its own line.
  const body =
    entry.heading && entry.text.startsWith(entry.heading)
      ? entry.text.slice(entry.heading.length).trim()
      : entry.text;

  return (
    <div className="flex items-start gap-3">
      <span
        className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm sm:h-8 sm:w-8 ${KIND_COLOR[entry.kind]}`}
      >
        {KIND_ICON[entry.kind]}
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="flex-shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">
            {entry.callType.toUpperCase()} #{entry.callNumber}
          </span>
          <span className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">
            {formatDate(parseDate(entry.callDate))}
          </span>
          <span className="flex-shrink-0 font-mono text-xs text-blue-600 dark:text-blue-400">
            {entry.timestamp}
          </span>
          <span className="flex-shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs capitalize text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            {entry.kind}
          </span>
          {entry.breakout && (
            <span className="flex-shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-xs uppercase text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              {entry.breakout} breakout
            </span>
          )}
        </div>

        {entry.heading && (
          <div className="mb-0.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            <SearchMatch>{entry.heading}</SearchMatch>
          </div>
        )}

        <p className="line-clamp-3 text-sm leading-relaxed text-slate-900 dark:text-slate-100 sm:line-clamp-2">
          <SearchMatch>{body}</SearchMatch>
        </p>

        {entry.owner && (
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Owner: {entry.owner}</div>
        )}
      </div>
    </div>
  );
}
