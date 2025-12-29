import React from 'react';
import { Link } from 'react-router-dom';
import { EIP } from '../../types';
import { networkUpgrades } from '../../data/upgrades';
import { Tooltip } from '../ui';

interface EipTimelineProps {
  eip: EIP;
}

interface TimelineEvent {
  type: 'created' | 'fork_status';
  date?: string;
  call?: string;
  forkName?: string;
  status?: string;
  champion?: { name: string };
  // For sorting: lower = more recent (shown first)
  sortOrder: number;
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

function formatCallReference(call: string): { display: string; link: string } {
  const [prefix, number] = call.split('/');
  return {
    display: `${prefix.toUpperCase()} #${number}`,
    link: `/calls/${call}`,
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
  // Build unified timeline events
  const events: TimelineEvent[] = [];

  // Add created event (will be at bottom)
  if (eip.createdDate) {
    events.push({
      type: 'created',
      date: eip.createdDate,
      sortOrder: 999999, // Always last
    });
  }

  // Add fork status events
  // Sort forks by upgrade order (furthest future first for display within same date)
  const sortedForks = [...(eip.forkRelationships || [])].sort((a, b) => {
    return getUpgradeOrder(b.forkName) - getUpgradeOrder(a.forkName);
  });

  sortedForks.forEach((fork) => {
    const upgradeOrder = getUpgradeOrder(fork.forkName);

    // Reverse the status history so most recent is first
    const reversedHistory = [...fork.statusHistory].reverse();

    reversedHistory.forEach((entry, index) => {
      // Always show current status (index 0), but skip prior statuses without attribution
      const isCurrentStatus = index === 0;
      const hasAttribution = entry.date || entry.call;
      if (!isCurrentStatus && !hasAttribution) {
        return;
      }

      // Calculate sort order:
      // - Dated events sort by date (descending)
      // - Within same fork, more recent statuses come first
      // - Undated events sort by upgrade order (furthest future first)
      let sortOrder: number;

      if (entry.date) {
        // Use negative timestamp so newer dates sort first
        sortOrder = -new Date(entry.date).getTime();
      } else {
        // Undated: use upgrade order * 1000 + position in history
        // This groups undated items by fork, with furthest future fork first
        sortOrder = (100 - upgradeOrder) * 1000 + index;
      }

      events.push({
        type: 'fork_status',
        date: entry.date,
        call: entry.call,
        forkName: fork.forkName,
        status: entry.status,
        champion: fork.champion,
        sortOrder,
      });
    });
  });

  // Sort events
  events.sort((a, b) => a.sortOrder - b.sortOrder);

  if (events.length === 0) {
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
            {events.map((event, index) => {
              const isLast = index === events.length - 1;
              const colors = event.type === 'created'
                ? statusColors.created
                : (statusColors[event.status || ''] || statusColors.Proposed);

              return (
                <div key={index} className="relative flex gap-3">
                  {/* Timeline dot and line */}
                  <div className="relative w-2.5 shrink-0 flex flex-col items-center pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mb-[-4px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-4'}`}>
                    {event.type === 'created' ? (
                      <>
                        <p className={`text-sm font-medium leading-5 ${colors.text}`}>
                          EIP Created
                        </p>
                        {event.date && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {formatDate(event.date)}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium leading-5 ${colors.text}`}>
                            <Link
                              to={`/upgrade/${event.forkName?.toLowerCase()}`}
                              className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-700 dark:hover:text-slate-300 mr-1.5 transition-colors"
                            >
                              {event.forkName}
                            </Link>
                            {statusLabels[event.status || '']}
                          </p>
                          {event.champion && (
                            <Tooltip text={`Champion for ${event.forkName}`}>
                              <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 cursor-help shrink-0">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>{event.champion.name}</span>
                              </div>
                            </Tooltip>
                          )}
                        </div>
                        {(event.date || event.call) && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {event.date && <span>{formatDate(event.date)}</span>}
                            {event.date && event.call && <span> · </span>}
                            {event.call && (() => {
                              const { display, link } = formatCallReference(event.call);
                              return (
                                <Link
                                  to={link}
                                  className="text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2"
                                >
                                  {display}
                                </Link>
                              );
                            })()}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
