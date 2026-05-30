import React, { lazy, Suspense, useMemo } from 'react';

// FAQ answers are short prose (links/bold/lists), so a bare markdown renderer is
// enough. Lazy-loaded to keep react-markdown out of the main bundle, matching
// how the Specification tab loads it.
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

const proseClasses = `prose prose-sm max-w-none text-slate-800 dark:text-slate-200
  prose-p:text-slate-800 dark:prose-p:text-slate-200
  prose-strong:text-slate-900 dark:prose-strong:text-slate-100
  prose-li:text-slate-800 dark:prose-li:text-slate-200
  prose-a:text-purple-600 dark:prose-a:text-purple-400`;

// Split FAQ markdown into question/answer pairs: each `## …` heading starts a
// question; everything until the next one is its answer. Content before the
// first heading is ignored.
function splitFaq(markdown: string): { question: string; answer: string }[] {
  const items: { question: string; answer: string }[] = [];
  let current: { question: string; lines: string[] } | null = null;
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      if (current) items.push({ question: current.question, answer: current.lines.join('\n').trim() });
      current = { question: heading[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) items.push({ question: current.question, answer: current.lines.join('\n').trim() });
  return items;
}

interface EipFaqProps {
  content: string | null;
  loading: boolean;
  error: string | null;
}

export const EipFaq: React.FC<EipFaqProps> = ({ content, loading, error }) => {
  const items = useMemo(() => (content ? splitFaq(content) : []), [content]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading FAQ...
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
        FAQ not available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Frequently asked questions about this proposal. Click a question to reveal its answer.
      </p>
      {items.map((item, index) => (
        <details
          key={index}
          className="group border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
        >
          <summary className="flex items-center justify-between gap-3 cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors list-none [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            <svg
              className="w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className={`px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 ${proseClasses}`}>
            <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
              <LazyMarkdown>{item.answer}</LazyMarkdown>
            </Suspense>
          </div>
        </details>
      ))}
    </div>
  );
};
