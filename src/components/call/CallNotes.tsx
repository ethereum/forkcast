import React, { lazy, Suspense, useState } from 'react';
import {
  getAdjustedVideoTime,
  getDisplayTimestamp,
  type SyncConfig,
} from '../../utils/timestamp';

export interface NotesSection {
  heading: string;
  timestamp: string;
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
  prose-a:text-blue-600 dark:prose-a:text-blue-400`;

const toMarkdown = (data: NotesData): string =>
  [
    `## ${data.meeting}`,
    ...data.sections.map(section => `### ${section.heading}\n\n${section.body.trim()}`),
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

  const handleCopy = () => {
    navigator.clipboard.writeText(toMarkdown(data)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isCurrentSection = (index: number): boolean => {
    if (!currentVideoTime || !syncConfig?.transcriptStartTime || !syncConfig?.videoStartTime) return false;
    const sectionTime = getAdjustedVideoTime(data.sections[index].timestamp, syncConfig);
    const next = data.sections[index + 1];
    const nextTime = next ? getAdjustedVideoTime(next.timestamp, syncConfig) : Infinity;
    return currentVideoTime >= sectionTime && currentVideoTime < nextTime;
  };

  return (
    <div>
      <div className="flex justify-end mb-2">
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
      <div className="space-y-5">
        {data.sections.map((section, index) => (
          <div key={index}>
            <button
              type="button"
              onClick={() => onTimestampClick?.(section.timestamp)}
              className="group flex items-baseline gap-2 text-left cursor-pointer"
            >
              <h3
                className={`text-xs font-semibold uppercase tracking-wide rounded px-1 py-0.5 -ml-1 transition-colors ${
                  isCurrentSection(index)
                    ? 'bg-blue-50 dark:bg-blue-900/50 text-slate-900 dark:text-slate-100'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {section.heading}
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {getDisplayTimestamp(section.timestamp, syncConfig)}
              </span>
            </button>
            <div className={`mt-0.5 ${proseClasses}`}>
              <Suspense fallback={<div className="text-sm text-slate-400">Loading…</div>}>
                <LazyMarkdown>{section.body}</LazyMarkdown>
              </Suspense>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CallNotes;
