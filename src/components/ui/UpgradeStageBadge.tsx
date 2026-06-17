import React from 'react';
import { InclusionStage } from '../../types/eip';
import { getStageAbbreviation } from '../../utils';
import { getInclusionStageColor } from '../../utils/colors';

interface UpgradeStageBadgeProps {
  forkName: string;
  stage: string;
}

export const UpgradeStageBadge: React.FC<UpgradeStageBadgeProps> = ({ forkName, stage }) => (
  <span className="inline-flex items-center text-xs font-medium rounded overflow-hidden ring-1 ring-slate-200 dark:ring-slate-500">
    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300">
      {forkName}
    </span>
    <span className={`px-2 py-0.5 ${getInclusionStageColor(stage as InclusionStage)}`}>
      {getStageAbbreviation(stage)}
    </span>
  </span>
);
