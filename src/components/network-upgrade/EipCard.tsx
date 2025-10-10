import React from 'react';
import { EIP } from '../../types';
import {
  getInclusionStage,
  getHeadlinerDiscussionLink,
  isHeadliner,
  getLaymanTitle,
  getProposalPrefix,
  getSpecificationUrl,
  parseMarkdownLinks,
  getHeadlinerLayer,
} from '../../utils';
import { Tooltip, CopyLinkButton } from '../ui';

interface EipCardProps {
  eip: EIP;
  forkName: string;
  handleExternalLinkClick: (linkType: string, url: string) => void;
}

export const EipCard: React.FC<EipCardProps> = ({ eip, forkName, handleExternalLinkClick }) => {
  const eipId = `eip-${eip.id}`;
  const layer = getHeadlinerLayer(eip, forkName);

  return (
    <article key={eip.id} className={`bg-white dark:bg-slate-800 border rounded p-8 ${
      isHeadliner(eip, forkName)
        ? 'border-purple-200 dark:border-purple-600 shadow-sm ring-1 ring-purple-100 dark:ring-purple-900/20'
        : 'border-slate-200 dark:border-slate-600'
    }`} id={eipId} data-section>
      {/* Header */}
      <header className="border-b border-slate-100 dark:border-slate-700 pb-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 group relative">
              {/* Anchor link - positioned absolutely in the left margin */}
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <CopyLinkButton
                  sectionId={eipId}
                  title={`Copy link to this section`}
                  size="md"
                />
              </div>
              
              <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 leading-tight flex-1">
                {isHeadliner(eip, forkName) && (
                  <Tooltip
                    text={(() => {
                      const inclusionStage = getInclusionStage(eip, forkName);
                      const isSFI = inclusionStage === 'Scheduled for Inclusion';
                      if (forkName.toLowerCase() === 'glamsterdam') {
                        return isSFI
                          ? "Selected headliner feature of this network upgrade"
                          : "Proposed headliner feature of this network upgrade";
                      }
                      return "Headliner feature of this network upgrade";
                    })()}
                    className="inline-block cursor-pointer"
                  >
                    <span
                      className="text-purple-400 hover:text-purple-600 dark:text-purple-500 dark:hover:text-purple-400 mr-2 transition-colors cursor-help"
                    >
                      {(() => {
                        const inclusionStage = getInclusionStage(eip, forkName);
                        const isSFI = inclusionStage === 'Scheduled for Inclusion';
                        return forkName.toLowerCase() === 'glamsterdam'
                          ? (isSFI ? '★' : '☆')
                          : '★';
                      })()}
                    </span>
                  </Tooltip>
                )}
                <span className="text-slate-400 dark:text-slate-500 text-sm font-mono mr-2 relative -top-px">{getProposalPrefix(eip)}-{eip.id}</span>
                <span>{getLaymanTitle(eip)}</span>
                {layer && (
                  <Tooltip
                    text={layer === 'EL' ? 'Primarily impacts Execution Layer' : 'Primarily impacts Consensus Layer'}
                    className="inline-block"
                  >
                    <span className={`px-2 py-1 text-xs font-medium rounded ml-2 relative -top-px ${
                      layer === 'EL'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600'
                        : 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 border border-teal-200 dark:border-teal-600'
                    }`}>
                      {layer}
                    </span>
                  </Tooltip>
                )}
              </h3>
              
              {/* External links - always visible on the right */}
              <div className="flex items-center gap-2 relative top-0.5 ml-auto">
                {/* Discussion link */}
                {eip.discussionLink && (
                  <Tooltip text={`View ${getProposalPrefix(eip)}-${eip.id} discussion`}>
                    <a
                      href={eip.discussionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleExternalLinkClick('discussion', eip.discussionLink)}
                      className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer relative"
                    >
                      <div className="relative w-7.5 h-7.5">
                        <img 
                          src="/eth-mag.png" 
                          alt="Ethereum Magicians" 
                          className="w-7.5 h-7.5 opacity-90 dark:opacity-70"
                        />
                        <svg 
                          className="absolute -bottom-1 -right-1 w-4 h-4" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </a>
                  </Tooltip>
                )}
                
                {/* Specification link */}
                <Tooltip text={`View ${getProposalPrefix(eip)}-${eip.id} specification`}>
                  <a
                    href={getSpecificationUrl(eip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleExternalLinkClick('specification', getSpecificationUrl(eip))}
                    className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer relative"
                  >
                    <div className="relative w-7.5 h-7.5">
                      <img 
                        src="/eth-diamond-black.png" 
                        alt="Ethereum" 
                        className="w-7.5 h-7.5 opacity-90 dark:opacity-70"
                      />
                      <svg 
                        className="absolute -bottom-1 -right-1 w-4 h-4" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Description */}
      <div className="">
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          {parseMarkdownLinks(eip.laymanDescription || '')}
        </p>

        {/* Headliner Discussion Link */}
        {(() => {
          const isHeadlinerEip = isHeadliner(eip, forkName);
          const discussionLink = getHeadlinerDiscussionLink(eip, forkName);
          return isHeadlinerEip && discussionLink && (
            <div className="mt-3">
              <a
                href={discussionLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleExternalLinkClick('headliner_discussion', discussionLink)}
                className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2 transition-colors"
              >
                Read the headliner proposal and discussion on EthMag
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          );
        })()}
      </div>

      <div className="mt-8 space-y-8">
        {/* Benefits */}
        {eip.benefits && eip.benefits.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide">Key Benefits</h4>
            <ul className="space-y-2">
              {eip.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start text-sm">
                  <span className="text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 text-xs">●</span>
                  <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stakeholder Impact */}
        {eip.stakeholderImpacts && Object.keys(eip.stakeholderImpacts).length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide">Stakeholder Impact</h4>
            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(eip.stakeholderImpacts).map(([stakeholder, impact]) => {
                  const stakeholderNames = {
                    endUsers: 'End Users',
                    appDevs: 'Application Developers',
                    walletDevs: 'Wallet Developers',
                    toolingInfra: 'Tooling / Infrastructure Developers',
                    layer2s: 'Layer 2s',
                    stakersNodes: 'Stakers & Node Operators',
                    clClients: 'Client Developers (Consensus Layer)',
                    elClients: 'Client Developers (Execution Layer)'
                  };

                  return (
                    <div key={stakeholder} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-4">
                      <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                        {stakeholderNames[stakeholder as keyof typeof stakeholderNames]}
                      </h5>
                      <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">{impact.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Trade-offs & Considerations */}
        {eip.tradeoffs && eip.tradeoffs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide">Trade-offs & Considerations</h4>
            <ul className="space-y-2">
              {eip.tradeoffs.map((tradeoff, index) => (
                <li key={index} className="flex items-start text-sm">
                  <span className="text-amber-600 dark:text-amber-400 mr-3 mt-0.5 text-xs">⚠</span>
                  <span className="text-slate-700 dark:text-slate-300">{tradeoff}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* North Star Goal Alignment */}
        {(eip.northStarAlignment?.scaleL1 || eip.northStarAlignment?.scaleBlobs || eip.northStarAlignment?.improveUX) && (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide">North Star Goal Alignment</h4>
            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-4">
              <div className="space-y-4">
                {eip.northStarAlignment?.scaleL1 && (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-4">
                    <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-3 border-b border-blue-200 dark:border-blue-600 pb-2">Scale L1</h5>
                    <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">{eip.northStarAlignment.scaleL1.description}</p>
                  </div>
                )}
                {eip.northStarAlignment?.scaleBlobs && (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-4">
                    <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-3 border-b border-purple-200 dark:border-purple-600 pb-2">Scale Blobs</h5>
                    <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">{eip.northStarAlignment.scaleBlobs.description}</p>
                  </div>
                )}
                {eip.northStarAlignment?.improveUX && (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-4">
                    <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-3 border-b border-emerald-200 dark:border-emerald-600 pb-2">Improve UX</h5>
                    <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">{eip.northStarAlignment.improveUX.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};