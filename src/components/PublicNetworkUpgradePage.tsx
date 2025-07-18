import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import eipsData from '../data/eips.json';
import { useMetaTags } from '../hooks/useMetaTags';
import { useAnalytics } from '../hooks/useAnalytics';
import { EIP, ClientTeamPerspective } from '../types';
import {
  getInclusionStage,
  getHeadlinerDiscussionLink,
  isHeadliner,
  getLaymanTitle,
  getProposalPrefix,
  getSpecificationUrl,
  parseMarkdownLinks,
  getHeadlinerLayer
} from '../utils';
import {
  getInclusionStageColor,
  getUpgradeStatusColor
} from '../utils/colors';
import { Tooltip, CopyLinkButton } from './ui';
import ThemeToggle from './ui/ThemeToggle';
import {
  NetworkUpgradeTimeline,
  GlamsterdamTimeline,
  TableOfContents,
  OverviewSection
} from './network-upgrade';

interface PublicNetworkUpgradePageProps {
  forkName: string;
  displayName: string;
  description: string;
  status: string;
  metaEipLink?: string;
  clientTeamPerspectives?: ClientTeamPerspective[];
}

const PublicNetworkUpgradePage: React.FC<PublicNetworkUpgradePageProps> = ({
  forkName,
  displayName,
  description,
  status,
  metaEipLink,
  clientTeamPerspectives
}) => {
  const [eips, setEips] = useState<EIP[]>([]);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [isDeclinedExpanded, setIsDeclinedExpanded] = useState(false);
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

  // Generate TOC items
  const tocItems = [
    { id: 'overview', label: 'Overview', type: 'section' as const, count: null as number | null },
    // Add Glamsterdam timeline section
    ...(forkName.toLowerCase() === 'glamsterdam' ? [
      { id: 'glamsterdam-timeline', label: 'Timeline', type: 'section' as const, count: null as number | null }
    ] : []),
    // Add headliner proposals section for forks with multiple headliners
    ...(forkName.toLowerCase() === 'glamsterdam' && eips.filter(eip => isHeadliner(eip, forkName)).length > 1 ? [
      {
        id: 'headliner-proposals',
        label: 'Headliner Proposals',
        type: 'section' as const,
        count: eips.filter(eip => isHeadliner(eip, forkName)).length
      },
      ...eips
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
          const layer = getHeadlinerLayer(eip, forkName);
          return {
            id: `eip-${eip.id}`,
            label: `☆ ${getProposalPrefix(eip)}-${eip.id}: ${getLaymanTitle(eip)}${layer ? ` (${layer})` : ''}`,
            type: 'eip' as const,
            count: null as number | null
          };
        })
    ] : []),
    // For non-Glamsterdam forks, show all EIP sections
    ...(forkName.toLowerCase() !== 'glamsterdam' ? [
      ...['Scheduled for Inclusion', 'Considered for Inclusion', 'Proposed for Inclusion', 'Declined for Inclusion']
        .flatMap(stage => {
          // For Glamsterdam, exclude headliners from "Proposed for Inclusion" since they have their own section
          const stageEips = eips.filter(eip => {
            const matchesStage = getInclusionStage(eip, forkName) === stage;
            if (forkName.toLowerCase() === 'glamsterdam' && stage === 'Proposed for Inclusion') {
              return matchesStage && !isHeadliner(eip, forkName);
            }
            return matchesStage;
          });

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
            const starSymbol = forkName.toLowerCase() === 'glamsterdam' ? '☆' : '★';
            const proposalPrefix = getProposalPrefix(eip);
            const layer = isHeadlinerEip ? getHeadlinerLayer(eip, forkName) : null;

            return {
              id: `eip-${eip.id}`,
              label: `${isHeadlinerEip ? `${starSymbol} ` : ''}${proposalPrefix}-${eip.id}: ${getLaymanTitle(eip)}${layer ? ` (${layer})` : ''}`,
              type: 'eip' as const,
              count: null as number | null
            };
          });

          return [stageItem, ...eipItems];
        })
    ] : [])
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

            {/* Discrete experiment notice */}
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

        {/* Network Upgrade Timeline */}
        <NetworkUpgradeTimeline currentForkName={forkName} />

        {/* Main Content with TOC */}
        <div className="flex gap-8">
          {/* Table of Contents */}
          <TableOfContents
            items={tocItems}
            activeSection={activeSection}
            onSectionClick={scrollToSection}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* EIPs */}
            <div className="space-y-8">
              {/* Overview Section */}
              <OverviewSection
                eips={eips}
                forkName={forkName}
                onStageClick={scrollToSection}
                clientTeamPerspectives={clientTeamPerspectives}
              />

              {/* Glamsterdam Timeline Section */}
              {forkName.toLowerCase() === 'glamsterdam' && (
                <div className="space-y-6" id="glamsterdam-timeline" data-section>
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">Timeline</h2>
                      <CopyLinkButton
                        sectionId="glamsterdam-timeline"
                        title="Copy link to timeline"
                        size="sm"
                      />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
                      The planning timeline for Glamsterdam, showing the progression from headliner selection to final implementation decisions.
                    </p>
                  </div>
                  <GlamsterdamTimeline />
                </div>
              )}

              {/* Headliner Proposals Section (for Glamsterdam) */}
              {forkName.toLowerCase() === 'glamsterdam' && eips.filter(eip => isHeadliner(eip, forkName)).length > 1 && (
                <div className="space-y-6" id="headliner-proposals" data-section>
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">Headliner Proposals</h2>
                      <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                        {eips.filter(eip => isHeadliner(eip, forkName)).length} EIP{eips.filter(eip => isHeadliner(eip, forkName)).length !== 1 ? 's' : ''}
                      </span>
                      <CopyLinkButton
                        sectionId="headliner-proposals"
                        title="Copy link to headliner proposals"
                        size="sm"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
                      Multiple major features are competing for inclusion as the headliner of this network upgrade. The community is actively deciding which direction to prioritize.
                    </p>
                      <div className="flex flex-col gap-2">
                        <Link
                          to="/rank"
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium border border-purple-600 text-purple-700 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-800/40 rounded-md transition-colors whitespace-nowrap"
                        >
                          Rank Proposals
                        </Link>
                        <a
                          href="https://ethereum-magicians.org/t/soliciting-stakeholder-feedback-on-glamsterdam-headliners/24885"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleExternalLinkClick('community_feedback', 'https://ethereum-magicians.org/t/soliciting-stakeholder-feedback-on-glamsterdam-headliners/24885')}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium border border-emerald-600 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 rounded-md transition-colors whitespace-nowrap"
                        >
                          Submit Feedback
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
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

                        const eipId = `eip-${eip.id}`;
                        const layer = getHeadlinerLayer(eip, forkName);

                        return (
                          <article key={eip.id} className="bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-600 rounded p-8 shadow-sm ring-1 ring-purple-100 dark:ring-purple-900/20" id={eipId} data-section>
                            {/* Header */}
                            <header className="border-b border-slate-100 dark:border-slate-700 pb-6 mb-6">
                              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 leading-tight">
                                      {isHeadliner(eip, forkName) && (
                                        <Tooltip
                                          text={forkName.toLowerCase() === 'glamsterdam'
                                            ? "Competing headliner proposal for this network upgrade"
                                            : "Headliner feature of this network upgrade"
                                          }
                                          className="inline-block cursor-pointer"
                                        >
                                          <span
                                            className="text-purple-400 hover:text-purple-600 dark:text-purple-500 dark:hover:text-purple-400 mr-2 transition-colors cursor-help"
                                          >
                                            {forkName.toLowerCase() === 'glamsterdam' ? '☆' : '★'}
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
                                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-600'
                                              : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-600'
                                          }`}>
                                            {layer}
                                          </span>
                                        </Tooltip>
                                      )}
                                    </h3>
                                    <div className="flex items-center gap-2 relative top-0.5">
                                      <Tooltip text={`View ${getProposalPrefix(eip)}-${eip.id} specification`}>
                                        <a
                                          href={getSpecificationUrl(eip)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={() => handleExternalLinkClick('specification', getSpecificationUrl(eip))}
                                          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                        </a>
                                      </Tooltip>
                                      <CopyLinkButton
                                        sectionId={eipId}
                                        title={`Copy link to this section`}
                                        size="sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </header>

                            {/* Description */}
                            <div className="">
                              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                {parseMarkdownLinks(eip.laymanDescription)}
                              </p>

                              {/* Headliner Discussion Link (for headliners in regular sections) */}
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

                            {/* Benefits */}
                            <div className="mt-8 mb-8">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide">Key Benefits</h4>
                              <ul className="space-y-2">
                                {eip.benefits?.map((benefit, index) => (
                                  <li key={index} className="flex items-start text-sm">
                                    <span className="text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 text-xs">●</span>
                                    <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Stakeholder Impact */}
                            <div className="mt-8 mb-8">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide">Stakeholder Impact</h4>
                              <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  {Object.entries(eip.stakeholderImpacts || {}).map(([stakeholder, impact]) => {
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

                            {/* Trade-offs & Considerations */}
                            {eip.tradeoffs && eip.tradeoffs.length > 0 && (
                              <div className="mt-8 mb-8">
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
                            <div className="mt-8">
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
                          </article>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* EIPs Grouped by Stage */}
              {[
                { stage: 'Scheduled for Inclusion', description: 'EIPs that client teams have agreed to implement in the next upgrade devnet. These are very likely to be included in the final upgrade.' },
                { stage: 'Considered for Inclusion', description: 'EIPs that client teams are positive towards. Implementation may begin, but inclusion is not yet guaranteed.' },
                { stage: 'Proposed for Inclusion', description: 'EIPs that have been proposed for this upgrade but are still under initial review by client teams.' },
                { stage: 'Declined for Inclusion', description: 'EIPs that were proposed, but ultimately declined for inclusion in the upgrade for various reasons. They may be reconsidered for future upgrades.' }
              ].map(({ stage, description }) => {
                let stageEips = eips.filter(eip => getInclusionStage(eip, forkName) === stage);

                if (stageEips.length === 0) return null;

                // For Glamsterdam, hide all regular EIP sections since we only want to show headliner proposals
                if (forkName.toLowerCase() === 'glamsterdam') {
                  return null;
                }

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
                                    <Tooltip text={`View ${getProposalPrefix(eip)}-${eip.id} specification`}>
                                      <a
                                        href={getSpecificationUrl(eip)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => handleExternalLinkClick('specification', getSpecificationUrl(eip))}
                                        className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      </a>
                                    </Tooltip>
                                    {eip.discussionLink && (
                                      <Tooltip text={`View ${getProposalPrefix(eip)}-${eip.id} discussion`}>
                                        <a
                                          href={eip.discussionLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={() => handleExternalLinkClick('discussion', eip.discussionLink)}
                                          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                          </svg>
                                        </a>
                                      </Tooltip>
                                    )}
                                    <CopyLinkButton
                                      sectionId={eipId}
                                      title={`Copy link to this section`}
                                      size="sm"
                                    />
                                  </div>
                                </div>
                              </article>
                            );
                          }

                          // Full view for non-declined EIPs
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
                                    <div className="flex items-center gap-3">
                                      <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 leading-tight">
                                        {isHeadliner(eip, forkName) && (
                                          <Tooltip
                                            text={forkName.toLowerCase() === 'glamsterdam'
                                              ? "Competing headliner proposal for this network upgrade"
                                              : "Headliner feature of this network upgrade"
                                            }
                                            className="inline-block cursor-pointer"
                                          >
                                            <span
                                              className="text-purple-400 hover:text-purple-600 dark:text-purple-500 dark:hover:text-purple-400 mr-2 transition-colors cursor-help"
                                            >
                                              {forkName.toLowerCase() === 'glamsterdam' ? '☆' : '★'}
                                            </span>
                                          </Tooltip>
                                        )}
                                        <span className="text-slate-400 dark:text-slate-500 text-sm font-mono mr-2 relative -top-px">{getProposalPrefix(eip)}-{eip.id}</span>
                                        <span>{getLaymanTitle(eip)}</span>
                                      </h3>
                                      {isHeadliner(eip, forkName) && getHeadlinerLayer(eip, forkName) && (
                                        <Tooltip
                                          text={getHeadlinerLayer(eip, forkName) === 'EL' ? 'Primarily impacts Execution Layer' : 'Primarily impacts Consensus Layer'}
                                          className="inline-block"
                                        >
                                          <span className={`px-2 py-1 text-xs font-medium rounded ml-2 relative -top-px ${
                                            getHeadlinerLayer(eip, forkName) === 'EL'
                                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-600'
                                              : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-600'
                                          }`}>
                                            {getHeadlinerLayer(eip, forkName)}
                                          </span>
                                        </Tooltip>
                                      )}
                                      <div className="flex items-center gap-2 relative top-0.5">
                                        <Tooltip text={`View ${getProposalPrefix(eip)}-${eip.id} specification`}>
                                          <a
                                            href={getSpecificationUrl(eip)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => handleExternalLinkClick('specification', getSpecificationUrl(eip))}
                                            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                          </a>
                                        </Tooltip>
                                        <CopyLinkButton
                                          sectionId={eipId}
                                          title={`Copy link to this section`}
                                          size="sm"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </header>

                              {/* Description */}
                              <div className="">
                                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                  {parseMarkdownLinks(eip.laymanDescription)}
                                </p>

                                {/* Headliner Discussion Link (for headliners in regular sections) */}
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

                              {/* Benefits */}
                              <div className="mt-8 mb-8">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide">Key Benefits</h4>
                                <ul className="space-y-2">
                                  {eip.benefits?.map((benefit, index) => (
                                    <li key={index} className="flex items-start text-sm">
                                      <span className="text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 text-xs">●</span>
                                      <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Stakeholder Impact */}
                              <div className="mt-8 mb-8">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide">Stakeholder Impact</h4>
                                <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-4">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {Object.entries(eip.stakeholderImpacts || {}).map(([stakeholder, impact]) => {
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

                              {/* Trade-offs & Considerations */}
                              {eip.tradeoffs && eip.tradeoffs.length > 0 && (
                                <div className="mt-8 mb-8">
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
                              <div className="mt-8">
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
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
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