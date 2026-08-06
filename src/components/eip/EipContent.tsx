import React, { useState, useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from '../navigation';
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
import { EipSpecHistory } from './EipSpecHistory';
import { EipDependents } from './EipDependents';
import { EipFaq } from './EipFaq';
import { useEipHistory } from '../../hooks/useEipHistory';
import { resolveEipMarkdownLink } from '../../domain/eips/eipMarkdownLinks';

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

function stripMarkdownInline(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1');
}

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
  const counters = [0, 0, 0];
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
                  const eipLink = href ? resolveEipMarkdownLink(href, eipById) : null;
                  if (eipLink) {
                    if (eipLink.kind === 'internal') {
                      return (
                        <a
                          {...rest}
                          href={eipLink.href}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(eipLink.href);
                          }}
                        >
                          {linkChildren}
                        </a>
                      );
                    }
                    return <a href={eipLink.href} target="_blank" rel="noopener noreferrer" {...rest}>{linkChildren}</a>;
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

export type EipContentTab = 'analysis' | 'spec' | 'history' | 'faq' | 'dependents';

interface EipContentProps {
  eip: EIP;
  /**
   * Seeds the tab on mount only — this is deliberately copied into local state
   * rather than derived, so later changes to this prop are ignored. Callers that
   * need to drive the tab externally should remount via `key`.
   */
  initialTab?: EipContentTab;
  onTabChange?: (tab: EipContentTab) => void;
  /** Lets a parent scroll the tab bar into view (e.g. FAQ deep links). */
  tabBarRef?: React.Ref<HTMLDivElement>;
  /**
   * Scroll to `window.location.hash` once the spec renders. Only meaningful for
   * the full page — in a drawer the hash refers to the underlying page.
   */
  scrollToHash?: boolean;
}

export const EipContent: React.FC<EipContentProps> = ({
  eip,
  initialTab,
  onTabChange,
  tabBarRef,
  scrollToHash = false,
}) => {
  const { trackLinkClick } = useAnalytics();
  const navigate = useNavigate();

  const layer = getEipLayer(eip);
  const eipId = eip.id;

  const hasAnalysis = Boolean(
    eip.laymanDescription ||
    (eip.benefits && eip.benefits.length > 0) ||
    (eip.tradeoffs && eip.tradeoffs.length > 0) ||
    (eip.stakeholderImpacts && Object.keys(eip.stakeholderImpacts).length > 0) ||
    eip.northStarAlignment ||
    (eip.forkRelationships && eip.forkRelationships.length > 0)
  );

  const dependents = dependentsMap.get(eipId) || [];
  const hasDependents = dependents.length > 0;
  const hasFaq = Boolean(eip.faq?.length);

  type ViewMode = EipContentTab;
  const defaultTab: ViewMode = hasAnalysis ? 'analysis' : 'spec';
  const [viewMode, setViewModeRaw] = useState<ViewMode>(initialTab ?? defaultTab);

  const setViewMode = (mode: ViewMode) => {
    setViewModeRaw(mode);
    onTabChange?.(mode);
  };

  const { content: specContent, loading: specLoading, error: specError } = useEipMarkdown(eipId, viewMode === 'spec');
  const { history, loading: historyLoading, error: historyError } = useEipHistory(eipId, true);

  // Deep links like /eips/7702#rationale land on the spec tab; scroll to the
  // heading once the lazily-loaded markdown renderer has painted it.
  useEffect(() => {
    if (!scrollToHash) return;
    if (viewMode !== 'spec' || !specContent || specLoading || !window.location.hash) return;

    const targetId = window.location.hash.slice(1);
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tryScroll = () => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else if (attempts < 5) {
        attempts++;
        timer = setTimeout(tryScroll, 200);
      }
    };
    timer = setTimeout(tryScroll, 100);
    return () => clearTimeout(timer);
  }, [scrollToHash, viewMode, specContent, specLoading]);

  const [hoveredReq, setHoveredReq] = useState<EIP | null>(null);
  const [reqTooltipPos, setReqTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const requiredEipIds = eip.requires ?? [];

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  const notices = eip.forkRelationships.flatMap((forkRelationship) =>
    forkRelationship.notice ? [forkRelationship.notice] : [],
  );

  return (
    <>
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
              }`}>{eip.faq!.length}</span>
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
                  prose-code:before:content-none prose-code:after:content-none
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
    </>
  );
};
