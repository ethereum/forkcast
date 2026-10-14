import React from 'react';
import { KeyDecision } from '../../types/eip';
import { PRE_RECORDING_LABEL } from '../../utils/timestamp';
import { eipById } from '../../data/eips';
import { StructuredDecisionContent, DecisionTextWithEipLinks } from './KeyDecisionContent';

interface SyncConfig {
  transcriptStartTime: string | null;
  videoStartTime: string | null;
  description?: string;
}

interface KeyDecisionsSectionProps {
  decisions: KeyDecision[];
  onTimestampClick?: (timestamp: string) => void;
  syncConfig?: SyncConfig;
  currentVideoTime?: number;
  selectedSearchResult?: { timestamp: string; text: string; type: string } | null;
}

const KeyDecisionsSection: React.FC<KeyDecisionsSectionProps> = ({
  decisions,
  onTimestampClick,
  syncConfig,
  selectedSearchResult,
}) => {
  const timestampToSeconds = (timestamp: string | null | undefined): number => {
    if (!timestamp) return 0;
    const parts = timestamp.split(':');
    if (parts.length !== 3) return 0;
    const [hours, minutes, seconds] = parts.map(p => parseFloat(p));
    return hours * 3600 + minutes * 60 + seconds;
  };

  const getDisplayTimestamp = (timestamp: string): string => {
    if (syncConfig?.transcriptStartTime && syncConfig?.videoStartTime) {
      const transcriptSeconds = timestampToSeconds(timestamp);
      const offset = timestampToSeconds(syncConfig.transcriptStartTime) -
                     timestampToSeconds(syncConfig.videoStartTime);
      const adjustedSeconds = transcriptSeconds - offset;
      if (adjustedSeconds < 0) return PRE_RECORDING_LABEL;
      const hours = Math.floor(adjustedSeconds / 3600);
      const minutes = Math.floor((adjustedSeconds % 3600) / 60);
      const seconds = Math.floor(adjustedSeconds % 60);
      const formattedSeconds = seconds.toString().padStart(2, '0');
      if (hours === 0) {
        return `00:${minutes}:${formattedSeconds}`;
      }
      return `${hours}:${minutes}:${formattedSeconds}`;
    }
    return timestamp;
  };

  const handleTimestampClick = (timestamp: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onTimestampClick) {
      onTimestampClick(timestamp);
    }
  };

  return (
    <ul className="space-y-2 list-none ml-0">
      {decisions.map((decision, index) => {
        const isSelected = selectedSearchResult?.timestamp === decision.timestamp &&
                           selectedSearchResult?.type === 'decision';
        const isStructured = decision.type !== 'other';

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
              {isStructured
                ? <StructuredDecisionContent decision={decision} eipMap={eipById} />
                : <DecisionTextWithEipLinks decision={decision} eipMap={eipById} />
              }
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {getDisplayTimestamp(decision.timestamp)}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default KeyDecisionsSection;
