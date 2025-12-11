import React from 'react';
import { EIP } from '../../types';
import { getInclusionStage } from '../../utils';
import { CopyLinkButton } from '../ui/CopyLinkButton';

interface CompletedOverviewSectionProps {
  eips: EIP[];
  forkName: string;
  activationDate: string;
  activationEpoch?: number;
  onStageClick: (stageId: string) => void;
}

export const CompletedOverviewSection: React.FC<CompletedOverviewSectionProps> = ({
  eips,
  forkName,
  activationDate,
  activationEpoch,
  onStageClick,
}) => {
  const includedCount = eips.filter(
    (eip) => getInclusionStage(eip, forkName) === 'Included'
  ).length;

  return (
    <div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-6"
      id="overview"
      data-section
    >
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Upgrade Overview
        </h2>
        <div className="flex items-center relative top-0.5">
          <CopyLinkButton
            sectionId="overview"
            title="Copy link to overview"
            size="sm"
          />
        </div>
      </div>

      {/* Activation Banner */}
      <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="font-medium text-emerald-900 dark:text-emerald-100 text-sm mb-1">
              {forkName} is live on mainnet!
            </h4>
            <p className="text-emerald-800 dark:text-emerald-200 text-xs leading-relaxed">
              The {forkName} upgrade activated on mainnet on {activationDate}
              {activationEpoch && `, at epoch ${activationEpoch.toLocaleString()}`}.
              All EIPs listed below are now active on Ethereum.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-center">
        <button
          onClick={() => onStageClick('included')}
          className="text-center p-6 rounded transition-all duration-200 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 hover:shadow-sm cursor-pointer min-w-[200px]"
        >
          <div className="text-3xl font-light text-slate-900 dark:text-slate-100 mb-1">
            {includedCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            EIP{includedCount !== 1 ? 's' : ''}
          </div>
          <div className="text-xs font-medium px-3 py-1.5 rounded inline-block bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            Included
          </div>
        </button>
      </div>
    </div>
  );
};


