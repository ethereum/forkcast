import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { eipsData } from '../data/eips';
import { useMetaTags } from '../hooks/useMetaTags';
import { useAnalytics } from '../hooks/useAnalytics';
import { EIP, ClientTeamPerspective } from '../types';
import {
  getInclusionStage,
  isHeadliner,
  getLaymanTitle,
  getProposalPrefix,
  getSpecificationUrl,
  wasHeadlinerCandidate,
  getEipLayer
} from '../utils';
import {
  getInclusionStageColor,
  getUpgradeStatusColor
} from '../utils/colors';
import { Tooltip, CopyLinkButton } from './ui';
import ThemeToggle from './ui/ThemeToggle';
import {
  NetworkUpgradeTimeline,
  FusakaTimeline,
  GlamsterdamTimeline,
  PectraTimeline,
  TableOfContents,
  OverviewSection,
  ClientPerspectives,
  EipCard
} from './network-upgrade';

interface PublicNetworkUpgradePageProps {
  forkName: string;
  displayName: string;
  description: string;
  status: string;
  activationDate?: string;
  metaEipLink?: string;
  clientTeamPerspectives?: ClientTeamPerspective[];
}

const PublicNetworkUpgradePage: React.FC<PublicNetworkUpgradePageProps> = ({
  forkName,
  displayName,
  description,
  status,
  activationDate,
  metaEipLink,
  clientTeamPerspectives
}) => {
  const [eips, setEips] = useState<EIP[]>([]);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [isDeclinedExpanded, setIsDeclinedExpanded] = useState(false);
  const [isHeadlinerProposalsExpanded, setIsHeadlinerProposalsExpanded] = useState(false);
  const [layerFilter, setLayerFilter] = useState<'all' | 'EL' | 'CL'>('all');
  const location = useLocation();
  const { trackUpgradeView, trackLinkClick } = useAnalytics();

  // Update meta tags for SEO and social sharing
  useMetaTags({
    title: `${displayName} - Forkcast`,
    description: description,
    url: `https://forkcast.org/upgrade/${forkName.toLowerCase()}`,
  });

  // Filter EIPs that have relationships with this fork
  useEffect(() => {
    const filteredEips = eipsData.filter(eip =>
      eip.forkRelationships.some(fork =>
        fork.forkName.toLowerCase() === forkName.toLowerCase()
      )
    );
    setEips(filteredEips);
  }, [forkName]);

  // Track upgrade view
  useEffect(() => {
    trackUpgradeView(forkName);
  }, [forkName, trackUpgradeView]);

  // Handle URL hash on component mount and location changes
  useEffect(() => {
    const hash = location.hash.substring(1); // Remove the # symbol
    if (hash) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveSection(hash);
        }
      }, 100);
    }
  }, [location.hash, eips]);

  // Intersection Observer for TOC
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '0px'
      }
    );

    // Observe all section elements
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, [eips]);

  // Filter EIPs by layer
  const filterEipsByLayer = (eipsList: EIP[]) => {
    if (layerFilter === 'all') return eipsList;
    return eipsList.filter(eip => getEipLayer(eip, forkName) === layerFilter);
  };

  // Generate TOC items
  const tocItems = [
    { id: 'overview', label: 'Overview', type: 'section' as const, count: null as number | null },
    // Add timeline section for forks that have one
    ...(['glamsterdam', 'fusaka', 'pectra'].includes(forkName.toLowerCase()) ? [
      { id: `${forkName.toLowerCase()}-timeline`, label: 'Timeline', type: 'section' as const, count: null as number | null }
    ] : []),

    // Show EIP sections for all forks (including Glamsterdam)
    // For Live upgrades, only show Included and Declined for Inclusion
    ...[
      ...(status === 'Live'
        ? ['Included', 'Declined for Inclusion']
        : ['Included', 'Scheduled for Inclusion', 'Considered for Inclusion', 'Proposed for Inclusion', 'Declined for Inclusion']
      ).flatMap(stage => {
          // For Glamsterdam, exclude headliners from "Proposed for Inclusion" since they have their own section
          let stageEips = eips.filter(eip => {
            const matchesStage = getInclusionStage(eip, forkName) === stage;
            if (forkName.toLowerCase() === 'glamsterdam' && stage === 'Proposed for Inclusion') {
              return matchesStage && !isHeadliner(eip, forkName);
            }
            return matchesStage;
          });

          // Apply layer filter
          stageEips = filterEipsByLayer(stageEips);

          if (stageEips.length === 0) return [];

          // Sort EIPs: headliners first, then by EIP number
          const sortedEips = stageEips.sort((a, b) => {
            const aIsHeadliner = isHeadliner(a, forkName);
            const bIsHeadliner = isHeadliner(b, forkName);

            // If one is headliner and other isn't, headliner comes first
            if (aIsHeadliner && !bIsHeadliner) return -1;
            if (!aIsHeadliner && bIsHeadliner) return 1;

            // If both are same type (both headliner or both not), sort by EIP number
            return a.id - b.id;
          });

          const stageItem = {
            id: stage.toLowerCase().replace(/\s+/g, '-'),
            label: stage,
            type: 'section' as const,
            count: stageEips.length
          };

          // For Declined for Inclusion, only show the section header, not individual EIPs
          if (stage === 'Declined for Inclusion') {
            return [stageItem];
          }

          // For all other stages, show individual EIPs
          const eipItems = sortedEips.map(eip => {
            const isHeadlinerEip = isHeadliner(eip, forkName);
            const inclusionStage = getInclusionStage(eip, forkName);
            const isSFI = inclusionStage === 'Scheduled for Inclusion';

            // Use filled star for SFI EIPs, empty star for other headliners in Glamsterdam
            const starSymbol = forkName.toLowerCase() === 'glamsterdam'
              ? (isSFI ? '★' : '☆')
              : '★';

            const proposalPrefix = getProposalPrefix(eip);
            const layer = getEipLayer(eip, forkName);

            return {
              id: `eip-${eip.id}`,
              label: `${isHeadlinerEip ? `${starSymbol} ` : ''}${proposalPrefix}-${eip.id}: ${getLaymanTitle(eip)}${layer ? ` (${layer})` : ''}`,
              type: 'eip' as const,
              count: null as number | null
            };
          });

          return [stageItem, ...eipItems];
        }),

      // Add headliner candidates section for Glamsterdam if there are any
      ...(forkName.toLowerCase() === 'glamsterdam' ? (() => {
        const headlinerProposals = filterEipsByLayer(eips.filter(eip => wasHeadlinerCandidate(eip, forkName)));
        return headlinerProposals.length > 0 ? [{
          id: 'headliner-proposals',
          label: 'Headliner Proposals',
          type: 'section' as const,
          count: headlinerProposals.length
        }] : [];
      })() : []),
    ]
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL hash
      window.history.pushState(null, '', `#${sectionId}`);
      setActiveSection(sectionId);
    }
  };

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6 flex justify-between items-start">
            <Link to="/" className="text-3xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight">
              Forkcast
            </Link>
            <ThemeToggle />
          </div>
          <Link to="/" className="text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 mb-6 inline-block text-sm font-medium">
            ← All Network Upgrades
          </Link>

          <div className="border-b border-slate-200 dark:border-slate-700 pb-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">{displayName}</h1>
                  <CopyLinkButton
                    sectionId="upgrade"
                    title="Copy link to this upgrade"
                  />
                </div>
                <p className="text-base text-slate-600 dark:text-slate-300 mb-2 leading-relaxed max-w-2xl">{description}</p>
                {metaEipLink && (
                  <div className="mb-4">
                    <a
                      href={metaEipLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleExternalLinkClick('meta_eip_discussion', metaEipLink)}
                      className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2 transition-colors"
                    >
                      View Meta EIP Discussion
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
              <div className="mt-6 lg:mt-0">
                <span className={`px-3 py-1 text-xs font-medium rounded ${getUpgradeStatusColor(status)}`}>
                  {status}
                </span>
              </div>
            </div>

            <div className="mt-2">
              <p className="text-xs text-slate-400 dark:text-slate-500 italic max-w-xl">
              Forkcast is an ongoing experiment by the Protocol Support team to make the network upgrade process more accessible. Have feedback? Contact{' '}
                <a
                  href="mailto:nixo@ethereum.org"
                  onClick={() => handleExternalLinkClick('email_contact', 'mailto:nixo@ethereum.org')}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline decoration-1 underline-offset-2"
                >
                  nixo
                </a>
                {' '}or{' '}
                <a
                  href="https://x.com/wolovim"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleExternalLinkClick('twitter_contact', 'https://x.com/wolovim')}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline decoration-1 underline-offset-2"
                >
                  @wolovim
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        <NetworkUpgradeTimeline currentForkName={forkName} />

        {/* Layer Filter - Glamsterdam only */}
        {forkName.toLowerCase() === 'glamsterdam' && (
          <div className="mb-6 flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Filter EIPs by layer:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setLayerFilter('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors border ${
                  layerFilter === 'all'
                    ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setLayerFilter('EL')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors border ${
                  layerFilter === 'EL'
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                }`}
              >
                <span className="md:hidden">EL</span>
                <span className="hidden md:inline">EL (Execution Layer)</span>
              </button>
              <button
                onClick={() => setLayerFilter('CL')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors border ${
                  layerFilter === 'CL'
                    ? 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                }`}
              >
                <span className="md:hidden">CL</span>
                <span className="hidden md:inline">CL (Consensus Layer)</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-8">
          <TableOfContents
            items={tocItems}
            activeSection={activeSection}
            onSectionClick={scrollToSection}
          />

          <div className="flex-1 min-w-0">
            <div className="space-y-8">
              <OverviewSection
                eips={filterEipsByLayer(eips)}
                forkName={forkName}
                status={status}
                activationDate={activationDate}
                onStageClick={scrollToSection}
                clientTeamPerspectives={clientTeamPerspectives}
                onExternalLinkClick={handleExternalLinkClick}
              />

              {/* Timeline Section */}
              {(() => {
                const timelineConfig: Record<string, { description: string; component: React.ReactNode }> = {
                  glamsterdam: {
                    description: 'The planning timeline for Glamsterdam, showing the progression from headliner selection to final implementation decisions.',
                    component: <GlamsterdamTimeline />
                  },
                  fusaka: {
                    description: 'The deployment timeline for Fusaka, showing the progression from devnets through testnet deployments to mainnet.',
                    component: <FusakaTimeline />
                  },
                  pectra: {
                    description: 'The deployment timeline for Pectra, showing the progression from devnets through testnet deployments to mainnet.',
                    component: <PectraTimeline />
                  }
                };
                const config = timelineConfig[forkName.toLowerCase()];
                if (!config) return null;
                const sectionId = `${forkName.toLowerCase()}-timeline`;
                return (
                  <div className="space-y-6" id={sectionId} data-section>
                    <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">Timeline</h2>
                        <CopyLinkButton
                          sectionId={sectionId}
                          title="Copy link to timeline"
                          size="sm"
                        />
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
                        {config.description}
                      </p>
                    </div>
                    {config.component}
                  </div>
                );
              })()}

              {/* EIPs Grouped by Stage */}
              {/* For Live upgrades, only show Included and Declined for Inclusion */}
              {(status === 'Live'
                ? [
                    { stage: 'Included', description: 'EIPs that are part of the activated upgrade on mainnet.' },
                    { stage: 'Declined for Inclusion', description: 'EIPs that were proposed, but ultimately declined for inclusion in the upgrade for various reasons. They may be reconsidered for future upgrades.' }
                  ]
                : [
                    { stage: 'Included', description: 'EIPs that are part of the activated upgrade on mainnet.' },
                    { stage: 'Scheduled for Inclusion', description: 'EIPs that client teams have agreed to implement in the next upgrade devnet. These are very likely to be included in the final upgrade.' },
                    { stage: 'Considered for Inclusion', description: 'EIPs that client teams are positive towards. Implementation may begin, but inclusion is not yet guaranteed.' },
                    { stage: 'Proposed for Inclusion', description: 'EIPs that have been proposed for this upgrade but are still under initial review by client teams.' },
                    { stage: 'Declined for Inclusion', description: 'EIPs that were proposed, but ultimately declined for inclusion in the upgrade for various reasons. They may be reconsidered for future upgrades.' }
                  ]
              ).map(({ stage, description }) => {
                let stageEips = eips.filter(eip => getInclusionStage(eip, forkName) === stage);

                // For Glamsterdam, exclude headliners from "Proposed for Inclusion" since they have their own section
                if (forkName.toLowerCase() === 'glamsterdam' && stage === 'Proposed for Inclusion') {
                  stageEips = stageEips.filter(eip => !isHeadliner(eip, forkName));
                }

                // Apply layer filter
                stageEips = filterEipsByLayer(stageEips);

                if (stageEips.length === 0) return null;

                // Sort EIPs: headliners first, then by EIP number
                const sortedStageEips = stageEips.sort((a, b) => {
                  const aIsHeadliner = isHeadliner(a, forkName);
                  const bIsHeadliner = isHeadliner(b, forkName);

                  // If one is headliner and other isn't, headliner comes first
                  if (aIsHeadliner && !bIsHeadliner) return -1;
                  if (!aIsHeadliner && bIsHeadliner) return 1;

                  // If both are same type (both headliner or both not), sort by EIP number
                  return a.id - b.id;
                });

                const stageId = stage.toLowerCase().replace(/\s+/g, '-');
                const isDeclinedStage = stage === 'Declined for Inclusion';

                return (
                  <div key={stage} className="space-y-6" id={stageId} data-section>
                    <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">{stage}</h2>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getInclusionStageColor(stage as any)}`}>
                          {stageEips.length} EIP{stageEips.length !== 1 ? 's' : ''}
                        </span>
                        {isDeclinedStage && (
                          <button
                            onClick={() => setIsDeclinedExpanded(!isDeclinedExpanded)}
                            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                          >
                            {isDeclinedExpanded ? 'Collapse' : 'Expand'}
                            <svg
                              className={`w-3.5 h-3.5 transition-transform ${isDeclinedExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                        <CopyLinkButton
                          sectionId={stageId}
                          title={`Copy link to ${stage}`}
                          size="sm"
                        />
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">{description}</p>
                    </div>

                    {isDeclinedStage && !isDeclinedExpanded ? (
                      <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {stageEips.length} EIP{stageEips.length !== 1 ? 's' : ''} declined for inclusion in this upgrade.
                          <button
                            onClick={() => setIsDeclinedExpanded(true)}
                            className="ml-1 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 underline decoration-1 underline-offset-2 transition-colors"
                          >
                            Click to expand and view details.
                          </button>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {sortedStageEips.map(eip => {
                          if (!eip.laymanDescription) return null;

                          const eipId = `eip-${eip.id}`;

                          // For declined EIPs, show simplified view
                          if (isDeclinedStage) {
                            return (
                              <article key={eip.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-4" id={eipId} data-section>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 leading-tight mb-2">
                                      <span className="text-slate-400 dark:text-slate-500 text-sm font-mono mr-2">{getProposalPrefix(eip)}-{eip.id}</span>
                                      <span>{eip.title}</span>
                                    </h3>
                                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                      {eip.description}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
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
                              </article>
                            );
                          }

                          // Full view for non-declined EIPs
                          return <EipCard key={eip.id} eip={eip} forkName={forkName} handleExternalLinkClick={handleExternalLinkClick} />;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Headliner Proposals Section (for Glamsterdam) */}
              {forkName.toLowerCase() === 'glamsterdam' && filterEipsByLayer(eips.filter(eip => wasHeadlinerCandidate(eip, forkName))).length > 0 && (
                <div className="space-y-6" id="headliner-proposals" data-section>
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">Headliner Proposals</h2>
                      <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                        {filterEipsByLayer(eips.filter(eip => wasHeadlinerCandidate(eip, forkName))).length} EIP{filterEipsByLayer(eips.filter(eip => wasHeadlinerCandidate(eip, forkName))).length !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => setIsHeadlinerProposalsExpanded(!isHeadlinerProposalsExpanded)}
                        className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                      >
                        {isHeadlinerProposalsExpanded ? 'Collapse' : 'Expand'}
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${isHeadlinerProposalsExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <CopyLinkButton
                        sectionId="headliner-proposals"
                        title="Copy link to headliner proposals"
                        size="sm"
                      />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
                      Headliners are the most important features to include in each network upgrade. The community considered the following headliner proposals.
                    </p>
                  </div>

                  {!isHeadlinerProposalsExpanded ? (
                    <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-600 rounded p-4">
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {filterEipsByLayer(eips.filter(eip => wasHeadlinerCandidate(eip, forkName))).length} headliner proposal{filterEipsByLayer(eips.filter(eip => wasHeadlinerCandidate(eip, forkName))).length !== 1 ? 's' : ''} were considered for inclusion in this network upgrade.
                        <button
                          onClick={() => setIsHeadlinerProposalsExpanded(true)}
                          className="ml-1 text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-100 underline decoration-1 underline-offset-2 transition-colors"
                        >
                          Click to expand and view details.
                        </button>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Client Team Perspectives */}
                      <ClientPerspectives
                        perspectives={clientTeamPerspectives}
                        onLinkClick={(url: string) => {
                          window.open(url, '_blank');
                          handleExternalLinkClick('client_perspective', url);
                        }}
                      />

                      {filterEipsByLayer(eips)
                        .filter(eip => wasHeadlinerCandidate(eip, forkName))
                        .sort((a, b) => {
                          const layerA = getEipLayer(a, forkName);
                          const layerB = getEipLayer(b, forkName);

                          // Sort by layer first (EL before CL)
                          if (layerA === 'EL' && layerB === 'CL') return -1;
                          if (layerA === 'CL' && layerB === 'EL') return 1;

                          // Then sort by EIP number within each layer
                          return a.id - b.id;
                        })
                        .map(eip => {
                          if (!eip.laymanDescription) return null;
                          return <EipCard key={eip.id} eip={eip} forkName={forkName} handleExternalLinkClick={handleExternalLinkClick} />;
                        })
                      }
                    </div>
                  )}
                </div>
              )}
            </div>

            {eips.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-500 dark:text-slate-400 text-sm">No improvements found for this network upgrade.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicNetworkUpgradePage;