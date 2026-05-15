import React, { useEffect, useRef } from 'react';
import { KeyDecision } from '../../types/eip';
import KeyDecisionsSection from './KeyDecisionsSection';

interface HighlightItem {
  timestamp: string;
  highlight: string;
}

interface ActionItem {
  timestamp: string;
  action: string;
  owner: string;
}

interface Decision {
  timestamp: string;
  decision: string;
}

interface Target {
  timestamp: string;
  target: string;
}

interface TldrData {
  meeting: string;
  highlights: {
    [category: string]: HighlightItem[];
  };
  action_items: ActionItem[];
  decisions: Decision[];
  targets: Target[];
}

interface SyncConfig {
  transcriptStartTime: string | null;
  videoStartTime: string | null;
  description?: string;
}

interface TldrSummaryProps {
  data: TldrData;
  keyDecisions?: KeyDecision[];
  onTimestampClick?: (timestamp: string) => void;
  syncConfig?: SyncConfig;
  currentVideoTime?: number;
  selectedSearchResult?: {timestamp: string, text: string, type: string} | null;
}

const TldrSummary: React.FC<TldrSummaryProps> = ({
  data,
  keyDecisions,
  onTimestampClick,
  syncConfig,
  currentVideoTime = 0,
  selectedSearchResult
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const formatTimestamp = (timestamp: string): string => {
    const [hours, minutes, seconds] = timestamp.split(':');
    const h = parseInt(hours);
    const m = parseInt(minutes);
    if (h === 0) {
      return `00:${m}:${seconds}`;
    }
    return `${h}:${m}:${seconds}`;
  };

  const timestampToSeconds = (timestamp: string | null | undefined): number => {
    if (!timestamp) return 0;
    const parts = timestamp.split(':');
    if (parts.length !== 3) return 0;
    const [hours, minutes, seconds] = parts.map(p => parseFloat(p));
    return hours * 3600 + minutes * 60 + seconds;
  };

  const getDisplayTimestamp = (timestamp: string): string => {
    if (syncConfig?.transcriptStartTime && syncConfig?.videoStartTime) {
      const adjustedSeconds = getAdjustedVideoTime(timestamp);
      const hours = Math.floor(adjustedSeconds / 3600);
      const minutes = Math.floor((adjustedSeconds % 3600) / 60);
      const seconds = Math.floor(adjustedSeconds % 60);
      const formattedSeconds = seconds.toString().padStart(2, '0');
      if (hours === 0) {
        return `00:${minutes}:${formattedSeconds}`;
      }
      return `${hours}:${minutes}:${formattedSeconds}`;
    }
    return formatTimestamp(timestamp);
  };


  const handleTimestampClick = (timestamp: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onTimestampClick) {
      onTimestampClick(timestamp);
    }
  };

  const formatCategoryName = (category: string): string => {
    return category.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getAdjustedVideoTime = (transcriptTimestamp: string): number => {
    const transcriptSeconds = timestampToSeconds(formatTimestamp(transcriptTimestamp));
    if (syncConfig?.transcriptStartTime && syncConfig?.videoStartTime) {
      const transcriptStartSeconds = timestampToSeconds(syncConfig.transcriptStartTime);
      const videoStartSeconds = timestampToSeconds(syncConfig.videoStartTime);
      const offset = transcriptStartSeconds - videoStartSeconds;
      return transcriptSeconds - offset;
    }
    return transcriptSeconds;
  };

  const isCurrentHighlight = (timestamp: string, allHighlights: HighlightItem[]): boolean => {
    if (!currentVideoTime || !syncConfig?.transcriptStartTime || !syncConfig?.videoStartTime) return false;
    const itemVideoTime = getAdjustedVideoTime(timestamp);
    const itemIndex = allHighlights.findIndex(h => h.timestamp === timestamp);
    const nextItem = itemIndex < allHighlights.length - 1 ? allHighlights[itemIndex + 1] : null;
    const nextItemVideoTime = nextItem ? getAdjustedVideoTime(nextItem.timestamp) : Infinity;
    return currentVideoTime >= itemVideoTime && currentVideoTime < nextItemVideoTime;
  };

  const allHighlights: HighlightItem[] = Object.values(data.highlights)
    .flat()
    .sort((a, b) => timestampToSeconds(a.timestamp) - timestampToSeconds(b.timestamp));

  useEffect(() => {
    if (!selectedSearchResult) return;
    if (selectedSearchResult.type === 'agenda') {
      setTimeout(() => {
        if (containerRef.current) {
          const selectedElement = containerRef.current.querySelector(
            `[data-highlight-timestamp="${selectedSearchResult.timestamp}"]`
          ) as HTMLElement;
          if (selectedElement) {
            selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    }
  }, [selectedSearchResult]);

  return (
    <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Highlights */}
      <div>
        <div className="space-y-4">
          {Object.entries(data.highlights).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide mb-2">
                {formatCategoryName(category)}
              </h3>
              <ul className="space-y-1 list-disc list-outside ml-5 text-slate-600 dark:text-slate-400">
                {items.map((item, index) => {
                  const isHighlighted = isCurrentHighlight(item.timestamp, allHighlights);
                  const isSelected = selectedSearchResult?.timestamp === item.timestamp &&
                                   selectedSearchResult?.type === 'agenda';
                  return (
                    <li
                      key={index}
                      data-highlight-timestamp={item.timestamp}
                      onClick={(e) => handleTimestampClick(item.timestamp, e)}
                      className="text-sm cursor-pointer group text-slate-600 dark:text-slate-400"
                    >
                      <span className={`rounded px-1 py-0.5 transition-colors inline ${
                        isSelected
                          ? 'bg-yellow-50 dark:bg-yellow-900/50 text-slate-900 dark:text-slate-100'
                          : isHighlighted
                          ? 'bg-blue-50 dark:bg-blue-900/50 text-slate-900 dark:text-slate-100'
                          : 'hover:text-slate-900 dark:hover:text-slate-100'
                      }`}>
                        {item.highlight}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {getDisplayTimestamp(item.timestamp)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Decisions, Actions, Commitments */}
      <div>
        <div className="space-y-6">
        {/* Decisions Made */}
        {data.decisions && data.decisions.length > 0 && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-4">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide mb-2">
              Decisions
            </h3>
            {keyDecisions && keyDecisions.length > 0 ? (
              <KeyDecisionsSection
                decisions={keyDecisions}
                onTimestampClick={onTimestampClick}
                syncConfig={syncConfig}
                currentVideoTime={currentVideoTime}
                selectedSearchResult={selectedSearchResult}
              />
            ) : (
              <ul className="space-y-1 list-none ml-0">
                {data.decisions.map((decision, index) => {
                  const isSelected = selectedSearchResult?.timestamp === decision.timestamp &&
                                   selectedSearchResult?.type === 'decision';
                  return (
                    <li
                      key={index}
                      onClick={(e) => handleTimestampClick(decision.timestamp, e)}
                      className="text-sm cursor-pointer group before:content-['→'] before:mr-2 before:text-slate-400 dark:before:text-slate-500 text-slate-600 dark:text-slate-400"
                    >
                      <span className={`rounded px-1 py-0.5 transition-colors inline ${
                        isSelected
                          ? 'bg-yellow-50 dark:bg-yellow-900/50 text-slate-900 dark:text-slate-100'
                          : 'hover:text-slate-900 dark:hover:text-slate-100'
                      }`}>
                        {decision.decision}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {getDisplayTimestamp(decision.timestamp)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Action Items */}
        {data.action_items && data.action_items.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide mb-2">
              Action Items
            </h3>
            <ul className="space-y-1 list-none ml-0">
              {data.action_items.map((item, index) => {
                const isSelected = selectedSearchResult?.timestamp === item.timestamp &&
                                 selectedSearchResult?.type === 'action';
                return (
                  <li
                    key={index}
                    onClick={(e) => handleTimestampClick(item.timestamp, e)}
                    className="text-sm cursor-pointer group before:content-['→'] before:mr-2 before:text-slate-400 dark:before:text-slate-500 text-slate-600 dark:text-slate-400"
                  >
                    <span className={`rounded px-1 py-0.5 transition-colors inline ${
                      isSelected
                        ? 'bg-yellow-50 dark:bg-yellow-900/50 text-slate-900 dark:text-slate-100'
                        : 'hover:text-slate-900 dark:hover:text-slate-100'
                    }`}>
                      <span className="font-normal">{item.owner}:</span> {item.action}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {getDisplayTimestamp(item.timestamp)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Notable Commitments */}
        {data.targets && data.targets.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide mb-2">
              Targets
            </h3>
            <ul className="space-y-1 list-none ml-0">
              {data.targets.map((target, index) => {
                const isSelected = selectedSearchResult?.timestamp === target.timestamp &&
                                 selectedSearchResult?.type === 'target';
                return (
                  <li
                    key={index}
                    onClick={(e) => handleTimestampClick(target.timestamp, e)}
                    className="text-sm cursor-pointer group before:content-['→'] before:mr-2 before:text-slate-400 dark:before:text-slate-500 text-slate-600 dark:text-slate-400"
                  >
                    <span className={`rounded px-1 py-0.5 transition-colors inline ${
                      isSelected
                        ? 'bg-yellow-50 dark:bg-yellow-900/50 text-slate-900 dark:text-slate-100'
                        : 'hover:text-slate-900 dark:hover:text-slate-100'
                    }`}>
                      {target.target}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {getDisplayTimestamp(target.timestamp)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default TldrSummary;
