import React, { useEffect, useMemo, useCallback, useState, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from '../navigation';
import { EIP } from '../../types/eip';
import { eipById, eipsData } from '../../data/eips';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useEipMarkdown } from '../../hooks/useEipMarkdown';
import {
  getLaymanTitle,
  getProposalPrefix,
  getSpecificationUrl,
  parseMarkdownLinks,
  parseAuthors,
  getEipLayer,
  buildDependentsMap,
} from '../../utils';
import { Tooltip } from '../ui';
import { EipTimeline } from './EipTimeline';
import { EipNotice } from './EipNotice';
import { EipSearch } from './EipSearch';
import EipSearchModal from './EipSearchModal';
import { EipSpecHistory } from './EipSpecHistory';
import { EipDependents } from './EipDependents';
import { EipFaq } from './EipFaq';
import { useEipHistory } from '../../hooks/useEipHistory';
import { isSearchHotkey } from '../search/searchShortcuts';
import {
  eipCallTypes,
  callTypeNames,
  getCallNavigation,
} from '../../data/calls';
import { fetchUpcomingCalls, type UpcomingCall } from '../../domain/calls/upcomingCalls';

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

function stripMarkdownInline(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) → text
    .replace(/`([^`]+)`/g, '$1')                // `code` → code
    .replace(/\*\*([^*]+)\*\*/g, '$1')          // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1')              // *italic* → italic
    .replace(/_([^_]+)_/g, '$1');               // _italic_ → italic
}

/** Parse lines into heading indices and fence-aware regions. Used by both normalizeHeadings and extractHeadings. */
function parseMarkdownLines(markdown: string) {
  const lines = markdown.split('\n');
  let inFence = false;
  const headingLines: { index: number; level: number; text: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (m) {
      headingLines.push({ index: i, level: m[1].length, text: m[2] });
    }
  }
  return { lines, headingLines };
}

function normalizeHeadings(markdown: string) {
  const { lines, headingLines } = parseMarkdownLines(markdown);
  if (headingLines.length === 0) return markdown;
  const minLevel = Math.min(...headingLines.map((h) => h.level));
  const shift = minLevel - 2;
  if (shift === 0) return markdown;
  for (const h of headingLines) {
    lines[h.index] = lines[h.index].replace(/^(#{1,6})(\s)/, (_, hashes: string, space: string) => {
      const newLevel = Math.max(2, Math.min(6, hashes.length - shift));
      return '#'.repeat(newLevel) + space;
    });
  }
  return lines.join('\n');
}

function deduplicateSlug(slug: string, seen: Map<string, number>) {
  const count = seen.get(slug) ?? 0;
  seen.set(slug, count + 1);
  return count === 0 ? slug : `${slug}-${count}`;
}

function extractHeadings(markdown: string) {
  const { headingLines } = parseMarkdownLines(markdown);
  const headings: { level: number; text: string; id: string; number: string }[] = [];
  const counters = [0, 0, 0]; // h2, h3, h4
  const seen = new Map<string, number>();
  for (const h of headingLines) {
    if (h.level < 2 || h.level > 4) continue;
    const idx = h.level - 2;
    counters[idx]++;
    for (let i = idx + 1; i < counters.length; i++) counters[i] = 0;
    const number = counters.slice(0, idx + 1).join('.');
    const text = stripMarkdownInline(h.text);
    const id = deduplicateSlug(slugify(text), seen);
    headings.push({ level: h.level, text, id, number });
  }
  return headings;
}


function CopyButton({ codeRef }: { codeRef: React.RefObject<HTMLPreElement | null> }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => {
        const text = codeRef.current?.textContent || '';
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="eip-copy-btn"
      title="Copy code"
    >
      {copied ? '✓' : 'Copy'}
    </button>
  );
}

function CodeBlock({ children, ...rest }: React.ComponentPropsWithoutRef<'pre'>) {
  const codeRef = React.useRef<HTMLPreElement>(null);
  return (
    <div className="eip-code-block">
      <CopyButton codeRef={codeRef} />
      <pre ref={codeRef} {...rest}>{children}</pre>
    </div>
  );
}

function reactNodeToText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return reactNodeToText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return '';
}

function HeadingWithAnchor({ level, children, slugMap, ...rest }: { level: number; children: React.ReactNode; slugMap: Map<string, number> } & React.ComponentPropsWithoutRef<'h2'>) {
  const text = reactNodeToText(children);
  const id = deduplicateSlug(slugify(text), slugMap);
  const Tag = `h${level}` as 'h2' | 'h3' | 'h4';
  return (
    <Tag id={id} className="group" {...rest}>
      {children}
      <a href={`#${id}`} className="eip-heading-anchor" aria-hidden="true">#</a>
    </Tag>
  );
}

const LazyEipMarkdown = lazy(() =>
  Promise.all([import('react-markdown'), import('remark-gfm')]).then(
    ([{ default: ReactMarkdown }, { default: remarkGfm }]) => ({
      default: ({ children: rawChildren, navigate }: { children: string; navigate: (path: string) => void }) => {
        const children = normalizeHeadings(rawChildren);
        const eipLinkPattern = /(?:\.\/eip-|\.\.\/EIPS\/eip-|https?:\/\/eips\.ethereum\.org\/EIPS\/eip-)(\d+)(?:\.md)?/;
        const headings = extractHeadings(children);
        const slugMap = new Map<string, number>();
        return (
          <>
            {headings.length >= 4 && (
              <details className="eip-toc">
                <summary>Table of contents</summary>
                <nav>
                  <ul>
                    {(() => {
                      const items: React.ReactNode[] = [];
                      let i = 0;
                      while (i < headings.length) {
                        const h = headings[i];
                        if (h.level === 2) {
                          const subs: typeof headings = [];
                          let j = i + 1;
                          while (j < headings.length && headings[j].level > 2) {
                            subs.push(headings[j]);
                            j++;
                          }
                          items.push(
                            <li key={h.id} className="eip-toc-2">
                              <a href={`#${h.id}`}>
                                <span className="eip-toc-number">{h.number}</span>
                                {h.text}
                              </a>
                              {subs.length > 0 && (
                                <span className="eip-toc-subs">
                                  {subs.map((s) => (
                                    <a key={s.id} href={`#${s.id}`} className="eip-toc-sub">
                                      {s.text}
                                    </a>
                                  ))}
                                </span>
                              )}
                            </li>
                          );
                          i = j;
                        } else {
                          i++;
                        }
                      }
                      return items;
                    })()}
                  </ul>
                </nav>
              </details>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children: linkChildren, ...rest }) => {
                  if (href) {
                    const match = href.match(eipLinkPattern);
                    if (match) {
                      return (
                        <a
                          {...rest}
                          href={`/eips/${match[1]}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/eips/${match[1]}`);
                          }}
                        >
                          {linkChildren}
                        </a>
                      );
                    }
                  }
                  return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{linkChildren}</a>;
                },
                img: ({ src, alt, ...rest }) => {
                  let resolvedSrc = src;
                  if (src && src.startsWith('../assets/')) {
                    resolvedSrc = `https://raw.githubusercontent.com/ethereum/EIPs/master/${src.replace('../', '')}`;
                  }
                  return <img src={resolvedSrc} alt={alt || ''} {...rest} />;
                },
                table: ({ children: tableChildren, ...rest }) => (
                  <div className="eip-table-wrapper">
                    <table {...rest}>{tableChildren}</table>
                  </div>
                ),
                pre: (props) => <CodeBlock {...props} />,
                h2: ({ children: hChildren, ...rest }) => <HeadingWithAnchor level={2} slugMap={slugMap} {...rest}>{hChildren}</HeadingWithAnchor>,
                h3: ({ children: hChildren, ...rest }) => <HeadingWithAnchor level={3} slugMap={slugMap} {...rest}>{hChildren}</HeadingWithAnchor>,
                h4: ({ children: hChildren, ...rest }) => <HeadingWithAnchor level={4} slugMap={slugMap} {...rest}>{hChildren}</HeadingWithAnchor>,
              }}
            >
              {children}
            </ReactMarkdown>
          </>
        );
      },
    }),
  ),
);

const dependentsMap = buildDependentsMap(eipsData);
const requiredEipSpecUrl = (eipId: number): string => `https://eips.ethereum.org/EIPS/eip-${eipId}`;
const requiredEipLinkClassName = 'font-mono hover:text-slate-700 dark:hover:text-slate-200 transition-colors';

export const EipPage: React.FC<{ id: string }> = ({ id }) => {
  const { trackLinkClick } = useAnalytics();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [upcomingCall, setUpcomingCall] = useState<UpcomingCall | null>(null);
  const [hoveredReq, setHoveredReq] = useState<EIP | null>(null);
  const [reqTooltipPos, setReqTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const eipId = parseInt(id || '', 10);
  const eip = eipsData.find((e) => e.id === eipId);
  const layer = eip ? getEipLayer(eip) : null;
  const callType = eipCallTypes[eipId];
  const callNav = callType ? getCallNavigation(callType) : null;

  // Show analysis tab if the EIP has any analysis content
  const hasAnalysis = Boolean(
    eip && (
      eip.laymanDescription ||
      (eip.benefits && eip.benefits.length > 0) ||
      (eip.tradeoffs && eip.tradeoffs.length > 0) ||
      (eip.stakeholderImpacts && Object.keys(eip.stakeholderImpacts).length > 0) ||
      eip.northStarAlignment ||
      (eip.forkRelationships && eip.forkRelationships.length > 0)
    ),
  );

  const dependents = dependentsMap.get(eipId) || [];
  const hasDependents = dependents.length > 0;
  const hasFaq = Boolean(eip?.faq?.length);

  // View mode derived from URL ?tab= param
  const validTabs = ['analysis', 'spec', 'dependents', 'history', 'faq'] as const;
  type ViewMode = typeof validTabs[number];
  const defaultTab: ViewMode = hasAnalysis ? 'analysis' : 'spec';
  const tabParam = searchParams.get('tab') as ViewMode | null;
  const hasHash = typeof window !== 'undefined' && window.location.hash.length > 1;
  const hasQParam = searchParams.has('q');
  const hasFaqQuestionParam = tabParam === 'faq' && hasQParam && hasFaq;
  const isValidTab = tabParam && validTabs.includes(tabParam) && (tabParam !== 'dependents' || hasDependents) && (tabParam !== 'faq' || hasFaq);
  const viewMode: ViewMode = hasFaqQuestionParam ? 'faq' : isValidTab ? tabParam : hasHash ? 'spec' : defaultTab;

  const setViewMode = (mode: ViewMode) => {
    const next = new URLSearchParams(searchParams);
    if (mode === defaultTab) {
      next.delete('tab');
    } else {
      next.set('tab', mode);
    }
    if (mode !== 'faq') {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
  };

  const { content: specContent, loading: specLoading, error: specError } = useEipMarkdown(eipId, viewMode === 'spec');
  const { history, loading: historyLoading, error: historyError } = useEipHistory(eipId, true);

  // Get sorted EIPs for navigation
  const sortedEips = useMemo(() => [...eipsData].sort((a, b) => a.id - b.id), []);
  const currentIndex = sortedEips.findIndex((e) => e.id === eipId);
  const prevEip = currentIndex > 0 ? sortedEips[currentIndex - 1] : null;
  const nextEip = currentIndex < sortedEips.length - 1 ? sortedEips[currentIndex + 1] : null;

  const tabBarRef = React.useRef<HTMLDivElement>(null);
  // Each EIP is its own Astro page, so EIP-to-EIP navigation is a full reload that
  // mounts this island fresh — just scroll to top on mount. (A stale ?tab= can't carry
  // across EIPs under full-reload nav, so no cross-EIP tab reset is needed.)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll tab bar into view when deep-linking to a FAQ question
  useEffect(() => {
    if (hasFaqQuestionParam && tabBarRef.current) {
      requestAnimationFrame(() => {
        tabBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Fetch upcoming breakout call if this EIP has one
  useEffect(() => {
    if (callType) {
      fetchUpcomingCalls().then((calls) => {
        const upcoming = calls.find((c) => c.type === callType);
        setUpcomingCall(upcoming || null);
      });
    } else {
      setUpcomingCall(null);
    }
  }, [callType]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Handle Cmd/Ctrl+K for search
    if (isSearchHotkey(e)) {
      e.preventDefault();
      setSearchModalOpen(true);
      return;
    }

    // Don't navigate if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (e.key === 'ArrowLeft' && prevEip) {
      navigate(`/eips/${prevEip.id}`);
    } else if (e.key === 'ArrowRight' && nextEip) {
      navigate(`/eips/${nextEip.id}`);
    }
  }, [navigate, prevEip, nextEip]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (viewMode === 'spec' && specContent && !specLoading && window.location.hash) {
      const id = window.location.hash.slice(1);
      // Retry to account for lazy-loaded renderer
      let attempts = 0;
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else if (attempts < 5) {
          attempts++;
          setTimeout(tryScroll, 200);
        }
      };
      setTimeout(tryScroll, 100);
    }
  }, [viewMode, specContent, specLoading]);

  if (!eip) {
    return null;
  }

  const requiredEipIds = eip.requires ?? [];

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  const notices = eip.forkRelationships.flatMap((forkRelationship) =>
    forkRelationship.notice ? [forkRelationship.notice] : [],
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Site Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/eips"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>All EIPs</span>
          </Link>
          <EipSearch onOpen={() => setSearchModalOpen(true)} />
        </div>

        {/* Main Card */}
        <article className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          {/* Metadata Header */}
          <header className="p-6 bg-gradient-to-br from-purple-50 via-slate-50 to-blue-50 dark:from-purple-900/20 dark:via-slate-800 dark:to-blue-900/20 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-slate-400 dark:text-slate-400 text-sm font-mono">
                    {getProposalPrefix(eip)}-{eip.id}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-transparent">
                    {eip.status}
                  </span>
                  {layer && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      layer === 'EL'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600'
                        : 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 border border-teal-200 dark:border-teal-600'
                    }`} title={layer === 'EL' ? 'Primarily impacts Execution Layer' : 'Primarily impacts Consensus Layer'}>
                      {layer}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-medium text-slate-900 dark:text-slate-100 leading-tight">
                  {getLaymanTitle(eip)}
                </h1>
              </div>

              {/* External links */}
              <div className="flex items-center gap-2">
                {eip.discussionLink && (
                  <Tooltip text="View discussion">
                    <a
                      href={eip.discussionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleExternalLinkClick('discussion', eip.discussionLink ?? '')}
                      className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
                    >
                      <div className="relative w-7 h-7">
                        <img
                          src="/eth-mag.png"
                          alt="Ethereum Magicians"
                          className="w-7 h-7 opacity-90 dark:opacity-70"
                        />
                      </div>
                    </a>
                  </Tooltip>
                )}
                <Tooltip text="View specification">
                  <a
                    href={getSpecificationUrl(eip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleExternalLinkClick('specification', getSpecificationUrl(eip))}
                    className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
                  >
                    <div className="relative w-7 h-7">
                      <img
                        src="/eth-diamond-black.png"
                        alt="Ethereum"
                        className="w-7 h-7 opacity-90 dark:opacity-100 dark:invert"
                      />
                    </div>
                  </a>
                </Tooltip>
              </div>
            </div>

            {/* Description */}
            {notices.map((notice, index) => (
              <EipNotice key={index} notice={notice} className="mt-4" />
            ))}

            <p className="mt-4 text-slate-700 dark:text-slate-300 leading-relaxed">
              {parseMarkdownLinks(eip.description)}
            </p>

            {/* Authors & Requires */}
            <div className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <div>
                Authors:{' '}
                {parseAuthors(eip.author).map((author, index, arr) => (
                  <span key={index}>
                    {author.handle ? (
                      <Tooltip text={`${author.handle} (click to copy)`} className="inline">
                        <span
                          className="cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                          onClick={() => navigator.clipboard.writeText(author.handle!)}
                        >
                          {author.name}
                        </span>
                      </Tooltip>
                    ) : (
                      <span>{author.name}</span>
                    )}
                    {index < arr.length - 1 && ', '}
                  </span>
                ))}
              </div>
              {requiredEipIds.length > 0 && (
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                  <span>Requires:</span>
                  <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                    {requiredEipIds.map((reqId, i) => {
                      const reqEip = eipById.get(reqId);
                      return (
                        <span key={reqId} className="inline-flex items-center">
                          {reqEip ? (
                            <Link
                              to={`/eips/${reqId}`}
                              className={requiredEipLinkClassName}
                              style={{ borderBottom: '1px dotted currentColor' }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const tooltipWidth = 360;
                                const padding = 8;
                                let x = rect.left + rect.width / 2 - tooltipWidth / 2;
                                if (x + tooltipWidth > window.innerWidth - padding) {
                                  x = window.innerWidth - tooltipWidth - padding;
                                }
                                if (x < padding) x = padding;
                                setHoveredReq(reqEip);
                                setReqTooltipPos({ x, y: rect.bottom + padding });
                              }}
                              onMouseLeave={() => {
                                setHoveredReq(null);
                                setReqTooltipPos(null);
                              }}
                            >
                              EIP-{reqId}
                            </Link>
                          ) : (
                            <a
                              href={requiredEipSpecUrl(reqId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={requiredEipLinkClassName}
                              style={{ borderBottom: '1px dotted currentColor' }}
                            >
                              EIP-{reqId}
                            </a>
                          )}
                          {i < requiredEipIds.length - 1 && <span>,</span>}
                        </span>
                      );
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Breakout Call */}
            {callType && (callNav?.previous || upcomingCall) && (
              <div className="mt-4 flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{callTypeNames[callType]}</span>
                </div>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <div className="flex items-center gap-3">
                  {callNav?.previous && (
                    <Link
                      to={`/calls/${callNav.previous.path}`}
                      className="text-purple-600 dark:text-purple-400 underline decoration-purple-300 dark:decoration-purple-700 underline-offset-2 hover:decoration-purple-500 dark:hover:decoration-purple-400 transition-colors"
                    >
                      Latest: Call #{parseInt(callNav.previous.number, 10)}
                    </Link>
                  )}
                  {upcomingCall && (
                    <a
                      href={upcomingCall.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 underline decoration-purple-300 dark:decoration-purple-700 underline-offset-2 hover:decoration-purple-500 dark:hover:decoration-purple-400 transition-colors"
                    >
                      Upcoming: Call #{parseInt(upcomingCall.number, 10)}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}
          </header>

          {/* View mode tabs */}
          <div ref={tabBarRef} className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-700">
            {hasAnalysis && (
              <button
                onClick={() => setViewMode('analysis')}
                className={`shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                  viewMode === 'analysis'
                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Analysis
              </button>
            )}
            <button
              onClick={() => setViewMode('spec')}
              className={`shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                viewMode === 'spec'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Specification
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                viewMode === 'history'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              History
              {history && history.commits.length > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-xs font-medium rounded-full ${
                  viewMode === 'history'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>{history.commits.length}</span>
              )}
            </button>
            {hasFaq && (
              <button
                onClick={() => setViewMode('faq')}
                className={`shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                  viewMode === 'faq'
                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                FAQ
                <span className={`ml-1.5 px-1.5 py-0.5 text-xs font-medium rounded-full ${
                  viewMode === 'faq'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>{eip!.faq!.length}</span>
              </button>
            )}
            {hasDependents && (
              <button
                onClick={() => setViewMode('dependents')}
                className={`shrink-0 px-6 py-3 text-sm font-medium transition-colors ${
                  viewMode === 'dependents'
                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Dependents
                <span className={`ml-1.5 px-1.5 py-0.5 text-xs font-medium rounded-full ${
                  viewMode === 'dependents'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>{dependents.length}</span>
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-8">
            {viewMode === 'analysis' && (
              <>
                {/* Timeline */}
                <EipTimeline eip={eip} />

                {/* Supporting Documents */}
                {eip.supportingDocuments && eip.supportingDocuments.length > 0 && (
                  <section className="bg-purple-50/50 dark:bg-purple-900/10 border-l-4 border-purple-500 rounded-r-lg p-4">
                    <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3 uppercase tracking-wide">
                      Resources
                    </h3>
                    <ul className="space-y-2">
                      {eip.supportingDocuments.map((doc) => (
                        <li key={doc.url}>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleExternalLinkClick('supporting_document', doc.url)}
                            className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2 transition-colors"
                          >
                            {doc.label}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Benefits */}
                {eip.benefits && eip.benefits.length > 0 && (
                  <section className="bg-emerald-50/50 dark:bg-emerald-900/10 border-l-4 border-emerald-500 rounded-r-lg p-4">
                    <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-3 uppercase tracking-wide">
                      Key Benefits
                    </h3>
                    <ul className="space-y-2">
                      {eip.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <span className="text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 text-xs">●</span>
                          <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Trade-offs */}
                {eip.tradeoffs && eip.tradeoffs.length > 0 ? (
                  <section className="bg-amber-50/50 dark:bg-amber-900/10 border-l-4 border-amber-500 rounded-r-lg p-4">
                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3 uppercase tracking-wide">
                      Trade-offs & Considerations
                    </h3>
                    <ul className="space-y-2">
                      {eip.tradeoffs.map((tradeoff, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <span className="text-amber-600 dark:text-amber-400 mr-3 mt-0.5 text-xs">●</span>
                          <span className="text-slate-700 dark:text-slate-300">{tradeoff}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : hasAnalysis ? (
                  <section className="bg-slate-50 dark:bg-slate-700/30 border-l-4 border-slate-300 dark:border-slate-600 rounded-r-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                      Trade-offs & Considerations
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      No trade-offs documented yet.
                    </p>
                  </section>
                ) : null}

                {/* Stakeholder Impact */}
                {eip.stakeholderImpacts && Object.keys(eip.stakeholderImpacts).length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
                      Stakeholder Impact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(eip.stakeholderImpacts).map(([stakeholder, impact]) => {
                        const stakeholderNames: Record<string, string> = {
                          endUsers: 'End Users',
                          appDevs: 'Application Developers',
                          walletDevs: 'Wallet Developers',
                          toolingInfra: 'Tooling / Infrastructure',
                          layer2s: 'Layer 2s',
                          stakersNodes: 'Stakers & Node Operators',
                          clClients: 'CL Client Developers',
                          elClients: 'EL Client Developers',
                        };

                        return (
                          <div
                            key={stakeholder}
                            className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 overflow-hidden"
                          >
                            <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm mb-1">
                              {stakeholderNames[stakeholder] || stakeholder}
                            </h4>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed break-words">
                              {impact.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* North Star Alignment */}
                {(eip.northStarAlignment?.scaleL1 ||
                  eip.northStarAlignment?.scaleBlobs ||
                  eip.northStarAlignment?.improveUX) && (
                  <section className="bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-indigo-500 rounded-r-lg p-4">
                    <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-3 uppercase tracking-wide">
                      North Star Goal Alignment
                    </h3>
                    <ul className="space-y-2">
                      {eip.northStarAlignment?.scaleL1 && (
                        <li className="flex items-start text-sm">
                          <span className="text-blue-600 dark:text-blue-400 mr-3 mt-0.5 text-xs">●</span>
                          <span>
                            <span className="font-medium text-blue-700 dark:text-blue-300">Scale L1:</span>{' '}
                            <span className="text-slate-700 dark:text-slate-300">{eip.northStarAlignment.scaleL1.description}</span>
                          </span>
                        </li>
                      )}
                      {eip.northStarAlignment?.scaleBlobs && (
                        <li className="flex items-start text-sm">
                          <span className="text-purple-600 dark:text-purple-400 mr-3 mt-0.5 text-xs">●</span>
                          <span>
                            <span className="font-medium text-purple-700 dark:text-purple-300">Scale Blobs:</span>{' '}
                            <span className="text-slate-700 dark:text-slate-300">{eip.northStarAlignment.scaleBlobs.description}</span>
                          </span>
                        </li>
                      )}
                      {eip.northStarAlignment?.improveUX && (
                        <li className="flex items-start text-sm">
                          <span className="text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 text-xs">●</span>
                          <span>
                            <span className="font-medium text-emerald-700 dark:text-emerald-300">Improve UX:</span>{' '}
                            <span className="text-slate-700 dark:text-slate-300">{eip.northStarAlignment.improveUX.description}</span>
                          </span>
                        </li>
                      )}
                    </ul>
                  </section>
                )}
              </>
            )}

            {viewMode === 'spec' && (
              <>
                {specLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading specification...
                  </div>
                )}
                {specError && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Specification not available.{' '}
                    <a
                      href={getSpecificationUrl(eip)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 dark:text-purple-400 underline underline-offset-2"
                    >
                      {eip.pendingPullRequest ? 'View pull request' : 'View on ethereum.org'}
                    </a>
                  </p>
                )}
                {specContent && !specLoading && (
                  <div className="prose prose-sm max-w-none text-slate-800 dark:text-slate-200
                    prose-headings:text-slate-900 dark:prose-headings:text-slate-100
                    prose-p:text-slate-800 dark:prose-p:text-slate-200
                    prose-strong:text-slate-900 dark:prose-strong:text-slate-100
                    prose-li:text-slate-800 dark:prose-li:text-slate-200
                    prose-td:text-slate-800 dark:prose-td:text-slate-200
                    prose-th:text-slate-900 dark:prose-th:text-slate-100
                    prose-a:text-purple-600 dark:prose-a:text-purple-400
                    prose-code:text-sm prose-code:text-slate-800 prose-code:bg-slate-100 dark:prose-code:text-slate-200 dark:prose-code:bg-slate-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                    prose-pre:bg-slate-100 dark:prose-pre:bg-slate-700/50 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-600
                    prose-blockquote:not-italic
                    prose-img:rounded-lg prose-img:border prose-img:border-slate-200 dark:prose-img:border-slate-600"
                  >
                    <Suspense fallback={<div className="text-sm text-slate-500">Loading renderer...</div>}>
                      <LazyEipMarkdown navigate={navigate}>{specContent}</LazyEipMarkdown>
                    </Suspense>
                  </div>
                )}
              </>
            )}

            {viewMode === 'dependents' && (
              <EipDependents dependents={dependents} />
            )}

            {viewMode === 'history' && (
              <EipSpecHistory
                eipId={eipId}
                history={history}
                loading={historyLoading}
                error={historyError}
              />
            )}

            {viewMode === 'faq' && (
              <EipFaq items={eip.faq ?? []} />
            )}
          </div>
        </article>

        {/* Previous/Next Navigation + GitHub link */}
        <nav className="mt-6 flex items-center justify-between">
          {prevEip ? (
            <Link
              to={`/eips/${prevEip.id}`}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-mono text-xs">{getProposalPrefix(prevEip)}-{prevEip.id}</span>
            </Link>
          ) : (
            <div />
          )}
          <a
            href={`https://github.com/ethereum/forkcast/blob/main/src/data/eips/${eip.id}.json`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleExternalLinkClick('github_eip', `https://github.com/ethereum/forkcast/blob/main/src/data/eips/${eip.id}.json`)}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>
          {nextEip ? (
            <Link
              to={`/eips/${nextEip.id}`}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors group"
            >
              <span className="font-mono text-xs">{getProposalPrefix(nextEip)}-{nextEip.id}</span>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <div />
          )}
        </nav>
      </div>

      {/* Search Modal */}
      <EipSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Hover card for required EIPs */}
      {hoveredReq && reqTooltipPos && createPortal(
        <div
          className="hidden md:block fixed z-50 pointer-events-none"
          style={{
            left: reqTooltipPos.x,
            top: reqTooltipPos.y,
            maxWidth: 360,
          }}
        >
          <div className="bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-600 rounded-lg shadow-2xl p-4">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">
                {getProposalPrefix(hoveredReq)}-{hoveredReq.id}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {hoveredReq.status}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {getLaymanTitle(hoveredReq)}
            </h4>
            {hoveredReq.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hoveredReq.description}
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
