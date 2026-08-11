import type { TranscriptResult } from '../../../domain/search/types';
import { formatDate, parseDate } from '../../../utils/date';
import { getSearchTypeColor, getSearchTypeIcon } from '../searchShortcuts';
import { SearchMatch } from '../SearchUi';

export default function TranscriptResultRow({ result }: { result: TranscriptResult }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm sm:h-8 sm:w-8 ${getSearchTypeColor(result.contentType)}`}
      >
        {getSearchTypeIcon(result.contentType)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {result.callType.toUpperCase()} #{result.callNumber}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(parseDate(result.callDate))}
          </span>
          <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{result.timestamp}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs capitalize text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            {result.contentType}
          </span>
        </div>

        {result.speaker && (
          <div className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">{result.speaker}</div>
        )}

        <p className="line-clamp-3 text-sm leading-relaxed text-slate-900 dark:text-slate-100 sm:line-clamp-2">
          <SearchMatch>{result.text}</SearchMatch>
        </p>
      </div>
    </div>
  );
}
