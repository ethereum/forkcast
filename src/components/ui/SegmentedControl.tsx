export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Hover text — room for the explanation a short label has to drop. */
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers, since the buttons alone have no common label. */
  label: string;
}

/**
 * A row of adjoining buttons standing in for a short `<select>`: every option is visible
 * and one click away, which suits a small fixed set better than a menu that has to be
 * opened to be read. The codebase already draws this several ways — this is the shape used
 * by the call page's view switcher.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 divide-x divide-slate-200 dark:divide-slate-700"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            title={option.title}
            className={`px-2.5 py-1 text-xs transition-colors cursor-pointer ${
              active
                ? 'bg-slate-100 dark:bg-slate-700 font-medium text-slate-900 dark:text-slate-100'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
