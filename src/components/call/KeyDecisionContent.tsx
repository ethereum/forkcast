import React, { useState } from 'react';
import { Link } from '../navigation';
import { KeyDecision, EIP } from '../../types/eip';
import { getKeyDecisionTagColor } from '../../utils/colors';

// Key-decision renderers, kept free of the EIP dataset so pages that only show a
// few decisions can pass in just the EIPs they mention.

/** The EIP fields the link tooltip reads. */
export type EipPreview = Pick<EIP, 'id' | 'title' | 'layer' | 'laymanDescription' | 'description' | 'author'>;

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
export const EipLinkWithTooltip: React.FC<{
  eipId: number;
  eipMap: Map<number, EipPreview>;
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
 * Render decision text with EIP references replaced by hoverable links.
 *
 * Uses decision.eips as the source of truth. For each known EIP, replaces
 * "EIP-XXXX" or bare "XXXX" occurrences in the text with a linked preview.
 * Any EIPs in the array that don't appear in the text at all are appended
 * as links after the text.
 */
export const DecisionTextWithEipLinks: React.FC<{
  decision: KeyDecision;
  eipMap: Map<number, EipPreview>;
}> = ({ decision, eipMap }) => {
  const { original_text: text, eips } = decision;

  if (eips.length === 0) return <>{text}</>;

  // Build a regex that matches "EIP-XXXX" or bare "XXXX" for each known EIP id
  const eipSet = new Set(eips);
  const idPattern = eips.map(id => `EIP-${id}\\b|\\b${id}\\b`).join('|');
  const regex = new RegExp(`(${idPattern})`, 'g');

  const linkedIds = new Set<number>();
  const parts = text.split(regex);

  const rendered = parts.map((part, i) => {
    // Check if this part matches any known EIP
    const bareMatch = part.match(/^(?:EIP-)?(\d+)$/);
    if (bareMatch) {
      const id = Number(bareMatch[1]);
      if (eipSet.has(id)) {
        linkedIds.add(id);
        return <EipLinkWithTooltip key={i} eipId={id} eipMap={eipMap} />;
      }
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });

  // Append links for any EIPs not found in the text
  const unlinked = eips.filter(id => !linkedIds.has(id));
  if (unlinked.length === 0) return <>{rendered}</>;

  return (
    <>
      {rendered}
      {' ('}
      {unlinked.map((id, i) => (
        <React.Fragment key={id}>
          {i > 0 && ', '}
          <EipLinkWithTooltip eipId={id} eipMap={eipMap} />
        </React.Fragment>
      ))}
      {')'}
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
export const StructuredDecisionContent: React.FC<{
  decision: KeyDecision;
  eipMap: Map<number, EipPreview>;
}> = ({ decision, eipMap }) => {
  const tagColor = getKeyDecisionTagColor(decision);
  const tagLabel = getTagLabel(decision);

  // For 'other' type or no EIPs, render original_text with inline EIP links
  if (decision.type === 'other' || decision.eips.length === 0) {
    return <DecisionTextWithEipLinks decision={decision} eipMap={eipMap} />;
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
