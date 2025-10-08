import React from 'react';
import { EIP, ClientTeamPerspective } from '../../types';
import {
  getInclusionStage,
  isHeadliner,
  getLaymanTitle,
  getHeadlinerLayer,
  parseMarkdownLinks
} from '../../utils';
import { CopyLinkButton } from '../ui/CopyLinkButton';

interface OverviewSectionProps {
  eips: EIP[];
  forkName: string;
  onStageClick: (stageId: string) => void;
  clientTeamPerspectives?: ClientTeamPerspective[];
}

const ALL_CLIENT_TEAMS = [
  // Execution Layer teams (alphabetized)
  { name: 'Besu', type: 'EL' as const },
  { name: 'Geth', type: 'EL' as const },
  { name: 'Nethermind', type: 'EL' as const },
  { name: 'Reth', type: 'EL' as const },
  // Both EL & CL teams
  { name: 'Erigon', type: 'Both' as const },
  // Consensus Layer teams (alphabetized)
  { name: 'Grandine', type: 'CL' as const },
  { name: 'Lighthouse', type: 'CL' as const },
  { name: 'Lodestar', type: 'CL' as const },
  { name: 'Nimbus', type: 'CL' as const },
  { name: 'Prysm', type: 'CL' as const },
  { name: 'Teku', type: 'CL' as const }
];

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  eips,
  forkName,
  onStageClick,
  clientTeamPerspectives = []
}) => {


  const stageStats = [
    {
      stage: 'Included',
      count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Included').length,
      color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
    },
    {
      stage: 'Proposed for Inclusion',
      count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Proposed for Inclusion').length,
      color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    },
    {
      stage: 'Considered for Inclusion',
      count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Considered for Inclusion').length,
      color: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
    },
    {
      stage: 'Scheduled for Inclusion',
      count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Scheduled for Inclusion').length,
      color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
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
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100 text-sm mb-1">Headliner Selection Complete</h4>
                <p className="text-green-800 dark:text-green-200 text-xs leading-relaxed">
                  The Glamsterdam headliner selection process has concluded. <strong>EIP-7732 (ePBS)</strong> and <strong>EIP-7928 (Block-level Access Lists)</strong> moved to <strong>Scheduled </strong> status. <strong>EIP-7805 (FOCIL)</strong> has also moved to <strong>Considered</strong> status. Smaller, non-headliner EIPs are now being proposed and discussed.
                </p>
                <p className="text-green-800 dark:text-green-200 text-xs leading-relaxed mt-2">
                  The community-driven selection process evaluated multiple proposals based on technical merit, stakeholder feedback, and ecosystem impact. View the detailed analysis for each proposed headliner below.
                </p>
              </div>
            </div>
          </div>

          {/* Headliner Options Overview */}
          <div className={`p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-200 dark:border-purple-600 rounded ${forkName.toLowerCase() === 'glamsterdam' ? '' : 'mb-6'}`} id="headliner-options" data-section>
            <h4 className="font-medium text-purple-900 dark:text-purple-100 text-sm mb-4 flex items-center gap-2">
              <span className="text-purple-600 dark:text-purple-400">★</span>
              Competing Headliner Options
              <div className="flex items-center relative top-0.5">
                <CopyLinkButton
                  sectionId="headliner-options"
                  title="Copy link to headliner options"
                  size="sm"
                />
              </div>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eips
                .filter(eip => isHeadliner(eip, forkName))
                .sort((a, b) => {
                  const stageA = getInclusionStage(a, forkName);
                  const stageB = getInclusionStage(b, forkName);

                  // Sort by inclusion status first (SFI, then CFI, then others)
                  const statusOrder: Record<string, number> = {
                    'Scheduled for Inclusion': 0,
                    'Considered for Inclusion': 1,
                    'Proposed for Inclusion': 2
                  };
                  const orderA = statusOrder[stageA] ?? 3;
                  const orderB = statusOrder[stageB] ?? 3;

                  if (orderA !== orderB) return orderA - orderB;

                  // Then sort by layer (EL before CL)
                  const layerA = getHeadlinerLayer(a, forkName);
                  const layerB = getHeadlinerLayer(b, forkName);
                  if (layerA === 'EL' && layerB === 'CL') return -1;
                  if (layerA === 'CL' && layerB === 'EL') return 1;

                  // Finally sort by EIP number
                  return a.id - b.id;
                })
                .map(eip => {
                  if (!eip.laymanDescription) return null;

                  const layer = getHeadlinerLayer(eip, forkName);
                  const inclusionStage = getInclusionStage(eip, forkName);

                  // Determine SFI/CFI status
                  const statusLabel = inclusionStage === 'Scheduled for Inclusion' ? 'Scheduled'
                    : inclusionStage === 'Considered for Inclusion' ? 'Considered'
                    : null;

                  // Enhanced styling hierarchy: Scheduled gets full treatment, Considered gets moderate, others minimal
                  const isMainHeadliner = statusLabel === 'Scheduled';
                  const isConsidered = statusLabel === 'Considered';

                  const cardClass = isMainHeadliner
                    ? "text-left p-4 bg-gradient-to-br from-white to-green-50 dark:from-slate-700 dark:to-green-900/20 border-2 border-green-300 dark:border-green-500 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group ring-1 ring-green-100 dark:ring-green-800"
                    : isConsidered
                      ? "text-left p-3 bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-600 rounded hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-sm transition-all duration-200 group"
                      : "text-left p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm transition-all duration-200 group opacity-75 hover:opacity-100";

                  return (
                    <button
                      key={eip.id}
                      onClick={() => onStageClick(`eip-${eip.id}`)}
                      className={`${cardClass} relative cursor-pointer overflow-hidden`}
                    >
                        {/* Status Corner Flag */}
                        {statusLabel && (
                          <div className={`absolute px-3 py-1 text-xs font-bold text-white rounded-tr-lg rounded-bl-lg shadow-sm ${
                            statusLabel === 'Scheduled'
                              ? '-top-px -right-px bg-green-500 dark:bg-green-500'
                              : '-top-0.5 -right-0.5 bg-amber-500 dark:bg-amber-500'
                          }`}>
                            {statusLabel}
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 mr-4">
                            <div className="flex items-center gap-2 mb-1">
                              {layer && (
                                <span className={`px-2 py-0.5 text-xs font-medium rounded border h-5 flex items-center ${
                                  layer === 'EL'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-600'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-600'
                                }`}>
                                  {layer}
                                </span>
                              )}
                            </div>
                            <h5 className={`font-medium text-sm transition-colors ${
                              isMainHeadliner
                                ? 'text-green-900 dark:text-green-100 group-hover:text-green-700 dark:group-hover:text-green-300 font-semibold'
                                : isConsidered
                                ? 'text-slate-800 dark:text-slate-200 group-hover:text-slate-700 dark:group-hover:text-slate-100'
                                : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                            }`}>
                              EIP-{eip.id}: {getLaymanTitle(eip)}
                            </h5>
                          </div>
                        </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                        {eip.laymanDescription.length > 120
                          ? parseMarkdownLinks(eip.laymanDescription.substring(0, 120) + '...')
                          : parseMarkdownLinks(eip.laymanDescription)
                        }
                      </p>
                    </button>
                  );
                })}
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-4 italic">
              Click any option above to jump to its detailed analysis below.
            </p>
          </div>

          {/* Client Team Perspectives */}
          <div className="mt-6 p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded" id="client-team-perspectives" data-section>
            <h4 className="font-medium text-indigo-900 dark:text-indigo-100 text-sm mb-3 flex items-center gap-2">
              Client Team Perspectives
              <div className="flex items-center relative top-0.5">
                <CopyLinkButton
                  sectionId="client-team-perspectives"
                  title="Copy link to client team perspectives"
                  size="sm"
                />
              </div>
            </h4>
            <p className="text-indigo-800 dark:text-indigo-200 text-xs leading-relaxed mb-3">
              Client teams publish their perspectives on headliner selection. These viewpoints are especially important as these teams will implement and maintain the chosen features.
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_CLIENT_TEAMS.map((team) => {
                const perspective = clientTeamPerspectives.find(p => p.teamName === team.name);
                const hasPerspective = !!perspective;

                return (
                  <div
                    key={team.name}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                      hasPerspective
                        ? 'bg-white dark:bg-slate-700 border border-indigo-200 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer'
                        : 'bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-600 opacity-60'
                    }`}
                    onClick={() => hasPerspective && window.open(perspective!.blogPostUrl, '_blank')}
                  >
                    <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                      team.type === 'EL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
                      team.type === 'CL' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                      'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                    }`}>
                      {team.type}
                    </span>
                    <span className="font-medium text-indigo-900 dark:text-indigo-100">{team.name}</span>
                    {hasPerspective && (
                      <span className="text-indigo-600 dark:text-indigo-400">→</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Stage stats - only show for non-Glamsterdam forks */}
      {forkName.toLowerCase() !== 'glamsterdam' && (
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
      )}
    </div>
  );
};