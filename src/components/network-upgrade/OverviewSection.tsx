import React from 'react';
import { Link } from 'react-router-dom';
import { EIP, ClientTeamPerspective } from '../../types';
import {
  getInclusionStage,
  isHeadliner,
  getLaymanTitle,
  getHeadlinerLayer,
  parseMarkdownLinks
} from '../../utils';
import { CopyLinkButton } from '../ui/CopyLinkButton';
import { useAnalytics } from '../../hooks/useAnalytics';
import { Tooltip } from '../ui/Tooltip';

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
  const { trackLinkClick } = useAnalytics();

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  const stageStats = [
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
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-100 text-sm mb-1">Headliner Selection in Progress</h4>
                <p className="text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
                  Headliners are the largest and most impactful features of an upgrade and may be permissionlessly proposed by anyone. The community is actively deciding which direction to prioritize in this network upgrade.
                  <a
                    href="https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleExternalLinkClick('headliner_discussion', 'https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195')}
                    className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 underline decoration-1 underline-offset-2 ml-1"
                  >
                    Follow the discussion →
                  </a>
                </p>
                <p className="text-amber-800 dark:text-amber-200 text-xs leading-relaxed mt-2">
                  Your input can help shape the direction of the Glamsterdam upgrade. Stakeholder feedback is crucial for surfacing priorities and concerns from across the ecosystem. Get involved:
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                      <Link
                        to="/rank"
                        className="text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-100 underline decoration-1 underline-offset-2"
                      >
                        Create your own tier list of headliner proposals
                      </Link>
                      {" "}to share which features you think should be prioritized.
                    </li>
                    <li>
                      <a
                        href="https://ethereum-magicians.org/t/soliciting-stakeholder-feedback-on-glamsterdam-headliners/24885"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleExternalLinkClick('community_feedback', 'https://ethereum-magicians.org/t/soliciting-stakeholder-feedback-on-glamsterdam-headliners/24885')}
                        className="text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-100 underline decoration-1 underline-offset-2"
                      >
                        Submit stakeholder feedback
                      </a>
                      {" "}to explain how your community or project would be affected by different headliner choices.
                    </li>
                  </ul>
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
                  const layerA = getHeadlinerLayer(a, forkName);
                  const layerB = getHeadlinerLayer(b, forkName);

                  // Sort by layer first (EL before CL)
                  if (layerA === 'EL' && layerB === 'CL') return -1;
                  if (layerA === 'CL' && layerB === 'EL') return 1;

                  // Then sort by EIP number within each layer
                  return a.id - b.id;
                })
                .map(eip => {
                  if (!eip.laymanDescription) return null;

                  const layer = getHeadlinerLayer(eip, forkName);

                  return (
                    <button
                      key={eip.id}
                      onClick={() => onStageClick(`eip-${eip.id}`)}
                      className="text-left p-3 bg-white dark:bg-slate-700 border border-purple-200 dark:border-purple-600 rounded hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-sm transition-all duration-200 group"
                    >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-purple-900 dark:text-purple-100 text-sm group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                              EIP-{eip.id}: {getLaymanTitle(eip)}
                            </h5>
                            {layer && (
                              <Tooltip
                                text={layer === 'EL' ? 'Primarily impacts Execution Layer' : 'Primarily impacts Consensus Layer'}
                                className="inline-block"
                              >
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                  layer === 'EL'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-600'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-600'
                                }`}>
                                  {layer}
                                </span>
                              </Tooltip>
                            )}
                          </div>
                          <svg className="w-4 h-4 text-purple-400 dark:text-purple-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
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