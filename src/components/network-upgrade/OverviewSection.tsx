import React from 'react';
import { EIP, ClientTeamPerspective } from '../../types';
import {
  getInclusionStage,
} from '../../utils';
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
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  eips,
  forkName,
  status,
  activationDate,
  onStageClick,
  clientTeamPerspectives,
  onExternalLinkClick,
}) => {
  // For Live upgrades, only show Included and Declined for Inclusion
  const stageStats = status === 'Live'
    ? [
        {
          stage: 'Included',
          count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Included').length,
          color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
        },
        {
          stage: 'Declined for Inclusion',
          count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Declined for Inclusion').length,
          color: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
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

      {/* Headliner proposal window notice for Hegota */}
      {forkName.toLowerCase() === 'hegota' && (
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-700 rounded">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <div>
              <h4 className="font-medium text-amber-900 dark:text-amber-100 text-sm mb-1">Headliner Proposal Window Open</h4>
              <p className="text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
                The headliner proposal window is open until February 4th. To propose a headliner, post on the{' '}
                <a
                  href="https://ethereum-magicians.org/t/eip-8081-hegota-network-upgrade-meta-thread/26876"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-900 dark:hover:text-amber-100"
                >
                  Ethereum Magicians meta thread
                </a>
                {' '}and present your EIP on an ACDE or ACDC call.
              </p>
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

      {/* For Live upgrades, use special layout with Live status box; otherwise use 4-column grid */}
      <div className={status === 'Live' ? 'grid grid-cols-1 md:grid-cols-4 gap-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'}>
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
          const isIncludedInLive = status === 'Live' && stage === 'Included';

          return (
            <button
              key={stage}
              onClick={() => hasEips && onStageClick(stageId)}
              disabled={!hasEips}
              className={`text-center p-4 rounded transition-all duration-200 ${
                isIncludedInLive ? 'md:col-span-2' : ''
              } ${
                hasEips
                  ? 'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 hover:shadow-sm cursor-pointer'
                  : 'bg-slate-50 dark:bg-slate-700 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className={`font-light text-slate-900 dark:text-slate-100 mb-1 ${isIncludedInLive ? 'text-3xl' : 'text-2xl'}`}>{count}</div>
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