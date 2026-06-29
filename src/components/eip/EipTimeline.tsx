import React from 'react';
import { Link } from '../navigation';
import { EIP } from '../../types';
import { networkUpgrades, getUpgradeById, getUpgradePagePath } from '../../data/upgrades';
import { formatCallReference } from '../../domain/calls/callReference';
import { buildEipTimelineForkGroup } from '../../domain/eips/eipTimeline';
import { Tooltip } from '../ui';

interface EipTimelineProps {
  eip: EIP;
}

const getForkDisplayName = (forkName: string): string => {
  const displayMap: Record<string, string> = {
    'Hegota': 'Hegotá'
  };
  return displayMap[forkName] || forkName;
};

interface ForkGroup {
  forkName: string;
  champions?: { name: string }[];
  currentStatus: string;
  isHeadliner: boolean;
  items: ReturnType<typeof buildEipTimelineForkGroup>['items'];
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

  const forkGroups: ForkGroup[] = sortedForks.map((fork) =>
    buildEipTimelineForkGroup(fork, {
      eipId: eip.id,
      headlinerSelection: getUpgradeById(fork.forkName.toLowerCase())?.headlinerSelection,
    })
  );

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
        <div className="px-3 py-3.5 sm:px-4 bg-white dark:bg-slate-800">
          <div className="relative">
            {forkGroups.map((group, groupIndex) => {
              const isLastNode = !hasCreatedDate && groupIndex === forkGroups.length - 1;
              const visibleChampions = group.champions?.filter(c => c.name) ?? [];
              const hasVisibleChampions = visibleChampions.length > 0;

              const allItems = group.items;

              return (
                <div key={group.forkName} className="relative flex gap-2.5 sm:gap-3">
                  {/* Main timeline dot and line */}
                  <div className="relative w-2.5 shrink-0 flex flex-col items-center pt-1">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-400 dark:bg-slate-500" />
                    {!isLastNode && (
                      <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mb-[-4px]" />
                    )}
                    {/* Horizontal line to fork badge */}
                    <div className="absolute left-2.5 top-[9px] w-2 h-0.5 bg-slate-200 dark:bg-slate-700" />
                  </div>

                  {/* Content */}
                  <div className={`min-w-0 flex-1 ${isLastNode ? '' : 'pb-4'}`}>
                    {/* Fork header with bordered badge */}
                    <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                      {(() => {
                        const forkPath = getUpgradePagePath(group.forkName);
                        const badgeClasses = 'shrink-0 text-xs font-mono font-medium px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300';
                        return forkPath ? (
                          <Link
                            to={forkPath}
                            className={`${badgeClasses} hover:border-purple-400 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors`}
                          >
                            {getForkDisplayName(group.forkName)}
                          </Link>
                        ) : (
                          <span className={badgeClasses}>{getForkDisplayName(group.forkName)}</span>
                        );
                      })()}
                      {hasVisibleChampions && (
                        <Tooltip text={`${visibleChampions.length > 1 ? 'Champions' : 'Champion'} for ${getForkDisplayName(group.forkName)}`}>
                          <div className="flex min-w-0 max-w-full items-start gap-1 text-xs text-slate-400 dark:text-slate-400 cursor-help sm:items-center sm:shrink-0">
                            <svg className="mt-0.5 w-3 h-3 shrink-0 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="min-w-0 break-words">{visibleChampions.map(c => c.name).join(' & ')}</span>
                          </div>
                        </Tooltip>
                      )}
                    </div>

                    {/* Sub-items with dot-and-line */}
                    {allItems.length > 0 && (
                      <div className="mt-1.5 ml-2 relative">
                        {allItems.map((item, idx) => {
                          const isLastChild = idx === allItems.length - 1;

                          if (item.type === 'status') {
                            const entry = item;
                            const entryColors = statusColors[entry.status] || statusColors.Proposed;
                            return (
                              <div key={`status-${idx}`} className={`relative flex items-start gap-2.5 ${isLastChild ? '' : 'pb-2.5'}`}>
                                <div className="relative mt-1 w-2 shrink-0 self-stretch">
                                  <div className={`relative z-10 w-2 h-2 rounded-full ${entryColors.dot}`} />
                                  {!isLastChild && (
                                    <div className="absolute left-[3px] top-2 bottom-[-18px] w-0.5 bg-slate-200 dark:bg-slate-700" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 leading-tight">
                                  <span className={`text-xs ${entryColors.text}`}>
                                    {statusLabels[entry.status]}
                                  </span>
                                  {group.isHeadliner && entry.status === 'Scheduled' && (
                                    <span className="ml-1.5 text-xs text-purple-600 dark:text-purple-400">★ Headliner</span>
                                  )}
                                  {(entry.date || entry.call) && (
                                    <>
                                      <span className="hidden md:inline text-xs text-slate-400 dark:text-slate-400">
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
                                      <div className="md:hidden text-xs text-slate-400 dark:text-slate-400">
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
                            const event = item;
                            const label = {
                              headlinerProposed: 'Headliner Proposed',
                              headlinerPresented: 'Headliner Presented',
                              headlinerWithdrawn: 'Headliner Withdrawn',
                              discussion: 'Discussion',
                            }[event.kind];

                            return (
                              <div key={`event-${idx}`} className={`relative flex items-start gap-2.5 ${isLastChild ? '' : 'pb-2.5'}`}>
                                <div className="relative mt-1 w-2 shrink-0 self-stretch">
                                  <div className="relative z-10 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                                  {!isLastChild && (
                                    <div className="absolute left-[3px] top-2 bottom-[-18px] w-0.5 bg-slate-200 dark:bg-slate-700" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 leading-tight">
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {label}
                                  </span>
                                  {(event.date || event.call || event.link) && (
                                    <>
                                      <span className="hidden md:inline text-xs text-slate-400 dark:text-slate-400">
                                        {' · '}
                                        {event.date && formatDate(event.date)}
                                        {event.date && (event.call || event.link) && ' · '}
                                        {event.call && (() => {
                                          const { display, link } = formatCallReference(event.call, event.timestamp);
                                          return (
                                            <Link
                                              to={link}
                                              className="hover:text-purple-600 dark:hover:text-purple-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2"
                                            >
                                              {display}
                                            </Link>
                                          );
                                        })()}
                                        {!event.call && event.link && (
                                          <a
                                            href={event.link}
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
                                      <div className="md:hidden text-xs text-slate-400 dark:text-slate-400">
                                        {event.date && formatDate(event.date)}
                                        {event.date && (event.call || event.link) && ' · '}
                                        {event.call && (() => {
                                          const { display, link } = formatCallReference(event.call, event.timestamp);
                                          return (
                                            <Link
                                              to={link}
                                              className="hover:text-purple-600 dark:hover:text-purple-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2"
                                            >
                                              {display}
                                            </Link>
                                          );
                                        })()}
                                        {!event.call && event.link && (
                                          <a
                                            href={event.link}
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
              <div className="relative flex gap-2.5 sm:gap-3">
                <div className="relative w-2.5 shrink-0 flex flex-col items-center pt-1">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColors.created.dot}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <span className="shrink-0 text-xs font-mono font-medium px-2 py-0.5 rounded border border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400">
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
