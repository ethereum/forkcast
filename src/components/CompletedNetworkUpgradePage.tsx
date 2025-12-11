import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import eipsData from '../data/eips.json';
import { useMetaTags } from '../hooks/useMetaTags';
import { useAnalytics } from '../hooks/useAnalytics';
import { EIP } from '../types';
import {
  getInclusionStage,
  isHeadliner,
  getLaymanTitle,
  getProposalPrefix,
  getSpecificationUrl,
  getEipLayer,
} from '../utils';
import { getUpgradeStatusColor } from '../utils/colors';
import { Tooltip, CopyLinkButton } from './ui';
import ThemeToggle from './ui/ThemeToggle';
import {
  NetworkUpgradeTimeline,
  TableOfContents,
  CompletedOverviewSection,
  EipCard,
} from './network-upgrade';

interface CompletedNetworkUpgradePageProps {
  forkName: string;
  displayName: string;
  description: string;
  status: string;
  activationDate: string;
  activationEpoch?: number;
  metaEipLink?: string;
}

const CompletedNetworkUpgradePage: React.FC<CompletedNetworkUpgradePageProps> = ({
  forkName,
  displayName,
  description,
  status,
  activationDate,
  activationEpoch,
  metaEipLink,
}) => {
  const [eips, setEips] = useState<EIP[]>([]);
  const [activeSection, setActiveSection] = useState<string>('overview');
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
    const filteredEips = eipsData.filter((eip) =>
      eip.forkRelationships.some(
        (fork) => fork.forkName.toLowerCase() === forkName.toLowerCase()
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
    const hash = location.hash.substring(1);
    if (hash) {
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
        rootMargin: '0px',
      }
    );

    const sections = document.querySelectorAll('[data-section]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, [eips]);

  // Get included EIPs
  const includedEips = eips.filter(
    (eip) => getInclusionStage(eip, forkName) === 'Included'
  );

  // Sort EIPs: headliners first, then by EIP number
  const sortedIncludedEips = includedEips.sort((a, b) => {
    const aIsHeadliner = isHeadliner(a, forkName);
    const bIsHeadliner = isHeadliner(b, forkName);

    if (aIsHeadliner && !bIsHeadliner) return -1;
    if (!aIsHeadliner && bIsHeadliner) return 1;

    return a.id - b.id;
  });

  // Generate TOC items for completed upgrade - simpler structure
  const tocItems = [
    {
      id: 'overview',
      label: 'Overview',
      type: 'section' as const,
      count: null as number | null,
    },
    {
      id: 'included',
      label: 'Included',
      type: 'section' as const,
      count: includedEips.length,
    },
    // Individual EIP items
    ...sortedIncludedEips.map((eip) => {
      const isHeadlinerEip = isHeadliner(eip, forkName);
      const proposalPrefix = getProposalPrefix(eip);
      const layer = getEipLayer(eip, forkName);

      return {
        id: `eip-${eip.id}`,
        label: `${isHeadlinerEip ? '★ ' : ''}${proposalPrefix}-${eip.id}: ${getLaymanTitle(eip)}${layer ? ` (${layer})` : ''}`,
        type: 'eip' as const,
        count: null as number | null,
      };
    }),
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            <Link
              to="/"
              className="text-3xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight"
            >
              Forkcast
            </Link>
            <ThemeToggle />
          </div>
          <Link
            to="/"
            className="text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 mb-6 inline-block text-sm font-medium"
          >
            ← All Network Upgrades
          </Link>

          <div className="border-b border-slate-200 dark:border-slate-700 pb-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">
                    {displayName}
                  </h1>
                  <CopyLinkButton
                    sectionId="upgrade"
                    title="Copy link to this upgrade"
                  />
                </div>
                <p className="text-base text-slate-600 dark:text-slate-300 mb-2 leading-relaxed max-w-2xl">
                  {description}
                </p>
                {metaEipLink && (
                  <div className="mb-4">
                    <a
                      href={metaEipLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        handleExternalLinkClick('meta_eip_discussion', metaEipLink)
                      }
                      className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2 transition-colors"
                    >
                      View Meta EIP Discussion
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
              <div className="mt-6 lg:mt-0">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded ${getUpgradeStatusColor(status)}`}
                >
                  {status}
                </span>
              </div>
            </div>

            <div className="mt-2">
              <p className="text-xs text-slate-400 dark:text-slate-500 italic max-w-xl">
                Forkcast is an ongoing experiment by the Protocol Support team to
                make the network upgrade process more accessible. Have feedback?
                Contact{' '}
                <a
                  href="mailto:nixo@ethereum.org"
                  onClick={() =>
                    handleExternalLinkClick('email_contact', 'mailto:nixo@ethereum.org')
                  }
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline decoration-1 underline-offset-2"
                >
                  nixo
                </a>{' '}
                or{' '}
                <a
                  href="https://x.com/wolovim"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    handleExternalLinkClick('twitter_contact', 'https://x.com/wolovim')
                  }
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

        <div className="flex gap-8">
          <TableOfContents
            items={tocItems}
            activeSection={activeSection}
            onSectionClick={scrollToSection}
          />

          <div className="flex-1 min-w-0">
            <div className="space-y-8">
              <CompletedOverviewSection
                eips={eips}
                forkName={forkName}
                activationDate={activationDate}
                activationEpoch={activationEpoch}
                onStageClick={scrollToSection}
              />

              {/* Included EIPs Section */}
              {sortedIncludedEips.length > 0 && (
                <div className="space-y-6" id="included" data-section>
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">
                        Included
                      </h2>
                      <span className="px-2 py-1 text-xs font-medium rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                        {sortedIncludedEips.length} EIP
                        {sortedIncludedEips.length !== 1 ? 's' : ''}
                      </span>
                      <CopyLinkButton
                        sectionId="included"
                        title="Copy link to Included"
                        size="sm"
                      />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
                      EIPs that are part of the activated upgrade on mainnet.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {sortedIncludedEips.map((eip) => {
                      if (!eip.laymanDescription) {
                        // Simplified view for EIPs without layman description
                        const eipId = `eip-${eip.id}`;
                        return (
                          <article
                            key={eip.id}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-4"
                            id={eipId}
                            data-section
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 leading-tight mb-2">
                                  <span className="text-slate-400 dark:text-slate-500 text-sm font-mono mr-2">
                                    {getProposalPrefix(eip)}-{eip.id}
                                  </span>
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
                                      onClick={() =>
                                        handleExternalLinkClick(
                                          'discussion',
                                          eip.discussionLink
                                        )
                                      }
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
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                          />
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
                                    onClick={() =>
                                      handleExternalLinkClick(
                                        'specification',
                                        getSpecificationUrl(eip)
                                      )
                                    }
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
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                        />
                                      </svg>
                                    </div>
                                  </a>
                                </Tooltip>
                              </div>
                            </div>
                          </article>
                        );
                      }

                      return (
                        <EipCard
                          key={eip.id}
                          eip={eip}
                          forkName={forkName}
                          handleExternalLinkClick={handleExternalLinkClick}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {eips.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  No improvements found for this network upgrade.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompletedNetworkUpgradePage;


