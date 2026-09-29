import React, { useState } from 'react';
import { eipById } from '../../data/eips';
import type { EipMentionsData } from '../../types/eip';
import { getDisplayTimestamp, type SyncConfig } from '../../utils/timestamp';
import { EipLinkWithTooltip } from './KeyDecisionsSection';

export type { EipMention, EipMentionMoment, EipMentionsData } from '../../types/eip';

const toMarkdown = (data: EipMentionsData): string =>
  [
    `## EIPs mentioned — ${data.meeting}`,
    ...data.eips.map(mention =>
      [
        `### EIP-${mention.eip}${mention.title ? `: ${mention.title}` : ''} (${mention.weight})`,
        mention.summary,
        ...mention.moments.map(moment => `- \`${moment.timestamp}\` ${moment.context}`),
      ].join('\n\n'),
    ),
  ].join('\n\n') + '\n';

interface CallEipMentionsProps {
  data: EipMentionsData;
  onTimestampClick?: (timestamp: string) => void;
  syncConfig?: SyncConfig;
}

const CallEipMentions: React.FC<CallEipMentionsProps> = ({ data, onTimestampClick, syncConfig }) => {
  const [copied, setCopied] = useState(false);
  // Fully collapsed: the summary line is the scannable unit, and a call naming 30
  // EIPs should open as a list you can run your eye down.
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

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

  const allExpanded = expanded.size === data.eips.length;
  const toggleAll = () => {
    setExpanded(allExpanded ? new Set() : new Set(data.eips.map((_, i) => i)));
  };

  const discussed = data.eips.filter(mention => mention.weight === 'discussed').length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="flex-1 min-w-[14rem] text-xs text-slate-500 dark:text-slate-400">
          Every EIP named on this call — {discussed} discussed, {data.eips.length - discussed} mentioned in passing.
        </p>
        <div className="flex shrink-0 gap-2">
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
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border-t border-slate-100 dark:border-slate-700/60">
        {data.eips.map((mention, index) => {
          const isOpen = expanded.has(index);
          const eip = eipById.get(mention.eip);
          // Prefer the live corpus so a retitled EIP doesn't read stale; the stored
          // title only covers EIPs the corpus doesn't carry, which have none.
          const title = eip?.title.replace(/^EIP-\d+:\s*/, '') ?? mention.title;
          return (
            <div key={mention.eip} className="py-3">
              <div className="flex items-baseline gap-2">
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  aria-label={`EIP-${mention.eip} mentions`}
                  className="shrink-0 self-center cursor-pointer"
                >
                  <svg
                    className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0">
                  {/* /eips/{id} is generated per corpus entry, so an EIP the corpus
                      doesn't carry has no page — and this tab indexes those by
                      design. Plain text beats a link that 404s. */}
                  {eip ? (
                    <EipLinkWithTooltip eipId={mention.eip} eipMap={eipById} />
                  ) : (
                    <span
                      className="text-slate-500 dark:text-slate-400"
                      title="Not tracked by Forkcast"
                    >
                      EIP-{mention.eip}
                    </span>
                  )}
                  {title && (
                    <span className="text-sm text-slate-900 dark:text-slate-100 min-w-0">{title}</span>
                  )}
                  {mention.weight === 'mentioned' && (
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[0.6875rem] font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      in passing
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-400">
                  {mention.moments.length > 1 ? `${mention.moments.length}×` : ''}
                </span>
              </div>
              {!isOpen && (
                <p className="mt-1 ml-[1.125rem] text-sm text-slate-500 dark:text-slate-400">
                  {mention.summary}
                </p>
              )}
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  {/* Timestamp in a fixed monospace gutter, whole row clickable —
                      the same shape the transcript pane uses for a time + text pair. */}
                  <ul className="mt-1 ml-[1.125rem]">
                    {mention.moments.map((moment, momentIndex) => (
                      <li key={momentIndex}>
                        <button
                          type="button"
                          onClick={() => onTimestampClick?.(moment.timestamp)}
                          className="group flex w-full gap-3 rounded px-2 -mx-2 py-1 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                        >
                          <span
                            className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
                            style={{ minWidth: '64px' }}
                          >
                            {getDisplayTimestamp(moment.timestamp, syncConfig)}
                          </span>
                          <span className="flex-1 min-w-0 text-sm text-slate-600 dark:text-slate-400">
                            {moment.context}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CallEipMentions;
