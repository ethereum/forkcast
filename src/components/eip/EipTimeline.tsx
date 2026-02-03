import React from 'react';
import { Link } from 'react-router-dom';
import { EIP } from '../../types';
import { networkUpgrades } from '../../data/upgrades';
import { Tooltip } from '../ui';

interface EipTimelineProps {
  eip: EIP;
}

interface StatusEntry {
  status: string;
  date?: string | null;
  call?: string | null;
  timestamp?: number;
  isCurrentStatus: boolean;
}

interface PresentationEntry {
  type: 'headliner_proposal' | 'headliner_presentation' | 'presentation' | 'debate';
  date?: string | null;
  call?: string | null;
  link?: string;
  timestamp?: number;
}

interface ForkGroup {
  forkName: string;
  champions?: { name: string }[];
  currentStatus: string;
  statusHistory: StatusEntry[];
  presentations: PresentationEntry[];
}

const statusColors: Record<string, { dot: string; text: string }> = {
  Included: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  Scheduled: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  Considered: {
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
  },
  Proposed: {
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
  },
  Declined: {
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
  },
  Withdrawn: {
    dot: 'bg-slate-400',
    text: 'text-slate-600 dark:text-slate-400',
  },
  created: {
    dot: 'bg-indigo-500',
    text: 'text-indigo-700 dark:text-indigo-400',
  },
};

const statusLabels: Record<string, string> = {
  Proposed: 'Proposed',
  Considered: 'Considered for Inclusion',
  Scheduled: 'Scheduled for Inclusion',
  Declined: 'Declined',
  Included: 'Included',
  Withdrawn: 'Withdrawn',
};

function formatCallReference(call: string, timestamp?: number): { display: string; link: string } {
  const [prefix, number] = call.split('/');
  const paddedNumber = number.padStart(3, '0');
  const baseLink = `/calls/${prefix}/${paddedNumber}`;
  return {
    display: `${prefix.toUpperCase()} #${number}`,
    link: timestamp ? `${baseLink}#t=${timestamp}` : baseLink,
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getUpgradeOrder(forkName: string): number {
  const index = networkUpgrades.findIndex(u => u.id === forkName.toLowerCase());
  return index === -1 ? 999 : index;
}

export const EipTimeline: React.FC<EipTimelineProps> = ({ eip }) => {
  // Build fork groups sorted by upgrade order (most recent first)
  const sortedForks = [...(eip.forkRelationships || [])].sort((a, b) => {
    return getUpgradeOrder(b.forkName) - getUpgradeOrder(a.forkName);
  });

  const forkGroups: ForkGroup[] = sortedForks.map((fork) => {
    // If there are champions and no "Proposed" in history, prepend it
    const hasProposedStep = fork.statusHistory.some(entry => entry.status === 'Proposed');
    const hasChampions = fork.champions && fork.champions.length > 0;
    const effectiveHistory = (hasChampions && !hasProposedStep)
      ? [{ status: 'Proposed' as const, call: null, date: null }, ...fork.statusHistory]
      : fork.statusHistory;

    // Reverse so most recent is first
    const reversedHistory = [...effectiveHistory].reverse();
    const currentStatus = reversedHistory[0]?.status || 'Proposed';

    // Build status entries (include current status as first item)
    const statusHistory: StatusEntry[] = reversedHistory
      .map((entry, index) => ({
        status: entry.status,
        date: entry.date,
        call: entry.call,
        timestamp: entry.timestamp,
        isCurrentStatus: index === 0,
      }))
      .filter((entry) => {
        // Always show current status
        if (entry.isCurrentStatus) return true;
        const hasAttribution = entry.date || entry.call;
        const isProposed = entry.status === 'Proposed';
        return hasAttribution || isProposed;
      });

    // Build presentation entries
    const presentations: PresentationEntry[] = (fork.presentationHistory || []).map(p => ({
      type: p.type,
      date: p.date,
      call: p.call,
      link: p.link,
      timestamp: p.timestamp,
    }));

    return {
      forkName: fork.forkName,
      champions: fork.champions,
      currentStatus,
      statusHistory,
      presentations,
    };
  });

  const hasCreatedDate = !!eip.createdDate;
  const totalNodes = forkGroups.length + (hasCreatedDate ? 1 : 0);

  if (totalNodes === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
        Timeline
      </h3>
      <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3.5 bg-white dark:bg-slate-800">
          <div className="relative">
            {forkGroups.map((group, groupIndex) => {
              const isLastNode = !hasCreatedDate && groupIndex === forkGroups.length - 1;

              // Merge and sort status history and presentations chronologically
              const allItems = [
                ...group.statusHistory.map((entry) => ({
                  type: 'status' as const,
                  entry,
                  date: entry.date,
                  isCurrentStatus: entry.isCurrentStatus
                })),
                ...group.presentations.map((presentation) => ({
                  type: 'presentation' as const,
                  presentation,
                  date: presentation.date
                })),
              ].sort((a, b) => {
                // Current status always first
                if (a.type === 'status' && a.isCurrentStatus) return -1;
                if (b.type === 'status' && b.isCurrentStatus) return 1;

                // Then sort by date (most recent first)
                if (!a.date && !b.date) return 0;
                if (!a.date) return 1;
                if (!b.date) return -1;
                return new Date(b.date).getTime() - new Date(a.date).getTime();
              });

              return (
                <div key={group.forkName} className="relative flex gap-3">
                  {/* Main timeline dot and line */}
                  <div className="relative w-2.5 shrink-0 flex flex-col items-center pt-1">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-400 dark:bg-slate-500" />
                    {!isLastNode && (
                      <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mb-[-4px]" />
                    )}
                    {/* Horizontal line to fork badge */}
                    <div className="absolute left-2.5 top-[9px] w-3 h-0.5 bg-slate-200 dark:bg-slate-700" />
                  </div>

                  {/* Content */}
                  <div className={`min-w-0 flex-1 ${isLastNode ? '' : 'pb-4'}`}>
                    {/* Fork header with bordered badge */}
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to={`/upgrade/${group.forkName.toLowerCase()}`}
                        className="text-xs font-mono font-medium px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-purple-400 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                      >
                        {group.forkName}
                      </Link>
                      {group.champions && group.champions.length > 0 && (
                        <Tooltip text={`${group.champions.length > 1 ? 'Champions' : 'Champion'} for ${group.forkName}`}>
                          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 cursor-help shrink-0">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{group.champions.map(c => c.name).join(' & ')}</span>
                          </div>
                        </Tooltip>
                      )}
                    </div>

                    {/* Sub-items with dot-and-line */}
                    {allItems.length > 0 && (
                      <div className="mt-1.5 ml-2 relative">
                        {/* Connecting line from fork header - hidden on mobile */}
                        <div className="hidden md:block absolute left-[3px] -top-1.5 w-0.5 h-3 bg-slate-200 dark:bg-slate-700" />
                        {allItems.map((item, idx) => {
                          const isLastChild = idx === allItems.length - 1;

                          if (item.type === 'status') {
                            const entry = item.entry;
                            const entryColors = statusColors[entry.status] || statusColors.Proposed;
                            return (
                              <div key={`status-${idx}`} className={`relative flex items-center gap-2.5 ${isLastChild ? '' : 'pb-2.5'}`}>
                                <div className="relative w-2 shrink-0">
                                  <div className={`w-2 h-2 rounded-full ${entryColors.dot}`} />
                                  {!isLastChild && (
                                    <div className="hidden md:block absolute left-[3px] top-2 w-0.5 h-[20px] bg-slate-200 dark:bg-slate-700" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 leading-none">
                                  <span className={`text-xs ${entryColors.text}`}>
                                    {statusLabels[entry.status]}
                                  </span>
                                  {(entry.date || entry.call) && (
                                    <>
                                      <span className="hidden md:inline text-xs text-slate-400 dark:text-slate-500">
                                        {' · '}
                                        {entry.date && formatDate(entry.date)}
                                        {entry.date && entry.call && ' · '}
                                        {entry.call && (() => {
                                          const { display, link } = formatCallReference(entry.call, entry.timestamp);
                                          return (
                                            <Link
                                              to={link}
                                              className="hover:text-purple-600 dark:hover:text-purple-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2"
                                            >
                                              {display}
                                            </Link>
                                          );
                                        })()}
                                      </span>
                                      <div className="md:hidden text-xs text-slate-400 dark:text-slate-500">
                                        {entry.date && formatDate(entry.date)}
                                        {entry.date && entry.call && ' · '}
                                        {entry.call && (() => {
                                          const { display, link } = formatCallReference(entry.call, entry.timestamp);
                                          return (
                                            <Link
                                              to={link}
                                              className="hover:text-purple-600 dark:hover:text-purple-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2"
                                            >
                                              {display}
                                            </Link>
                                          );
                                        })()}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          } else {
                            const presentation = item.presentation;
                            const label = {
                              'headliner_proposal': 'Headliner Proposal',
                              'headliner_presentation': 'Headliner Presentation',
                              'presentation': 'Presented',
                              'debate': 'Debated',
                            }[presentation.type] || 'Presented';

                            return (
                              <div key={`pres-${idx}`} className={`relative flex items-center gap-2.5 ${isLastChild ? '' : 'pb-2.5'}`}>
                                <div className="relative w-2 shrink-0">
                                  <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                                  {!isLastChild && (
                                    <div className="hidden md:block absolute left-[3px] top-2 w-0.5 h-[20px] bg-slate-200 dark:bg-slate-700" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 leading-none">
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {label}
                                  </span>
                                  {(presentation.date || presentation.call || presentation.link) && (
                                    <>
                                      <span className="hidden md:inline text-xs text-slate-400 dark:text-slate-500">
                                        {' · '}
                                        {presentation.date && formatDate(presentation.date)}
                                        {presentation.date && (presentation.call || presentation.link) && ' · '}
                                        {presentation.call && (() => {
                                          const { display, link } = formatCallReference(presentation.call, presentation.timestamp);
                                          return (
                                            <Link
                                              to={link}
                                              className="hover:text-purple-600 dark:hover:text-purple-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2"
                                            >
                                              {display}
                                            </Link>
                                          );
                                        })()}
                                        {!presentation.call && presentation.link && (
                                          <a
                                            href={presentation.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-purple-600 dark:hover:text-purple-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2 inline-flex items-center gap-1"
                                          >
                                            Forum Post
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                          </a>
                                        )}
                                      </span>
                                      <div className="md:hidden text-xs text-slate-400 dark:text-slate-500">
                                        {presentation.date && formatDate(presentation.date)}
                                        {presentation.date && (presentation.call || presentation.link) && ' · '}
                                        {presentation.call && (() => {
                                          const { display, link } = formatCallReference(presentation.call, presentation.timestamp);
                                          return (
                                            <Link
                                              to={link}
                                              className="hover:text-purple-600 dark:hover:text-purple-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2"
                                            >
                                              {display}
                                            </Link>
                                          );
                                        })()}
                                        {!presentation.call && presentation.link && (
                                          <a
                                            href={presentation.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-purple-600 dark:hover:text-purple-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2 inline-flex items-center gap-1"
                                          >
                                            Forum Post
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                          </a>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* EIP Created node */}
            {hasCreatedDate && (
              <div className="relative flex gap-3">
                <div className="relative w-2.5 shrink-0 flex flex-col items-center pt-1">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColors.created.dot}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded border border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400">
                      EIP Created
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(eip.createdDate!)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
