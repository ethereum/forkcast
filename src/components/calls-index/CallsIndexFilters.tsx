import type { RefObject } from 'react';
import { callTypeNames, type CallType } from '../../data/calls';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'acd', label: 'ACD' },
  { value: 'acdc', label: 'ACDC' },
  { value: 'acde', label: 'ACDE' },
  { value: 'acdt', label: 'ACDT' },
  { value: 'breakouts', label: 'Breakouts' }
];

const FILTER_ACTIVE_COLORS: Record<string, string> = {
  all: 'bg-slate-600 dark:bg-slate-400 text-white dark:text-slate-900',
  acd: 'bg-indigo-600 dark:bg-indigo-500 text-white dark:text-white',
  acdc: 'bg-blue-600 dark:bg-blue-500 text-white dark:text-white',
  acde: 'bg-sky-600 dark:bg-sky-500 text-white dark:text-white',
  acdt: 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-white',
  breakouts: 'bg-yellow-600 dark:bg-yellow-500 text-white dark:text-yellow-950'
};

const FILTER_INACTIVE_COLORS: Record<string, string> = {
  all: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
  acd: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30',
  acdc: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30',
  acde: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/30',
  acdt: 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/30',
  breakouts: 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
};

interface CallsIndexFiltersProps {
  selectedFilter: string;
  selectedBreakoutType: string;
  showEvents: boolean;
  breakoutDropdownOpen: boolean;
  breakoutDropdownRef: RefObject<HTMLDivElement | null>;
  breakoutLabel: string;
  breakoutTypes: string[];
  hasOneOffCalls: boolean;
  onSelectFilter: (filter: string) => void;
  onBackToAllFilters: () => void;
  onToggleBreakoutDropdown: () => void;
  onSelectBreakoutType: (breakoutType: string | null) => void;
  onToggleEvents: () => void;
}

export const CallsIndexFilters = ({
  selectedFilter,
  selectedBreakoutType,
  showEvents,
  breakoutDropdownOpen,
  breakoutDropdownRef,
  breakoutLabel,
  breakoutTypes,
  hasOneOffCalls,
  onSelectFilter,
  onBackToAllFilters,
  onToggleBreakoutDropdown,
  onSelectBreakoutType,
  onToggleEvents
}: CallsIndexFiltersProps) => {
  const isBreakoutsExpanded = selectedFilter === 'breakouts';

  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <div className={`flex items-center gap-1.5 flex-nowrap sm:flex-wrap ${isBreakoutsExpanded ? '' : 'overflow-x-auto scrollbar-hide'}`}>
        {isBreakoutsExpanded ? (
          <>
            <button
              onClick={onBackToAllFilters}
              className="flex-shrink-0 whitespace-nowrap rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label="Back to all filters"
            >
              ←
            </button>
            <div className="relative" ref={breakoutDropdownRef}>
              <button
                onClick={onToggleBreakoutDropdown}
                className="inline-flex items-baseline gap-1 border-b-2 border-yellow-400 text-sm font-medium text-yellow-700 transition-colors hover:border-yellow-500 dark:border-yellow-500 dark:text-yellow-300 dark:hover:border-yellow-400"
              >
                {breakoutLabel}
                <svg
                  className={`h-3 w-3 transition-transform ${breakoutDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {breakoutDropdownOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 min-w-[200px] rounded border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <button
                    onClick={() => onSelectBreakoutType(null)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      !selectedBreakoutType
                        ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    All Breakouts
                  </button>
                  {breakoutTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => onSelectBreakoutType(type)}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        selectedBreakoutType === type
                          ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {callTypeNames[type as CallType] || type.toUpperCase()}
                    </button>
                  ))}
                  {hasOneOffCalls && (
                    <button
                      onClick={() => onSelectBreakoutType('one-off')}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        selectedBreakoutType === 'one-off'
                          ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      One-Off Calls
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onSelectFilter(option.value)}
                className={`flex-shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedFilter === option.value
                    ? FILTER_ACTIVE_COLORS[option.value]
                    : FILTER_INACTIVE_COLORS[option.value]
                }`}
              >
                {option.label}
              </button>
            ))}
          </>
        )}
      </div>

      <button
        onClick={onToggleEvents}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
          showEvents
            ? 'bg-slate-600 text-white dark:bg-slate-400 dark:text-slate-900'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
        }`}
      >
        <div className={`h-1.5 w-1.5 rounded-full ${showEvents ? 'bg-white dark:bg-slate-900' : 'bg-slate-500 dark:bg-slate-400'}`}></div>
        <span>{showEvents ? 'Hide Events' : 'Show Events'}</span>
      </button>
    </div>
  );
};
