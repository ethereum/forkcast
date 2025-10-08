import React, { useState } from 'react';

interface ActionItem {
  what: string;
  who?: string;
  timestamp?: string;
}

interface AgendaItem {
  start_timestamp: string;
  title: string;
  summary: string;
  decision: boolean | null;
  action_items?: ActionItem[];
  refs?: string[];
  subsection?: string; // Optional subsection grouping
}

interface AgendaSection {
  section: string;
  items: AgendaItem[];
}

interface AgendaData {
  executive_summary: string;
  agenda: AgendaSection[];
}

interface SyncConfig {
  transcriptStartTime: string;
  videoStartTime: string;
  description?: string;
}

interface AgendaSummaryProps {
  data: AgendaData;
  onTimestampClick?: (timestamp: string) => void;
  syncConfig?: SyncConfig;
  currentVideoTime?: number;
}

const AgendaSummary: React.FC<AgendaSummaryProps> = ({ data, onTimestampClick, syncConfig, currentVideoTime = 0 }) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const formatTimestamp = (timestamp: string): string => {
    // Convert "00:08:55" to "8:55" for display
    const [hours, minutes, seconds] = timestamp.split(':');
    const h = parseInt(hours);
    const m = parseInt(minutes);

    if (h === 0) {
      return `00:${m}:${seconds}`;
    }
    return `${h}:${m}:${seconds}`;
  };

  // Convert timestamp string to seconds for comparison
  const timestampToSeconds = (timestamp: string | null | undefined): number => {
    if (!timestamp) return 0;
    const parts = timestamp.split(':');
    if (parts.length !== 3) return 0;
    const [hours, minutes, seconds] = parts.map(p => parseFloat(p));
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Apply sync offset to convert transcript time to video time
  const getAdjustedVideoTime = (transcriptTimestamp: string): number => {
    const transcriptSeconds = timestampToSeconds(formatTimestamp(transcriptTimestamp));

    // Calculate offset from current config state
    if (syncConfig?.transcriptStartTime && syncConfig?.videoStartTime) {
      const transcriptStartSeconds = timestampToSeconds(syncConfig.transcriptStartTime);
      const videoStartSeconds = timestampToSeconds(syncConfig.videoStartTime);

      // The offset is the difference between transcript start and video start
      const offset = transcriptStartSeconds - videoStartSeconds;

      // Convert transcript time to video time by subtracting the offset
      const videoTime = transcriptSeconds - offset;

      return videoTime;
    }

    return transcriptSeconds;
  };

  // Convert seconds back to timestamp format for display
  const secondsToTimestamp = (totalSeconds: number): string => {
    const sign = totalSeconds < 0 ? '-' : '';
    const absSeconds = Math.abs(totalSeconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const seconds = Math.floor(absSeconds % 60);

    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle timestamp click
  const handleTimestampClick = (timestamp: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the expand/collapse
    if (onTimestampClick) {
      onTimestampClick(timestamp);
    }
  };

  // Toggle item expansion
  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  // Flatten all items to get global order for highlighting
  const allItems = data.agenda.flatMap(section => section.items);

  // Check if an agenda item should be highlighted based on current video time
  const isCurrentItem = (itemTimestamp: string, itemIndex: number): boolean => {
    if (!currentVideoTime || !syncConfig?.transcriptStartTime || !syncConfig?.videoStartTime) return false;

    const itemVideoTime = getAdjustedVideoTime(itemTimestamp);
    const nextItem = itemIndex < allItems.length - 1 ? allItems[itemIndex + 1] : null;
    const nextItemVideoTime = nextItem ? getAdjustedVideoTime(nextItem.start_timestamp) : Infinity;

    return currentVideoTime >= itemVideoTime && currentVideoTime < nextItemVideoTime;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Executive Summary + Agenda Details - Takes up 2/3 of the width */}
      <div className="lg:col-span-2 space-y-6">
        {/* Executive Summary Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
            Overview
          </h3>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {data.executive_summary}
            </p>
          </div>
        </div>

        {/* Agenda Details */}
        <div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4">
            Agenda Topics ({allItems.length})
          </h3>
          <div className="space-y-2">
            {allItems.map((item, index) => {
              // Find global index for highlighting logic
              const globalIndex = allItems.findIndex(globalItem =>
                globalItem.start_timestamp === item.start_timestamp &&
                globalItem.title === item.title
              );
              const isHighlighted = isCurrentItem(item.start_timestamp, globalIndex);
              const isExpanded = expandedItems.has(index);

              return (
                <div
                  key={index}
                  className={`border border-slate-200 dark:border-slate-700 border-l-3 border-l-blue-200 dark:border-l-blue-700/50 rounded-lg overflow-hidden transition-all duration-200 ${
                    isHighlighted
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-l-blue-500'
                      : item.decision === true
                      ? 'border-l-green-500 bg-green-50/30 dark:bg-green-900/10'
                      : ''
                  }`}
                >
                  <button
                    onClick={() => toggleItem(index)}
                    className={`w-full px-4 py-3 text-left hover:bg-blue-50/50 dark:hover:bg-blue-950/15 transition-colors flex items-center justify-between cursor-pointer ${
                      isHighlighted
                        ? 'bg-blue-50/30 dark:bg-blue-950/10'
                        : item.decision === true
                        ? 'bg-green-50/30 dark:bg-green-950/10'
                        : 'bg-blue-50/30 dark:bg-blue-950/10'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Clickable Timestamp */}
                      <button
                        onClick={(e) => handleTimestampClick(item.start_timestamp, e)}
                        className={`text-xs w-16 flex-shrink-0 font-mono mt-0.5 transition-colors hover:underline cursor-pointer ${
                          isHighlighted
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                        title="Click to jump to this time in the video"
                      >
                        {syncConfig?.transcriptStartTime && syncConfig?.videoStartTime
                          ? secondsToTimestamp(getAdjustedVideoTime(item.start_timestamp))
                          : formatTimestamp(item.start_timestamp)
                        }
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight">
                            {item.title}
                          </h4>
                          {item.decision === true && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                              decision
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expand/Collapse Icon */}
                    <svg
                      className={`w-4 h-4 transition-all duration-200 flex-shrink-0 text-slate-500 dark:text-slate-400 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 transition-opacity duration-300 ease-out opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]">
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.summary}
                      </p>
                      {item.action_items && item.action_items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                            Actions
                          </h5>
                          <div className="space-y-3">
                            {item.action_items.map((step, stepIndex) => (
                              <div key={stepIndex} className="text-sm">
                                <div className="flex items-start gap-2">
                                  {step.timestamp && (
                                    <button
                                      onClick={(e) => handleTimestampClick(step.timestamp!, e)}
                                      className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex-shrink-0 mt-0.5"
                                      title="Click to jump to this time in the video"
                                    >
                                      {syncConfig?.transcriptStartTime && syncConfig?.videoStartTime
                                        ? secondsToTimestamp(getAdjustedVideoTime(step.timestamp))
                                        : formatTimestamp(step.timestamp)
                                      }
                                    </button>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    {step.who ? (
                                      <>
                                        <div className="font-medium text-slate-600 dark:text-slate-400 mb-1">
                                          {step.who}
                                        </div>
                                        <div className="text-slate-500 dark:text-slate-500 leading-snug">
                                          {step.what}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-slate-500 dark:text-slate-500 leading-snug">
                                        {step.what}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Action Items - Takes up 1/3 of the width */}
      <div className="lg:col-span-1">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
          Action Items ({allItems.reduce((sum, item) => sum + (item.action_items?.length || 0), 0)})
        </h3>
        <div className="space-y-3">
          {allItems.map((item, itemIndex) => {
            if (!item.action_items || item.action_items.length === 0) return null;

            return item.action_items.map((step, stepIndex) => (
              <div key={`${itemIndex}-${stepIndex}`} className="bg-green-50/30 dark:bg-green-950/10 border border-green-200 dark:border-green-800/30 rounded-lg p-3">
                <div className="space-y-2">
                  {/* Header with number and timestamp */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-200 dark:bg-green-800/50 text-green-800 dark:text-green-200 text-xs font-semibold">
                      {allItems.slice(0, itemIndex).reduce((sum, prevItem) => sum + (prevItem.action_items?.length || 0), 0) + stepIndex + 1}
                    </span>
                    {step.timestamp && (
                      <button
                        onClick={(e) => handleTimestampClick(step.timestamp!, e)}
                        className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        title="Click to jump to this time in the video"
                      >
                        {syncConfig?.transcriptStartTime && syncConfig?.videoStartTime
                          ? secondsToTimestamp(getAdjustedVideoTime(step.timestamp))
                          : formatTimestamp(step.timestamp)
                        }
                      </button>
                    )}
                  </div>

                  {/* Action content */}
                  <div className="space-y-1">
                    {step.who && (
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {step.who}
                      </div>
                    )}
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                      {step.what}
                    </p>
                  </div>

                  {/* Source context */}
                  <div className="pt-1 border-t border-green-200/50 dark:border-green-800/30">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      From: <span className="font-medium">{item.title}</span>
                    </p>
                  </div>
                </div>
              </div>
            ));
          })}
        </div>
      </div>

      {/* Show message if no content */}
      {!data.executive_summary && allItems.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400 text-sm">No agenda data available</p>
        </div>
      )}
    </div>
  );
};

export default AgendaSummary;