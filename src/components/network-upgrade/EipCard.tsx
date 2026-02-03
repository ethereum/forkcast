import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EIP } from '../../types';
import {
  getInclusionStage,
  getHeadlinerDiscussionLink,
  isHeadliner,
  getLaymanTitle,
  getProposalPrefix,
  getSpecificationUrl,
  parseMarkdownLinks,
  getEipLayer,
} from '../../utils';
import { Tooltip, CopyLinkButton } from '../ui';
import { useButterflyData } from '../../hooks/useButterflyData';
import { ClientTestingProgress } from './ClientTestingProgress';

interface EipCardProps {
  eip: EIP;
  forkName: string;
  handleExternalLinkClick: (linkType: string, url: string) => void;
}

export const EipCard: React.FC<EipCardProps> = ({ eip, forkName, handleExternalLinkClick }) => {
  const eipId = `eip-${eip.id}`;
  const layer = getEipLayer(eip);
  const [showChampionDetails, setShowChampionDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch butterfly data for EIP 7928
  const { data: butterflyData, loading: butterflyLoading, error: butterflyError } = useButterflyData(eip.id, forkName);

  const hasMissingTradeoffs = !eip.tradeoffs || eip.tradeoffs.length === 0;

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
              <div className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <CopyLinkButton
                  sectionId={eipId}
                  title={`Copy link to this section`}
                  size="sm"
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
                          ? "Selected headliner feature"
                          : "Proposed headliner feature";
                      }
                      return "Headliner feature";
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
                <Link
                  to={`/eips/${eip.id}`}
                  className="text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 text-sm font-mono mr-2 relative -top-px transition-colors"
                >
                  {getProposalPrefix(eip)}-{eip.id}
                </Link>
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
                  <Tooltip text="View discussion">
                    <a
                      href={eip.discussionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleExternalLinkClick('discussion', eip.discussionLink)}
                      className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer relative group"
                    >
                      <div className="relative w-7 h-7">
                        <img
                          src="/eth-mag.png"
                          alt="Ethereum Magicians"
                          className="w-7 h-7 opacity-90 dark:opacity-70"
                        />
                        <svg
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
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
                <Tooltip text="View specification">
                  <a
                    href={getSpecificationUrl(eip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleExternalLinkClick('specification', getSpecificationUrl(eip))}
                    className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer relative group"
                  >
                    <div className="relative w-7 h-7">
                      <img
                        src="/eth-diamond-black.png"
                        alt="Ethereum"
                        className="w-7 h-7 opacity-90 dark:opacity-100 dark:invert"
                      />
                      <svg
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
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

        <div className="mt-3 text-xs space-x-3">
          {/* Block Access List Resources (EIP 7928) */}
          {eip.id === 7928 && (
            <a
              href="https://blockaccesslist.xyz"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                if (window._paq) {
                  window._paq.push(['trackEvent', 'External Link', 'block_access_list_eip', 'https://blockaccesslist.xyz']);
                }
              }}
              className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2 transition-colors"
            >
              blockaccesslist.xyz
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}

          {/* Headliner Discussion Link */}
          {(() => {
            const isHeadlinerEip = isHeadliner(eip, forkName);
            const discussionLink = getHeadlinerDiscussionLink(eip, forkName);
            return isHeadlinerEip && discussionLink && (
              <a
                href={discussionLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleExternalLinkClick('headliner_discussion', discussionLink)}
                className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2 transition-colors"
              >
                Headliner proposal
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            );
          })()}
        </div>

        {/* Champion Information */}
        {forkName.toLowerCase() === 'glamsterdam' && (() => {
          const forkRelationship = eip.forkRelationships.find(fr => fr.forkName.toLowerCase() === forkName.toLowerCase());
          const champions = forkRelationship?.champions;
          const hasChampions = champions && champions.length > 0;
          const hasAnyContactInfo = champions?.some(c => c.discord || c.telegram || c.email);

          return (
            <div className="mt-4">
              {hasChampions ? (
                <>
                  <div className="inline-flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {champions.length > 1 ? 'Champions:' : 'Champion:'}
                    </span>
                    <button
                      onClick={() => setShowChampionDetails(!showChampionDetails)}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors group"
                    >
                      <span className="font-medium">{champions.map(c => c.name).join(' & ')}</span>
                      {hasAnyContactInfo && (
                        <svg
                          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-all ${showChampionDetails ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {hasAnyContactInfo && (
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        showChampionDetails ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-2 ml-4 space-y-3 bg-slate-50 dark:bg-slate-700/50 rounded px-3 py-2">
                          {champions
                            .filter(c => c.discord || c.telegram || c.email)
                            .map((champion, idx) => (
                              <div key={idx} className="space-y-1.5">
                                {champions.length > 1 && (
                                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{champion.name}</div>
                                )}
                                {champion.discord && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500 dark:text-slate-400">Discord:</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">{champion.discord}</span>
                                  </div>
                                )}
                                {champion.telegram && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500 dark:text-slate-400">Telegram:</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">{champion.telegram}</span>
                                  </div>
                                )}
                                {champion.email && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500 dark:text-slate-400">Email:</span>
                                    <a
                                      href={`mailto:${champion.email}`}
                                      className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      {champion.email}
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="inline-flex items-center gap-2 bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-700/30 rounded px-2.5 py-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Champion:</span>
                  <span className="text-xs text-amber-700 dark:text-amber-400/90 italic">Not yet assigned</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Client Testing Progress (EIP 7928) */}
        {eip.id === 7928 && !butterflyLoading && (
          <>
            {butterflyData && <ClientTestingProgress data={butterflyData} />}
            {butterflyError && (
              <div className="mt-4 border-t border-slate-200 dark:border-slate-600 pt-4">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
                  Client Testing Progress
                </h4>
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Unable to load implementation progress data.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Benefits - Always visible */}
        {eip.benefits && eip.benefits.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">Key Benefits</h4>
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

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span>{isExpanded ? 'Show less' : 'Show more'}</span>
        </button>
      </div>

      {/* Expandable Content */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-8 space-y-8">
        {/* Trade-offs & Considerations */}
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide">Trade-offs & Considerations</h4>
          {hasMissingTradeoffs ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              No trade-offs documented yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {eip.tradeoffs!.map((tradeoff, index) => (
                <li key={index} className="flex items-start text-sm">
                  <span className="text-amber-600 dark:text-amber-400 mr-3 mt-0.5 text-xs">●</span>
                  <span className="text-slate-700 dark:text-slate-300">{tradeoff}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

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
                    <div key={stakeholder} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-4 overflow-hidden">
                      <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                        {stakeholderNames[stakeholder as keyof typeof stakeholderNames]}
                      </h5>
                      <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed break-words">{impact.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
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
        </div>
      </div>
    </article>
  );
};