import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { KeyDecision, EIP } from '../../types/eip';
import { getKeyDecisionTagColor } from '../../utils/colors';
import { eipsData } from '../../data/eips';

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

/** Short label for the colored tag */
const getTagLabel = (decision: KeyDecision): string => {
  if (decision.type === 'headliner_selected') {
    return 'Headliner';
  }
  if (decision.type === 'devnet_inclusion') {
    return decision.devnet || 'devnet';
  }
  if (decision.type === 'stage_change' && decision.stage_change) {
    switch (decision.stage_change.to) {
      case 'Considered': return 'CFI';
      case 'Scheduled': return 'SFI';
      case 'Declined': return 'DFI';
      case 'Included': return 'Included';
      case 'Withdrawn': return 'Withdrawn';
      default: return decision.stage_change.to;
    }
  }
  return '';
};

const cleanAuthorName = (author: string): string => {
  return author
    .replace(/\s*\([^)]*\)/g, '')  // Remove parentheticals like (@handle)
    .replace(/<[^>]+>/g, '')        // Remove email addresses
    .replace(/,\s*,/g, ',')        // Collapse double commas
    .replace(/,\s*$/, '')          // Remove trailing comma
    .trim();
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
};

/** EIP link with hover tooltip matching the Rank page pattern */
const EipLinkWithTooltip: React.FC<{
  eipId: number;
  eipMap: Map<number, EIP>;
}> = ({ eipId, eipMap }) => {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const eip = eipMap.get(eipId);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!eip) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 360;
    const tooltipHeight = 200;
    const padding = 10;

    let x = rect.right + padding;
    let y = rect.top;

    if (x + tooltipWidth > window.innerWidth - padding) {
      x = rect.left - tooltipWidth - padding;
    }
    if (x < padding) {
      x = (window.innerWidth - tooltipWidth) / 2;
    }
    if (y + tooltipHeight > window.innerHeight - padding) {
      y = Math.max(padding, window.innerHeight - tooltipHeight - padding);
    }

    setTooltipPos({ x, y });
  };

  const handleMouseLeave = () => {
    setTooltipPos(null);
  };

  const description = eip?.laymanDescription || eip?.description || '';

  return (
    <>
      <Link
        to={`/eips/${eipId}`}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        style={{ borderBottom: '1px dotted currentColor' }}
      >
        EIP-{eipId}
      </Link>
      {tooltipPos && eip && (
        <div
          className="fixed z-50"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            maxWidth: '360px',
            width: 'auto',
          }}
        >
          <div className="bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-600 rounded-lg shadow-2xl p-4">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">
                EIP-{eipId}
              </span>
              {eip.layer && (
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                  eip.layer === 'EL'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                    : 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300'
                }`}>
                  {eip.layer}
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {eip.title.replace(/^EIP-\d+:\s*/, '')}
            </h4>
            {description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                {truncateText(description, 250)}
              </p>
            )}
            {eip.author && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium">Author:</span> {cleanAuthorName(eip.author)}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Build the decision as a readable sentence with inline colored tag.
 *
 * Examples:
 *   → EIP-7975, EIP-8159 [CFI] in Glamsterdam
 *   → EIP-7872 [DFI]
 *   → EIP-7975 added to [DevNet-3] for Glamsterdam
 */
const StructuredDecisionContent: React.FC<{
  decision: KeyDecision;
  eipMap: Map<number, EIP>;
}> = ({ decision, eipMap }) => {
  const tagColor = getKeyDecisionTagColor(decision);
  const tagLabel = getTagLabel(decision);

  // Fallback: no EIPs resolved, show original text
  if (decision.eips.length === 0) {
    return <>{decision.original_text}</>;
  }

  const eipLinks = decision.eips.map((eipId, i) => (
    <React.Fragment key={eipId}>
      {i > 0 && ', '}
      <EipLinkWithTooltip eipId={eipId} eipMap={eipMap} />
    </React.Fragment>
  ));

  const contextSuffix = decision.context
    ? <span className="text-slate-500 dark:text-slate-400">{'; '}{decision.context}</span>
    : null;

  if (decision.type === 'headliner_selected') {
    return (
      <>
        {eipLinks}
        {' selected as '}
        <span className={`inline-flex items-center px-1.5 rounded text-xs font-medium ${tagColor}`}>
          {tagLabel}
        </span>
        {decision.fork && (
          <>
            {'; moved to '}
            <span className="inline-flex items-center px-1.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              SFI
            </span>
            {' for '}{decision.fork}
          </>
        )}
        {contextSuffix}
      </>
    );
  }

  if (decision.type === 'devnet_inclusion') {
    return (
      <>
        {eipLinks}
        {' included in '}
        <span className={`inline-flex items-center px-1.5 rounded text-xs font-medium ${tagColor}`}>
          {tagLabel}
        </span>
        {contextSuffix}
      </>
    );
  }

  // stage_change
  return (
    <>
      {eipLinks}
      {' moved to '}
      <span className={`inline-flex items-center px-1.5 rounded text-xs font-medium ${tagColor}`}>
        {tagLabel}
      </span>
      {decision.fork && <>{' for '}{decision.fork}</>}
      {contextSuffix}
    </>
  );
};

const KeyDecisionsSection: React.FC<KeyDecisionsSectionProps> = ({
  decisions,
  onTimestampClick,
  syncConfig,
  selectedSearchResult,
}) => {
  // Build EIP lookup map once
  const eipMap = useMemo(() => {
    const map = new Map<number, EIP>();
    for (const eip of eipsData) {
      map.set(eip.id, eip);
    }
    return map;
  }, []);

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
                ? <StructuredDecisionContent decision={decision} eipMap={eipMap} />
                : decision.original_text
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
