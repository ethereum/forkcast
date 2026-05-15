import { createContext, useContext, type ReactNode, type RefObject } from 'react';
import { getSearchShortcutLabel } from './searchShortcuts';

const SearchQueryContext = createContext('');

export function SearchQueryProvider({ query, children }: { query: string; children: ReactNode }) {
  return <SearchQueryContext.Provider value={query}>{children}</SearchQueryContext.Provider>;
}

export function SearchMatch({ children }: { children: string }) {
  const query = useContext(SearchQueryContext);
  if (!query.trim()) return <>{children}</>;

  const queryWords = query.trim().split(/\s+/).filter((w) => w.length > 0);

  const pattern = queryWords
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const parts = children.split(new RegExp(`(${pattern})`, 'gi'));

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = queryWords.some((word) => part.toLowerCase() === word.toLowerCase());
        return isMatch ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-500/80 text-slate-800 dark:text-slate-900 font-medium"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

type SearchTone = 'slate' | 'blue' | 'purple';

const ACTIVE_TONE_CLASSES: Record<SearchTone, string> = {
  slate: 'border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-100',
  blue: 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  purple: 'border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const INACTIVE_FILTER_CLASSES =
  'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-600';

const INPUT_BASE_CLASSES =
  'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition-colors focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:border-slate-500 dark:focus:bg-slate-800 dark:focus:ring-slate-700';

interface SearchTriggerButtonProps {
  onOpen: () => void;
  placeholder: string;
  ariaLabel?: string;
  className?: string;
}

export function SearchTriggerButton({
  onOpen,
  placeholder,
  ariaLabel,
  className,
}: SearchTriggerButtonProps) {
  const shortcutLabel = getSearchShortcutLabel();

  return (
    <button
      onClick={onOpen}
      className={joinClasses(
        'inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-500 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/80',
        className,
      )}
      aria-label={ariaLabel ?? placeholder}
      title={`Search (${shortcutLabel})`}
      type="button"
    >
      <svg
        className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span className="hidden sm:inline">{placeholder}</span>
      <SearchKeycap className="hidden sm:inline-flex">{shortcutLabel}</SearchKeycap>
    </button>
  );
}

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  maxWidthClassName?: string;
  children: ReactNode;
}

export function SearchDialog({
  isOpen,
  onClose,
  query,
  maxWidthClassName = 'max-w-4xl',
  children,
}: SearchDialogProps) {
  if (!isOpen) return null;

  return (
    <SearchQueryProvider query={query}>
      <div className="fixed inset-0 z-50 flex items-start justify-center px-2 pt-4 sm:px-4 sm:pt-20">
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <div
          className={joinClasses(
            'relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl animate-[slideDown_0.2s_ease-out] max-h-[90vh] dark:bg-slate-800',
            maxWidthClassName,
          )}
        >
          {children}
        </div>
      </div>
    </SearchQueryProvider>
  );
}

interface SearchDialogSearchRowProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onClose: () => void;
  loading?: boolean;
}

export function SearchDialogSearchRow({
  inputRef,
  value,
  onChange,
  placeholder,
  onClose,
  loading = false,
}: SearchDialogSearchRowProps) {
  return (
    <div className="flex items-center gap-3 p-4">
      <svg
        className="h-5 w-5 flex-shrink-0 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[44px] flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-400"
      />
      {loading && (
        <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      )}
      <button
        onClick={onClose}
        className="p-2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
        type="button"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span className="sr-only">Close</span>
      </button>
    </div>
  );
}

interface SearchFilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: SearchTone;
  className?: string;
}

export function SearchFilterButton({
  active,
  onClick,
  children,
  tone = 'slate',
  className,
}: SearchFilterButtonProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={joinClasses(
        'rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
        active ? ACTIVE_TONE_CLASSES[tone] : INACTIVE_FILTER_CLASSES,
        className,
      )}
    >
      {children}
    </button>
  );
}

interface SearchFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function SearchFilterSelect({
  value,
  onChange,
  children,
  className,
}: SearchFilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={joinClasses(INPUT_BASE_CLASSES, className)}
    >
      {children}
    </select>
  );
}

interface SearchKeycapProps {
  children: ReactNode;
  className?: string;
}

export function SearchKeycap({ children, className }: SearchKeycapProps) {
  return (
    <kbd
      className={joinClasses(
        'items-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

interface SearchEmptyStateProps {
  description: string;
  items: string[];
}

export function SearchEmptyState({ description, items }: SearchEmptyStateProps) {
  return (
    <div className="p-8 text-center text-slate-400 dark:text-slate-400">
      <p className="mb-3 text-sm">{description}</p>
      <div className="mx-auto flex max-w-sm flex-wrap justify-center gap-2 text-xs">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
