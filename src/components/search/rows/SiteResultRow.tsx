import type { SiteResult } from '../../../domain/search/types';
import { SearchMatch } from '../SearchUi';

const GROUP_ICON = {
  upgrades: '🍴',
  devnets: '🧪',
  pages: '📄',
} as const;

export default function SiteResultRow({ result }: { result: SiteResult }) {
  const { entity } = result;

  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm dark:bg-slate-700">
        {GROUP_ICON[entity.group]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
          <SearchMatch>{entity.title}</SearchMatch>
        </div>
        {entity.description && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <SearchMatch>{entity.description}</SearchMatch>
          </p>
        )}
        <div className="mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">{entity.href}</div>
      </div>
    </div>
  );
}
