import React from 'react';
import { EIP } from '../../types';
import {
  getInclusionStage,
} from '../../utils';
import { ActivationDetails } from '../../data/upgrades';
import { CopyLinkButton } from '../ui/CopyLinkButton';

interface OverviewSectionProps {
  eips: EIP[];
  forkName: string;
  status: string;
  activationDate?: string;
  onStageClick: (stageId: string) => void;
  activationDetails?: ActivationDetails;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  eips,
  forkName,
  status,
  activationDate,
  onStageClick,
  activationDetails,
}) => {
  // For Live upgrades, only show Included (declined is replaced by activation details)
  const stageStats = status === 'Live'
    ? [
        {
          stage: 'Included',
          count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Included').length,
          color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
        }
      ]
    : [
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

      {/* Headliner selection notice for Hegota */}
      {forkName.toLowerCase() === 'hegota' && (
        <div className="p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm mb-1">Headliner Selection Complete</h4>
              <p className="text-blue-800 dark:text-blue-200 text-xs leading-relaxed">
                Headliner selection process has concluded with{' '}
                <a href="#eip-7805" className="text-blue-600 dark:text-blue-300 underline decoration-1 underline-offset-2 hover:text-blue-800 dark:hover:text-blue-100">FOCIL (EIP-7805)</a>
                {' '}being SFI'd as a headliner and{' '}
                <a href="#eip-8141" className="text-blue-600 dark:text-blue-300 underline decoration-1 underline-offset-2 hover:text-blue-800 dark:hover:text-blue-100">Frame Transaction (EIP-8141)</a>
                {' '}being CFI'd. The window for non-headliner EIP proposals opens April 9th (deadline TBD). Follow updates on the{' '}
                <a
                  href="https://ethereum-magicians.org/t/eip-8081-hegota-network-upgrade-meta-thread/26876"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-300 underline decoration-1 underline-offset-2 hover:text-blue-800 dark:hover:text-blue-100"
                >
                  Ethereum Magicians meta thread
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scoping notice for Glamsterdam */}
      {forkName.toLowerCase() === 'glamsterdam' && (
        <div className="p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-blue-800 dark:text-blue-200 text-xs leading-relaxed">
              Candidate EIPs are being fine-tuned, implemented, and tested on closed devnets. This process will determine which EIPs get Scheduled for Inclusion.
            </p>
          </div>
        </div>
      )}

      {/* Stage counts grid */}
      <div className={status === 'Live' ? 'grid grid-cols-1 md:grid-cols-3 gap-4' : 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4'}>
          {/* Live status info box - only for Live upgrades */}
          {status === 'Live' && (
            <div className="flex flex-col items-center justify-center p-4 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs font-medium text-emerald-800 dark:text-emerald-200 text-center">
                Live on Mainnet
              </div>
              {activationDate && (
                <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  {activationDate}
                </div>
              )}
            </div>
          )}
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
                <div className="font-light text-slate-900 dark:text-slate-100 mb-1 text-2xl">{count}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">EIP{count !== 1 ? 's' : ''}</div>
                <div className={`text-xs font-medium px-2 py-1 rounded inline-block ${color}`}>
                  {stage}
                </div>
              </button>
            );
          })}
          {/* Activation details for Live upgrades */}
          {status === 'Live' && activationDetails && (
            <a
              href={`https://ethereum.org/ethereum-forks/#${forkName.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 hover:shadow-sm cursor-pointer transition-all duration-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Block</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{activationDetails.blockNumber.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Epoch</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{activationDetails.epochNumber.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Slot</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{activationDetails.slotNumber.toLocaleString()}</span>
              </div>
            </a>
          )}
        </div>
    </div>
  );
};