import React from 'react';
import { EIP } from '../../types';
import {
  getInclusionStage,
} from '../../utils';
import { CopyLinkButton } from '../ui/CopyLinkButton';

interface OverviewSectionProps {
  eips: EIP[];
  forkName: string;
  onStageClick: (stageId: string) => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  eips,
  forkName,
  onStageClick,
}) => {
  const stageStats = [
    {
      stage: 'Proposed for Inclusion',
      count: eips.filter(eip => {
        return getInclusionStage(eip, forkName) === 'Proposed for Inclusion';
      }).length,
      color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
    },
    {
      stage: 'Considered for Inclusion',
      count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Considered for Inclusion').length,
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
    },
    {
      stage: 'Scheduled for Inclusion',
      count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Scheduled for Inclusion').length,
      color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
    },
    {
      stage: 'Declined for Inclusion',
      count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Declined for Inclusion').length,
      color: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    }
  ];


  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-6" id="overview" data-section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Upgrade Overview</h2>
        <div className="flex items-center relative top-0.5">
          <CopyLinkButton
            sectionId="overview"
            title="Copy link to overview"
            size="sm"
          />
        </div>
      </div>

      {/* Special note for Glamsterdam's competitive headliner process */}
      {forkName.toLowerCase() === 'glamsterdam' && (
        <>
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-emerald-900 dark:text-emerald-100 text-sm mb-1">Headliner Selection Complete</h4>
                <p className="text-emerald-800 dark:text-emerald-200 text-xs leading-relaxed">
                  The Glamsterdam headliner selection process has concluded. <strong><button
                    onClick={() => onStageClick('eip-7732')}
                    className="bg-transparent border-none p-0 m-0 font-inherit text-emerald-900 dark:text-emerald-100 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-1 underline-offset-2 transition-colors cursor-pointer"
                  >EIP-7732 (ePBS)</button></strong> and <strong><button
                    onClick={() => onStageClick('eip-7928')}
                    className="bg-transparent border-none p-0 m-0 font-inherit text-emerald-900 dark:text-emerald-100 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-1 underline-offset-2 transition-colors cursor-pointer"
                  >EIP-7928 (Block-level Access Lists)</button></strong> moved to <strong>Scheduled </strong> status. <strong><button
                    onClick={() => onStageClick('eip-7805')}
                    className="bg-transparent border-none p-0 m-0 font-inherit text-emerald-900 dark:text-emerald-100 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-1 underline-offset-2 transition-colors cursor-pointer"
                  >EIP-7805 (FOCIL)</button></strong> has also moved to <strong>Considered</strong> status. Smaller, non-headliner EIPs are now being proposed and discussed.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stageStats.map(({ stage, count, color }) => {
          const stageId = stage.toLowerCase().replace(/\s+/g, '-');
          const hasEips = count > 0;

          return (
            <button
              key={stage}
              onClick={() => hasEips && onStageClick(stageId)}
              disabled={!hasEips}
              className={`text-center p-4 rounded transition-all duration-200 ${
                hasEips
                  ? 'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 hover:shadow-sm cursor-pointer'
                  : 'bg-slate-50 dark:bg-slate-700 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="text-2xl font-light text-slate-900 dark:text-slate-100 mb-1">{count}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">EIP{count !== 1 ? 's' : ''}</div>
              <div className={`text-xs font-medium px-2 py-1 rounded inline-block ${color}`}>
                {stage}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};