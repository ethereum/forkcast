import React from 'react';
import { Tooltip } from './Tooltip';
import { getComplexityTierColor, getComplexityTierEmoji } from '../../domain/complexity/complexity';
import { CHECKLIST_REVISIONS } from '../../domain/complexity/types';
import type { EipComplexity } from '../../domain/complexity/types';

interface ComplexityScoreBadgeProps {
  complexity: EipComplexity;
  className?: string;
}

function pendingAssessmentLabel(complexity: EipComplexity): string | null {
  const pr = complexity.pullRequest;
  if (!pr) return null;
  return `Proposed score from ${pr.isDraft ? 'draft ' : ''}pull request #${pr.number}, still open in the STEEL repository. It has not been reviewed or merged and may change.`;
}

function revisionLabel(complexity: EipComplexity): string {
  const { anchorCount, mediumFrom, highFrom } = CHECKLIST_REVISIONS[complexity.checklistRevision];
  const bands = `Scored against STEEL checklist revision ${complexity.checklistRevision}: ${anchorCount} anchors, tiers Low <${mediumFrom}, Medium ${mediumFrom}–${highFrom - 1}, High ≥${highFrom}. Scores are not comparable across revisions, but tiers are.`;

  if (!complexity.statedTier) return bands;
  return `${bands} The assessment file marks this ${getComplexityTierEmoji(
    complexity.statedTier
  )} ${complexity.statedTier}, which its own score does not fall in; the tier shown here is computed from the score.`;
}

/**
 * Tier-coloured score badge, tagged with the checklist revision it was scored against.
 * An assessment that is still an open pull request is dimmed and outlined.
 */
export const ComplexityScoreBadge: React.FC<ComplexityScoreBadgeProps> = ({
  complexity,
  className = '',
}) => {
  const pendingLabel = pendingAssessmentLabel(complexity);

  const score = (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${getComplexityTierColor(
        complexity.tier
      )} ${
        pendingLabel ? 'opacity-60 outline outline-1 outline-dashed outline-current cursor-help' : ''
      }`}
    >
      {getComplexityTierEmoji(complexity.tier)} {complexity.totalScore}
    </span>
  );

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {pendingLabel ? <Tooltip text={pendingLabel}>{score}</Tooltip> : score}
      <Tooltip text={revisionLabel(complexity)}>
        <span className="px-1 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 cursor-help tabular-nums">
          v{complexity.checklistRevision}
        </span>
      </Tooltip>
    </span>
  );
};
