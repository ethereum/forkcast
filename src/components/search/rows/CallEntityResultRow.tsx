import type { CallEntityResult } from '../../../domain/search/types';
import { formatDate, parseDate } from '../../../utils/date';
import { SearchMatch } from '../SearchUi';

export default function CallEntityResultRow({ result }: { result: CallEntityResult }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-sm text-purple-600 dark:bg-purple-900/40 dark:text-purple-300">
        📅
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
          <SearchMatch>{result.label}</SearchMatch>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{result.seriesName}</span>
          <span>{formatDate(parseDate(result.call.date))}</span>
        </div>
      </div>
    </div>
  );
}
