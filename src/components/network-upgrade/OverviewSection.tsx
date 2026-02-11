import React from 'react';
import { EIP, ClientTeamPerspective } from '../../types';
import {
  getInclusionStage,
} from '../../utils';
import { ActivationDetails } from '../../data/upgrades';
import { CopyLinkButton } from '../ui/CopyLinkButton';
import { ClientPerspectives } from './ClientPerspectives';

interface OverviewSectionProps {
  eips: EIP[];
  forkName: string;
  status: string;
  activationDate?: string;
  onStageClick: (stageId: string) => void;
  clientTeamPerspectives?: ClientTeamPerspective[];
  onExternalLinkClick?: (linkType: string, url: string) => void;
  activationDetails?: ActivationDetails;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  eips,
  forkName,
  status,
  activationDate,
  onStageClick,
  clientTeamPerspectives,
  activationDetails,
  onExternalLinkClick,
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

      {/* Headliner discussion notice for Hegota */}
      {forkName.toLowerCase() === 'hegota' && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-700 rounded">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <div>
              <h4 className="font-medium text-amber-900 dark:text-amber-100 text-sm mb-1">Headliner Discussion in Progress</h4>
              <p className="text-amber-800 dark:text-amber-200 text-xs leading-relaxed mb-3">
                The headliner proposal window has closed. ACD is now evaluating candidates and gathering community feedback. Follow the discussion on the{' '}
                <a
                  href="https://ethereum-magicians.org/t/eip-8081-hegota-network-upgrade-meta-thread/26876"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 dark:text-amber-300 underline decoration-1 underline-offset-2 hover:text-amber-800 dark:hover:text-amber-100"
                >
                  Ethereum Magicians meta thread
                </a>
                .
              </p>
              <a
                href="/rank"
                className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded border border-amber-300 dark:border-amber-600 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
              >
                Create Your Ranking
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Client Perspectives for candidate EIPs (Glamsterdam only) */}
      {forkName.toLowerCase() === 'glamsterdam' && clientTeamPerspectives && (
        <div className="mb-6">
          <ClientPerspectives
            perspectives={clientTeamPerspectives}
            type="candidate"
            onLinkClick={(url: string) => {
              window.open(url, '_blank');
              onExternalLinkClick?.('client_perspective_candidate', url);
            }}
          />
        </div>
      )}

      {/* Stage counts grid - hidden for Hegota during headliner selection */}
      {forkName.toLowerCase() !== 'hegota' && (
        <div className={status === 'Live' ? 'grid grid-cols-1 md:grid-cols-3 gap-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'}>
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
      )}
    </div>
  );
};