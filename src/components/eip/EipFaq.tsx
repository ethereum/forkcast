import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from '../browserLocation';
import type { EipFaqItem } from '../../types/eip';

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

interface EipFaqProps {
  items: EipFaqItem[];
}

export const EipFaq: React.FC<EipFaqProps> = ({ items }) => {
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get('q');
  const linkedIndex = qParam !== null ? parseInt(qParam, 10) - 1 : null;
  const validLinkedIndex = linkedIndex !== null && linkedIndex >= 0 && linkedIndex < items.length ? linkedIndex : null;

  const [openIndex, setOpenIndex] = useState<number | null>(validLinkedIndex ?? 0);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(validLinkedIndex);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const didScroll = useRef(false);

  useEffect(() => {
    if (validLinkedIndex !== null && !didScroll.current) {
      setOpenIndex(validLinkedIndex);
      // Wait a tick for the accordion to open, then scroll
      requestAnimationFrame(() => {
        itemRefs.current.get(validLinkedIndex)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      didScroll.current = true;
    }
  }, [validLinkedIndex]);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
    setHighlightIndex(null);
  };

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyLink = (index: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'faq');
    url.searchParams.set('q', String(index + 1));
    navigator.clipboard.writeText(url.toString());
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
        FAQ not available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const isLinked = highlightIndex === index;
        return (
          <div
            key={index}
            ref={(el) => { if (el) itemRefs.current.set(index, el); }}
            className={`rounded-lg overflow-hidden border ${isLinked ? 'border-purple-400 dark:border-purple-500 ring-1 ring-purple-400/30 dark:ring-purple-500/30' : 'border-slate-200 dark:border-slate-700'}`}
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between gap-3 cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors text-left"
            >
              <span>{item.question}</span>
              <svg
                className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-250 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              <div className="overflow-hidden">
                <div className={`px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 ${proseClasses}`}>
                  <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
                    <LazyMarkdown>{item.answer}</LazyMarkdown>
                  </Suspense>
                  <button
                    type="button"
                    onClick={() => copyLink(index)}
                    className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors not-prose"
                  >
                    {copiedIndex === index ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-emerald-500 dark:text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span>Copy link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
