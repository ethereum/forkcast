import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  getAdjustedVideoTime,
  getDisplayTimestamp,
  type SyncConfig,
} from '../../utils/timestamp';

export interface NotesSection {
  heading: string;
  timestamp: string;
  /** One-line takeaway shown while the body is collapsed. Absent on notes generated before it was added. */
  summary?: string;
  body: string;
}

export interface NotesData {
  meeting: string;
  sections: NotesSection[];
}

// Notes bodies are nested markdown bullet lists with inline links. Lazy-loaded so
// react-markdown stays out of the call page's initial bundle — Notes is not the
// default summary tab.
const LazyMarkdown = lazy(() =>
  Promise.all([import('react-markdown'), import('remark-gfm')]).then(
    ([{ default: ReactMarkdown }, { default: remarkGfm }]) => ({
      default: ({ children }: { children: string }) => (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children: linkChildren, ...rest }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
                {linkChildren}
              </a>
            ),
          }}
        >
          {children}
        </ReactMarkdown>
      ),
    }),
  ),
);

const proseClasses = `prose prose-sm max-w-none text-slate-600 dark:text-slate-400
  prose-p:text-slate-600 dark:prose-p:text-slate-400
  prose-li:text-slate-600 dark:prose-li:text-slate-400
  prose-li:my-0.5
  prose-ul:my-1
  prose-strong:text-slate-900 dark:prose-strong:text-slate-100
  prose-a:text-blue-600 dark:prose-a:text-blue-400
  prose-code:text-[0.8125em] prose-code:font-medium prose-code:rounded prose-code:px-1 prose-code:py-0.5
  prose-code:text-slate-800 dark:prose-code:text-slate-200
  prose-code:bg-slate-100 dark:prose-code:bg-slate-700
  prose-code:before:content-none prose-code:after:content-none`;

const toMarkdown = (data: NotesData): string =>
  [
    `## ${data.meeting}`,
    ...data.sections.map(section =>
      [`### ${section.heading}`, section.summary && `_${section.summary}_`, section.body.trim()]
        .filter(Boolean)
        .join('\n\n'),
    ),
  ].join('\n\n') + '\n';

interface CallNotesProps {
  data: NotesData;
  onTimestampClick?: (timestamp: string) => void;
  syncConfig?: SyncConfig;
  currentVideoTime?: number;
}

const CallNotes: React.FC<CallNotesProps> = ({
  data,
  onTimestampClick,
  syncConfig,
  currentVideoTime = 0,
}) => {
  const [copied, setCopied] = useState(false);
  // Sections collapse to heading + one-line summary; the first opens so the view
  // isn't entirely closed on arrival.
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));

  const handleCopy = () => {
    navigator.clipboard.writeText(toMarkdown(data)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggle = (index: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  };

  const allExpanded = expanded.size === data.sections.length;
  const toggleAll = () => {
    setExpanded(allExpanded ? new Set() : new Set(data.sections.map((_, i) => i)));
  };

  const currentIndex = (() => {
    if (!currentVideoTime || !syncConfig?.transcriptStartTime || !syncConfig?.videoStartTime) return -1;
    return data.sections.findIndex((section, index) => {
      const start = getAdjustedVideoTime(section.timestamp, syncConfig);
      const next = data.sections[index + 1];
      const end = next ? getAdjustedVideoTime(next.timestamp, syncConfig) : Infinity;
      return currentVideoTime >= start && currentVideoTime < end;
    });
  })();

  // Follow playback: opening the section the video has moved into keeps the notes
  // readable while watching. Never collapses anything the reader opened.
  useEffect(() => {
    if (currentIndex < 0) return;
    setExpanded(prev => (prev.has(currentIndex) ? prev : new Set(prev).add(currentIndex)));
  }, [currentIndex]);

  return (
    <div>
      <div className="flex justify-end gap-2 mb-2">
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-normal text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300 cursor-pointer"
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-normal text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300 cursor-pointer"
        >
          {copied ? (
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
          {copied ? 'Copied' : 'Copy as Markdown'}
        </button>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border-t border-slate-100 dark:border-slate-700/60">
        {data.sections.map((section, index) => {
          const isOpen = expanded.has(index);
          const isCurrent = currentIndex === index;
          return (
            <div key={index} className="py-3">
              <div className="flex items-baseline gap-2">
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  className="flex flex-1 items-baseline gap-1.5 text-left cursor-pointer group min-w-0"
                >
                  <svg
                    className={`w-3 h-3 shrink-0 self-center text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <h3
                    className={`text-xs font-semibold uppercase tracking-wide rounded px-1 py-0.5 transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-slate-900 dark:text-slate-100'
                        : 'text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}
                  >
                    {section.heading}
                  </h3>
                </button>
                <button
                  type="button"
                  onClick={() => onTimestampClick?.(section.timestamp)}
                  className="shrink-0 text-xs text-slate-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {getDisplayTimestamp(section.timestamp, syncConfig)}
                </button>
              </div>
              {section.summary && !isOpen && (
                <p className="mt-1 ml-[1.125rem] text-sm text-slate-500 dark:text-slate-400">
                  {section.summary}
                </p>
              )}
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  <div className={`mt-1 ml-[1.125rem] ${proseClasses}`}>
                    <Suspense fallback={<div className="text-sm text-slate-400">Loading…</div>}>
                      <LazyMarkdown>{section.body}</LazyMarkdown>
                    </Suspense>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CallNotes;
