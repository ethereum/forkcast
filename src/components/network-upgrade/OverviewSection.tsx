import React from 'react';
import { EIP } from '../../types';
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
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  eips,
  forkName,
  onStageClick
}) => {
  const { trackLinkClick } = useAnalytics();

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  const stageStats = [
    { 
      stage: 'Proposed for Inclusion', 
      count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Proposed for Inclusion').length, 
      color: 'bg-slate-100 text-slate-700' 
    },
    { 
      stage: 'Considered for Inclusion', 
      count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Considered for Inclusion').length, 
      color: 'bg-slate-200 text-slate-700' 
    },
    { 
      stage: 'Scheduled for Inclusion', 
      count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Scheduled for Inclusion').length, 
      color: 'bg-yellow-50 text-yellow-700' 
    },
    { 
      stage: 'Declined for Inclusion', 
      count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Declined for Inclusion').length, 
      color: 'bg-red-50 text-red-800' 
    }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded p-6" id="overview" data-section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Upgrade Overview</h2>
        <CopyLinkButton 
          sectionId="overview" 
          title="Copy link to overview"
          size="sm"
        />
      </div>

      {/* Special note for Glamsterdam's competitive headliner process */}
      {forkName.toLowerCase() === 'glamsterdam' && (
        <>
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-amber-900 text-sm mb-1">Headliner Selection in Progress</h4>
                <p className="text-amber-800 text-xs leading-relaxed">
                  Headliners are the largest and most impactful features of an upgrade and may be permissionlessly proposed by anyone. The community is actively deciding which direction to prioritize in this network upgrade.
                  <a 
                    href="https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleExternalLinkClick('headliner_discussion', 'https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195')}
                    className="text-amber-700 hover:text-amber-900 underline decoration-1 underline-offset-2 ml-1"
                  >
                    Follow the discussion →
                  </a>
                </p>
                <br></br>
                <p className="text-amber-800 text-xs leading-relaxed">
                <a 
                    href="https://forkcast.org/rank" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleExternalLinkClick('headliner_discussion', 'https://forkcast.org/rank')}
                    className="text-amber-700 hover:text-amber-900 underline decoration-1 underline-offset-2"
                  >
                    Create your own tier list of headliners and share your priorities →
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Headliner Options Overview */}
          <div className={`p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded ${forkName.toLowerCase() === 'glamsterdam' ? '' : 'mb-6'}`}>
            <h4 className="font-medium text-purple-900 text-sm mb-4 flex items-center gap-2">
              <span className="text-purple-600">★</span>
              Competing Headliner Options
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
                      className="text-left p-3 bg-white border border-purple-200 rounded hover:border-purple-300 hover:shadow-sm transition-all duration-200 group"
                    >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-purple-900 text-sm group-hover:text-purple-700 transition-colors">
                              EIP-{eip.id}: {getLaymanTitle(eip)}
                            </h5>
                            {layer && (
                              <Tooltip
                                text={layer === 'EL' ? 'Primarily impacts Execution Layer' : 'Primarily impacts Consensus Layer'}
                                className="inline-block"
                              >
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                  layer === 'EL'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-green-100 text-green-700 border border-green-200'
                                }`}>
                                  {layer}
                                </span>
                              </Tooltip>
                            )}
                          </div>
                          <svg className="w-4 h-4 text-purple-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {eip.laymanDescription.length > 120 
                          ? parseMarkdownLinks(eip.laymanDescription.substring(0, 120) + '...')
                          : parseMarkdownLinks(eip.laymanDescription)
                        }
                      </p>
                    </button>
                  );
                })}
            </div>
            <p className="text-xs text-purple-700 mt-4 italic">
              Click any option above to jump to its detailed analysis below.
            </p>
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
                    ? 'bg-slate-50 hover:bg-slate-100 hover:shadow-sm cursor-pointer' 
                    : 'bg-slate-50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="text-2xl font-light text-slate-900 mb-1">{count}</div>
                <div className="text-xs text-slate-500 mb-1">EIP{count !== 1 ? 's' : ''}</div>
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