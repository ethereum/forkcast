import React from 'react';

interface NextStep {
  what: string;
  who?: string;
}

interface AgendaItem {
  start_timestamp: string;
  title: string;
  summary: string;
  decision: boolean | null;
  action_items?: NextStep[];
  refs?: string[];
  subsection?: string; // Optional subsection grouping
}

interface AgendaSection {
  section: string;
  items: AgendaItem[];
}

interface AgendaData {
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
  const handleTimestampClick = (timestamp: string) => {
    if (onTimestampClick) {
      onTimestampClick(timestamp);
    }
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
    <div className="space-y-4">

      {/* Agenda Sections */}
      <div className="space-y-4">
        {data.agenda.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-2">
            {/* Section Header */}
            <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {section.section}
              </h2>
            </div>

            {/* Section Items */}
            <div className="space-y-0">
              {section.items.map((item, itemIndex) => {
                // Group items by subsection if they exist
                const currentSubsection = item.subsection;
                const prevItem = itemIndex > 0 ? section.items[itemIndex - 1] : null;
                const showSubsectionHeader = currentSubsection && currentSubsection !== prevItem?.subsection;

                // Find global index for highlighting logic
                const globalIndex = allItems.findIndex(globalItem =>
                  globalItem.start_timestamp === item.start_timestamp &&
                  globalItem.title === item.title
                );
                const isHighlighted = isCurrentItem(item.start_timestamp, globalIndex);

                return (
                  <div key={itemIndex}>
                    {/* Subsection Header */}
                    {showSubsectionHeader && (
                      <div className="mb-2 ml-3">
                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full inline-block">
                          {currentSubsection}
                        </h3>
                      </div>
                    )}

                    {/* Item Content - Two Column Layout */}
                    <div className={`${showSubsectionHeader ? 'ml-6' : ''}`}>
                      <div
                        className={`flex items-start gap-4 py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-all duration-200 group cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 ${
                          isHighlighted
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500 rounded-r-md'
                            : item.decision === true
                            ? 'border-l-4 border-green-500 bg-green-50/30 dark:bg-green-900/10 shadow-sm'
                            : 'bg-white dark:bg-slate-800/50 shadow-sm'
                        }`}
                        onClick={() => onTimestampClick && handleTimestampClick(item.start_timestamp)}
                        title={onTimestampClick ? "Click to jump to this time in the video" : undefined}
                      >
                        {/* Left Column - Main Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            {/* Timestamp */}
                            <span className={`text-xs w-16 flex-shrink-0 font-mono mt-0.5 transition-colors ${
                              isHighlighted
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                            }`}>
                              {syncConfig?.transcriptStartTime && syncConfig?.videoStartTime
                                ? secondsToTimestamp(getAdjustedVideoTime(item.start_timestamp))
                                : formatTimestamp(item.start_timestamp)
                              }
                            </span>

                            {/* Main content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium text-slate-900 dark:text-slate-100 text-base leading-tight">
                                  {item.title}
                                </h3>
                                {item.decision === true && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-sm font-medium border text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                    decision
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                                {item.summary}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Right Column - Action Items (Always Present) */}
                        <div className="w-72 flex-shrink-0">
                          {item.action_items && item.action_items.length > 0 ? (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                Actions
                              </h4>
                              <div className="space-y-2">
                                {item.action_items.map((step, stepIndex) => (
                                  <div key={stepIndex} className="text-sm">
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
                                        • {step.what}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                                No actions
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgendaSummary;