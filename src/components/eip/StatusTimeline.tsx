import React from 'react';
import { Link } from 'react-router-dom';
import { EIP, ForkRelationship } from '../../types';
import { getUpgradeById, networkUpgrades } from '../../data/upgrades';
import { Tooltip } from '../ui';

interface StatusTimelineProps {
  eip: EIP;
}

interface ForkTimelineSectionProps {
  forkRelationship: ForkRelationship;
}

const statusColors: Record<string, { dot: string; text: string }> = {
  Included: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  Scheduled: {
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
  },
  Considered: {
    dot: 'bg-purple-500',
    text: 'text-purple-700 dark:text-purple-400',
  },
  Proposed: {
    dot: 'bg-slate-400',
    text: 'text-slate-600 dark:text-slate-400',
  },
  Declined: {
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
  },
  Withdrawn: {
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
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
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const ForkTimelineSection: React.FC<ForkTimelineSectionProps> = ({
  forkRelationship,
}) => {
  const { forkName, statusHistory } = forkRelationship;
  const champion = forkRelationship.champion;
  const isSingleStatus = statusHistory.length === 1;
  const singleEntry = isSingleStatus ? statusHistory[0] : null;
  const singleEntryColors = singleEntry ? (statusColors[singleEntry.status] || statusColors.Proposed) : null;
  const singleHasMetadata = singleEntry && (singleEntry.date || singleEntry.call);

  // Compact single-line view for single status
  if (isSingleStatus && singleEntry && singleEntryColors) {
    return (
      <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <h4 className="font-medium text-slate-900 dark:text-slate-100 shrink-0">
            {forkName}
          </h4>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 shrink-0 rounded-full ${singleEntryColors.dot}`} />
            <span className={`text-sm ${singleEntryColors.text}`}>
              {statusLabels[singleEntry.status]}
            </span>
            {singleHasMetadata && (
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                {singleEntry.date && <span>({formatDate(singleEntry.date)}</span>}
                {singleEntry.date && singleEntry.call && <span>·</span>}
                {singleEntry.call && (() => {
                  const { display, link } = formatCallReference(singleEntry.call);
                  return (
                    <Link
                      to={link}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
                    >
                      {display}
                    </Link>
                  );
                })()}
                {singleEntry.date && <span>)</span>}
              </span>
            )}
          </div>
        </div>
        {champion && (
          <Tooltip text={`Champion for ${forkName}`}>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 shrink-0 cursor-help">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{champion.name}</span>
            </div>
          </Tooltip>
        )}
      </div>
    );
  }

  // Multi-status timeline view
  return (
    <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-slate-900 dark:text-slate-100">
            {forkName}
          </h4>
          {champion && (
            <Tooltip text={`Champion for ${forkName}`}>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-help">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{champion.name}</span>
              </div>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 bg-white dark:bg-slate-800">
        <div className="relative">
          {statusHistory.map((entry, index) => {
            const isLast = index === statusHistory.length - 1;
            const entryColors = statusColors[entry.status] || statusColors.Proposed;
            const hasMetadata = entry.date || entry.call;

            return (
              <div key={index} className="relative flex gap-3">
                {/* Timeline dot and line */}
                <div className="relative w-2.5 shrink-0 flex flex-col items-center pt-1">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isLast ? entryColors.dot : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  />
                  {!isLast && (
                    <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mb-[-4px]" />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-4 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                  <p
                    className={`text-sm font-medium leading-5 ${
                      isLast ? entryColors.text : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {statusLabels[entry.status]}
                  </p>
                  {hasMetadata && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                      {entry.date && <span>{formatDate(entry.date)}</span>}
                      {entry.date && entry.call && (
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                      )}
                      {entry.call && (() => {
                        const { display, link } = formatCallReference(entry.call);
                        return (
                          <Link
                            to={link}
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
                          >
                            {display}
                          </Link>
                        );
                      })()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ eip }) => {
  if (!eip.forkRelationships || eip.forkRelationships.length === 0) {
    return null;
  }

  // Sort fork relationships: active forks first (furthest future first), then live forks (most recent first)
  const sortedRelationships = [...eip.forkRelationships].sort((a, b) => {
    const upgradeA = getUpgradeById(a.forkName.toLowerCase());
    const upgradeB = getUpgradeById(b.forkName.toLowerCase());

    // If we can't find upgrade info, put at the end
    if (!upgradeA && !upgradeB) return 0;
    if (!upgradeA) return 1;
    if (!upgradeB) return -1;

    // Live upgrades go last (collapsed)
    const aIsLive = upgradeA.status === 'Live';
    const bIsLive = upgradeB.status === 'Live';
    if (aIsLive && !bIsLive) return 1;
    if (!aIsLive && bIsLive) return -1;

    // Within active forks: furthest future first (reverse chronological)
    // Within live forks: most recent first (reverse chronological)
    const indexA = networkUpgrades.findIndex(u => u.id === a.forkName.toLowerCase());
    const indexB = networkUpgrades.findIndex(u => u.id === b.forkName.toLowerCase());
    return indexB - indexA;
  });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
        Status History
      </h3>
      <div className="space-y-2">
        {sortedRelationships.map((forkRelationship) => (
          <ForkTimelineSection
            key={forkRelationship.forkName}
            forkRelationship={forkRelationship}
          />
        ))}
      </div>
    </div>
  );
};
