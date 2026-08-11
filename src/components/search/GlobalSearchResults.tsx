import type { RefObject } from 'react';
import type { FlatRow, GlobalResult, RowAction } from '../../domain/search/types';
import CallEntityResultRow from './rows/CallEntityResultRow';
import EipResultRow from './rows/EipResultRow';
import RowShell from './rows/RowShell';
import SiteResultRow from './rows/SiteResultRow';
import SummaryResultRow from './rows/SummaryResultRow';
import TranscriptResultRow from './rows/TranscriptResultRow';
import { SearchKeycap } from './SearchUi';

function ResultBody({ result }: { result: GlobalResult }) {
  switch (result.kind) {
    case 'eip':
      return <EipResultRow result={result} />;
    case 'call':
      return <CallEntityResultRow result={result} />;
    case 'summary':
      return <SummaryResultRow result={result} />;
    case 'transcript':
      return <TranscriptResultRow result={result} />;
    case 'site':
      return <SiteResultRow result={result} />;
  }
}

interface Props {
  rows: FlatRow[];
  activeIndex: number;
  containerRef: RefObject<HTMLDivElement | null>;
  onHover: (index: number) => void;
  onNavigate: (href: string) => void;
  onAction: (action: RowAction) => void;
}

export default function GlobalSearchResults({
  rows,
  activeIndex,
  containerRef,
  onHover,
  onNavigate,
  onAction,
}: Props) {
  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Search results"
      aria-activedescendant={activeIndex >= 0 ? `global-search-row-${activeIndex}` : undefined}
      className="max-h-[60vh] overflow-y-auto py-2 sm:max-h-[28rem]"
    >
      {rows.map((row, index) => {
        if (row.type === 'header') {
          return (
            <div
              key={`header-${row.sectionId}`}
              className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 sm:px-4"
            >
              {row.label}
            </div>
          );
        }

        if (row.type === 'action') {
          const active = index === activeIndex;
          return (
            <button
              key={`action-${row.action.kind}-${'sectionId' in row.action ? row.action.sectionId : ''}`}
              id={`global-search-row-${index}`}
              data-row-index={index}
              role="option"
              aria-selected={active}
              type="button"
              onMouseMove={() => onHover(index)}
              onClick={() => onAction(row.action)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-blue-600 transition-colors dark:text-blue-400 sm:px-4 ${
                active ? 'bg-slate-50 dark:bg-slate-700/30' : ''
              }`}
            >
              <span>{row.action.label} →</span>
              {active && <SearchKeycap className="hidden sm:inline-flex">↵</SearchKeycap>}
            </button>
          );
        }

        return (
          <RowShell
            key={`${row.sectionId}-${row.result.href}-${index}`}
            href={row.result.href}
            index={index}
            active={index === activeIndex}
            onHover={onHover}
            onSelect={onNavigate}
          >
            <ResultBody result={row.result} />
          </RowShell>
        );
      })}
    </div>
  );
}
