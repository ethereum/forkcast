import { getEipStatusColor, getFieldDisplayName, getForkDisplayName } from '../../../domain/search/eipSearch';
import type { EipResult } from '../../../domain/search/types';
import { getLaymanTitle, getProposalPrefix } from '../../../utils/eip';
import { SearchMatch } from '../SearchUi';

export default function EipResultRow({ result }: { result: EipResult }) {
  const { eip, matchedFields } = result;
  const recentFork = eip.forkRelationships[eip.forkRelationships.length - 1];
  const currentStatus = recentFork?.statusHistory[recentFork.statusHistory.length - 1]?.status;

  // Title/id/description matches are already visible in the row above, so the
  // "matched in …" hint only appears when the match was somewhere less obvious.
  const showMatchedFields =
    matchedFields.length > 0 &&
    !matchedFields.includes('title') &&
    !matchedFields.includes('id') &&
    !matchedFields.includes('description');

  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 rounded bg-purple-50 px-2 py-1 font-mono text-xs font-medium text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
        {getProposalPrefix(eip)}-{eip.id}
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-1 line-clamp-1 text-sm font-medium text-slate-900 dark:text-slate-100">
          <SearchMatch>{getLaymanTitle(eip)}</SearchMatch>
        </div>

        {eip.description && (
          <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <SearchMatch>{eip.description}</SearchMatch>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {recentFork && (
            <>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                {getForkDisplayName(recentFork.forkName)}
              </span>
              {currentStatus && (
                <span className={`rounded px-1.5 py-0.5 text-xs ${getEipStatusColor(currentStatus)}`}>
                  {currentStatus}
                </span>
              )}
              {eip.layer && (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {eip.layer}
                </span>
              )}
            </>
          )}
          {showMatchedFields && (
            <span className="text-xs text-slate-400 dark:text-slate-400">
              · {matchedFields.map(getFieldDisplayName).join(', ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
