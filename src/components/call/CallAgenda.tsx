import React, { lazy, Suspense } from 'react';
import { useCallAgenda } from '../../hooks/useCallAgenda';
import { remarkHardBreaks } from '../../utils/remarkHardBreaks';

// Agendas are nested markdown bullet lists with inline links, and occasionally a
// table. Lazy-loaded so react-markdown stays out of the call page's initial bundle —
// Agenda is not the default summary tab.
const LazyMarkdown = lazy(() =>
  Promise.all([import('react-markdown'), import('remark-gfm')]).then(
    ([{ default: ReactMarkdown }, { default: remarkGfm }]) => ({
      default: ({ children }: { children: string }) => (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkHardBreaks]}
          components={{
            a: ({ href, children: linkChildren, ...rest }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
                {linkChildren}
              </a>
            ),
            // Agendas are written to be read on github.com, so a table is as wide as
            // it needs to be. Give it its own scroller rather than the page.
            table: ({ children: tableChildren, ...rest }) => (
              <div className="overflow-x-auto">
                <table {...rest}>{tableChildren}</table>
              </div>
            ),
          }}
        >
          {children}
        </ReactMarkdown>
      ),
    }),
  ),
);

// Agendas carry headings of every level, so the heading scale is flattened to sit
// just above body text rather than towering over the bullets underneath it.
// `break-words`: agenda items often carry a bare issue-comment URL, which has nothing
// to wrap on and would otherwise push the phone layout sideways.
const proseClasses = `prose prose-sm max-w-none break-words text-slate-600 dark:text-slate-400
  prose-p:text-slate-600 dark:prose-p:text-slate-400
  prose-li:text-slate-600 dark:prose-li:text-slate-400
  prose-li:my-0.5
  prose-ul:my-1
  prose-headings:text-xs prose-headings:font-semibold prose-headings:uppercase
  prose-headings:tracking-wide prose-headings:mt-4 prose-headings:mb-1
  prose-headings:text-slate-900 dark:prose-headings:text-slate-100
  prose-strong:text-slate-900 dark:prose-strong:text-slate-100
  prose-a:text-blue-600 dark:prose-a:text-blue-400
  prose-code:text-[0.8125em] prose-code:font-medium prose-code:rounded prose-code:px-1 prose-code:py-0.5
  prose-code:text-slate-800 dark:prose-code:text-slate-200
  prose-code:bg-slate-100 dark:prose-code:bg-slate-700
  prose-code:before:content-none prose-code:after:content-none`;

interface CallAgendaProps {
  issueNumber: number;
}

const CallAgenda: React.FC<CallAgendaProps> = ({ issueNumber }) => {
  const { agenda, loading, error } = useCallAgenda(issueNumber);
  const issueUrl = `https://github.com/ethereum/pm/issues/${issueNumber}`;

  const message = (text: string) => (
    <p className="text-sm text-slate-500 dark:text-slate-400">{text}</p>
  );

  return (
    <div>
      <div className="flex justify-end mb-2">
        <a
          href={issueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-normal text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        >
          ethereum/pm #{issueNumber}
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
      {loading
        ? message('Loading the agenda from GitHub…')
        : error
        ? message(`Could not load the agenda from GitHub (${error}). Open the issue to read it.`)
        : agenda
        ? (
          <div className={proseClasses}>
            <Suspense fallback={<div className="text-sm text-slate-400">Loading…</div>}>
              <LazyMarkdown>{agenda}</LazyMarkdown>
            </Suspense>
          </div>
        )
        : message('No agenda was posted on this call’s issue.')}
    </div>
  );
};

export default CallAgenda;
