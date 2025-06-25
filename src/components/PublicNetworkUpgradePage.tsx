import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import eipsData from '../data/eips.json';
import { networkUpgrades } from '../data/upgrades';
import { useMetaTags } from '../hooks/useMetaTags';

interface ForkRelationship {
  forkName: string;
  status: string;
  isHeadliner?: boolean;
  headlinerDiscussionLink?: string;
}

interface EIP {
  id: number;
  title: string;
  status: string;
  description: string;
  author: string;
  type: string;
  category: string;
  createdDate: string;
  discussionLink: string;
  forkRelationships: ForkRelationship[];
  laymanDescription?: string;
  northStars?: string[];
  northStarAlignment?: {
    scaleL1?: { impact: string, description: string };
    scaleBlobs?: { impact: string, description: string };
    improveUX?: { impact: string, description: string };
  };
  stakeholderImpacts?: {
    endUsers: { impact: string, description: string };
    appDevs: { impact: string, description: string };
    walletDevs: { impact: string, description: string };
    toolingInfra: { impact: string, description: string };
    layer2s: { impact: string, description: string };
    stakersNodes: { impact: string, description: string };
    clClients: { impact: string, description: string };
    elClients: { impact: string, description: string };
  };
  benefits?: string[];
  tradeoffs?: string[];
}

interface PublicNetworkUpgradePageProps {
  forkName: string;
  displayName: string;
  description: string;
  status: string;
  metaEipLink?: string;
}

const PublicNetworkUpgradePage: React.FC<PublicNetworkUpgradePageProps> = ({
  forkName,
  displayName,
  description,
  status,
  metaEipLink
}) => {
  const [eips, setEips] = useState<EIP[]>([]);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const location = useLocation();

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

  // Helper function to get inclusion stage from fork relationship
  const getInclusionStage = (eip: EIP): string => {
    const forkRelationship = eip.forkRelationships.find(fork => 
      fork.forkName.toLowerCase() === forkName.toLowerCase()
    );
    
    if (!forkRelationship) return 'Unknown';
    
    switch (forkRelationship.status) {
      case 'Proposed':
        return 'Proposed for Inclusion';
      case 'Considered':
        return 'Considered for Inclusion';
      case 'Scheduled':
        return 'Scheduled for Inclusion';
      case 'Declined':
        return 'Declined for Inclusion';
      case 'Included':
        return 'Included';
      default:
        return 'Unknown';
    }
  };

  // Helper function to get headliner discussion link for this fork
  const getHeadlinerDiscussionLink = (eip: EIP): string | null => {
    const forkRelationship = eip.forkRelationships.find(fork => 
      fork.forkName.toLowerCase() === forkName.toLowerCase()
    );
    return forkRelationship?.headlinerDiscussionLink || null;
  };

  // Helper function to check if EIP is headliner for this fork
  const isHeadliner = (eip: EIP): boolean => {
    const forkRelationship = eip.forkRelationships.find(fork => 
      fork.forkName.toLowerCase() === forkName.toLowerCase()
    );
    return forkRelationship?.isHeadliner || false;
  };

  // Helper function to get layman title (use title if no layman description)
  const getLaymanTitle = (eip: EIP): string => {
    return eip.title.replace(/^EIP-\d+:\s*/, '');
  };

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

  const getInclusionStageColor = (stage: string) => {
    switch (stage) {
      case 'Proposed for Inclusion':
        return 'bg-slate-100 text-slate-700';
      case 'Considered for Inclusion':
        return 'bg-slate-200 text-slate-700';
      case 'Scheduled for Inclusion':
        return 'bg-yellow-50 text-yellow-700';
      case 'Declined for Inclusion':
        return 'bg-red-50 text-red-700';
      case 'Included':
        return 'bg-emerald-50 text-emerald-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getUpgradeStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-100 text-emerald-800';
      case 'Upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'Planning':
        return 'bg-purple-100 text-purple-800';
      case 'Research':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  };

  // Generate TOC items
  const tocItems = [
    { id: 'overview', label: 'Overview', type: 'section' as const, count: null as number | null },
    // Add headliner proposals section for forks with multiple headliners
    ...(forkName.toLowerCase() === 'glamsterdam' && eips.filter(eip => isHeadliner(eip)).length > 1 ? [
      {
        id: 'headliner-proposals',
        label: 'Headliner Proposals',
        type: 'section' as const,
        count: eips.filter(eip => isHeadliner(eip)).length
      },
      ...eips
        .filter(eip => isHeadliner(eip))
        .sort((a, b) => a.id - b.id)
        .map(eip => ({
          id: `eip-${eip.id}`,
          label: `☆ EIP-${eip.id}: ${getLaymanTitle(eip)}`,
          type: 'eip' as const,
          count: null as number | null
        }))
    ] : []),
    ...['Scheduled for Inclusion', 'Considered for Inclusion', 'Proposed for Inclusion', 'Declined for Inclusion']
      .flatMap(stage => {
        // For Glamsterdam, exclude headliners from "Proposed for Inclusion" since they have their own section
        const stageEips = eips.filter(eip => {
          const matchesStage = getInclusionStage(eip) === stage;
          if (forkName.toLowerCase() === 'glamsterdam' && stage === 'Proposed for Inclusion') {
            return matchesStage && !isHeadliner(eip);
          }
          return matchesStage;
        });
        
        if (stageEips.length === 0) return [];
        
        // Sort EIPs: headliners first, then by EIP number
        const sortedEips = stageEips.sort((a, b) => {
          const aIsHeadliner = isHeadliner(a);
          const bIsHeadliner = isHeadliner(b);
          
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
        
        const eipItems = sortedEips.map(eip => {
          const isHeadlinerEip = isHeadliner(eip);
          const starSymbol = forkName.toLowerCase() === 'glamsterdam' ? '☆' : '★';
          
          return {
            id: `eip-${eip.id}`,
            label: `${isHeadlinerEip ? `${starSymbol} ` : ''}EIP-${eip.id}: ${getLaymanTitle(eip)}`,
            type: 'eip' as const,
            count: null as number | null
          };
        });
        
        return [stageItem, ...eipItems];
      })
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

  const copyLinkToClipboard = (sectionId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSection(sectionId);
      // Clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedSection(null);
      }, 2000);
    }).catch(() => {
      // Fallback for browsers that don't support clipboard API
      console.log('Failed to copy link');
    });
  };

  const Tooltip: React.FC<{ children: React.ReactNode; text: string; className?: string }> = ({ 
    children, 
    text, 
    className = '' 
  }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    return (
      <div 
        className={`relative ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        {isVisible && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 animate-in fade-in duration-150">
            {text}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-900"></div>
          </div>
        )}
      </div>
    );
  };

  const CopyLinkButton: React.FC<{ sectionId: string; title: string; size?: 'sm' | 'md' }> = ({ 
    sectionId, 
    title, 
    size = 'md' 
  }) => {
    const isCopied = copiedSection === sectionId;
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
    
    return (
      <div className="relative">
        <Tooltip text={isCopied ? "Copied!" : title}>
          <button
            onClick={() => copyLinkToClipboard(sectionId)}
            className={`transition-colors cursor-pointer ${
              isCopied 
                ? 'text-emerald-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {isCopied ? (
              <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </button>
        </Tooltip>
      </div>
    );
  };

  // Timeline component
  const NetworkUpgradeTimeline: React.FC<{ currentForkName: string }> = ({ currentForkName }) => {
    const currentForkId = currentForkName.toLowerCase();
    const upgrades = networkUpgrades;

    // Find the index for 'we are here' (between last Active and first Upcoming)
    const activeIdx = upgrades.findIndex(u => u.status === 'Active');
    const upcomingIdx = upgrades.findIndex(u => u.status === 'Upcoming');

    // Position for 'we are here' marker (between upgrades)
    let markerPercent = 50;
    if (activeIdx !== -1 && upcomingIdx !== -1) {
      // Calculate position between the last active and first upcoming upgrade
      const totalUpgrades = upgrades.length;
      const activePosition = (activeIdx / (totalUpgrades - 1)) * 100;
      const upcomingPosition = (upcomingIdx / (totalUpgrades - 1)) * 100;
      // Move marker further right by weighting towards the upcoming position
      markerPercent = (activePosition * 0.25 + upcomingPosition * 0.7);
    }

    const timelineHeight = 24;

    return (
      <div className="mb-6 hidden sm:block">
        <div className="bg-white border border-slate-200 rounded px-6 py-4 relative overflow-visible min-h-[60px]">
          {/* Timeline line with rounded end caps and muted gradient */}
          <svg className="absolute left-0 right-0" style={{ top: '50%', height: timelineHeight, width: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'visible', transform: 'translateY(-50%)' }} viewBox="0 0 100 14" preserveAspectRatio="none">
            <defs>
              <linearGradient id="timeline-gradient" x1="6" y1="6" x2="94" y2="6" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#e0e7ff" /> {/* indigo-100 */}
                <stop offset="100%" stopColor="#bae6fd" /> {/* cyan-100 */}
              </linearGradient>
            </defs>
            {/* Main line with rounded end caps */}
            <line x1="4" y1="8" x2="94" y2="8" stroke="url(#timeline-gradient)" strokeWidth="2" strokeLinecap="round" opacity="1" />
            {/* Smaller arrowhead at the end, flush with the box edge */}
            <g transform="translate(94,8)">
              <polygon points="0,-3 2,0 0,3" fill="#bae6fd" opacity="1" />
            </g>
          </svg>
          {/* Timeline upgrades as flex row, rounded boxes */}
          <div className="relative flex flex-row justify-between items-stretch w-full px-12" style={{ zIndex: 1, minHeight: timelineHeight }}>
            {upgrades.map((upgrade) => {
              const isCurrent = upgrade.id === currentForkId;
              let labelClass = 'text-slate-500 font-normal';
              let boxClass = 'bg-white border border-slate-200';
              let dateClass = 'text-xs text-slate-400';
              if (isCurrent) {
                labelClass = 'text-slate-900 font-semibold';
                boxClass = 'bg-white border border-purple-200 shadow-sm';
                dateClass = 'text-xs text-slate-500 font-medium';
              }
              
              const boxContent = (
                <div className={`px-3 py-1.5 rounded ${boxClass} mb-1 truncate max-w-[180px] text-center leading-tight flex flex-col items-center transition-all duration-200 ${!isCurrent ? 'hover:border-slate-300 hover:shadow-sm' : ''}`} style={{ position: 'relative', zIndex: 2 }}>
                  <span className={`${labelClass} text-xs mb-0.5 leading-tight`}>
                    {upgrade.name.replace(/ Upgrade$/, '')}
                  </span>
                  <span className={`text-xs ${dateClass}`}>{upgrade.activationDate}</span>
                </div>
              );

              return (
                <div key={upgrade.id} className="flex flex-col items-center flex-1 min-w-0" style={{ position: 'relative' }}>
                  {/* Make non-current upgrades clickable */}
                  {!isCurrent && upgrade.path ? (
                    <Link to={upgrade.path} className="block">
                      {boxContent}
                    </Link>
                  ) : (
                    boxContent
                  )}
                </div>
              );
            })}
          </div>
          {/* 'We are here' marker between upgrades - adjusted positioning */}
          {activeIdx !== -1 && upcomingIdx !== -1 && (
            <div
              className="absolute flex flex-col items-center z-20"
              style={{
                left: `calc(${markerPercent}% - 10px)`,
                top: '60%',
                transform: 'translateY(-50%)',
              }}
            >
              {/* Pulsing dot */}
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-200 opacity-40"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-300 border-2 border-purple-200"></span>
              </span>
              <div className="text-[10px] text-purple-300 font-medium mt-0.5 leading-tight text-center">
                <div>we are here</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6">
            <Link to="/" className="text-3xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight">
              Forkcast
            </Link>
          </div>
          <Link to="/" className="text-slate-600 hover:text-slate-800 mb-6 inline-block text-sm font-medium">
            ← All Network Upgrades
          </Link>

          <div className="border-b border-slate-200 pb-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-light text-slate-900 tracking-tight">{displayName}</h1>
                  <CopyLinkButton 
                    sectionId="upgrade" 
                    title="Copy link to this upgrade"
                  />
                </div>
                <p className="text-base text-slate-600 mb-2 leading-relaxed max-w-2xl">{description}</p>
                {metaEipLink && (
                  <div className="mb-4">
                    <a 
                      href={metaEipLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 underline decoration-1 underline-offset-2 transition-colors"
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
              <p className="text-xs text-slate-400 italic">
                An experiment by the Protocol & Application Support team · Have feedback? Contact{' '}
                <a
                  href="https://x.com/nixorokish"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-700 underline decoration-1 underline-offset-2"
                >
                  @nixorokish
                </a>
                {' '}or{' '}
                <a
                  href="https://x.com/wolovim"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-700 underline decoration-1 underline-offset-2"
                >
                  @wolovim
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Network Upgrade Timeline */}
        <NetworkUpgradeTimeline currentForkName={forkName} />

        {/* Main Content with TOC */}
        <div className="flex gap-8">
          {/* Table of Contents */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Contents</h3>
              <nav className="space-y-1">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full text-left rounded transition-colors ${
                      item.type === 'section' 
                        ? `px-3 py-2 text-sm ${
                            activeSection === item.id
                              ? 'bg-purple-100 text-purple-800 font-medium'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`
                        : `px-6 py-1.5 text-xs ${
                            activeSection === item.id
                              ? 'bg-purple-50 text-purple-700 font-medium'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={item.type === 'eip' ? 'truncate' : ''}>{item.label}</span>
                      {item.count && (
                        <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{item.count}</span>
                      )}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* EIPs */}
            <div className="space-y-8">
              {/* Overview Section */}
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
                            Glamsterdam is currently in the headliner proposal phase. Multiple major features are competing for inclusion, including 
                             ePBS, EVM64, Pureth, Delayed Execution, Block-level Access Lists, and FOCIL. The community is actively deciding which direction to prioritize. 
                            <a 
                              href="https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-amber-700 hover:text-amber-900 underline decoration-1 underline-offset-2 ml-1"
                            >
                              Follow the discussion →
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Headliner Options Overview */}
                    <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded">
                      <h4 className="font-medium text-purple-900 text-sm mb-4 flex items-center gap-2">
                        <span className="text-purple-600">★</span>
                        Competing Headliner Options
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {eips
                          .filter(eip => isHeadliner(eip))
                          .sort((a, b) => a.id - b.id)
                          .map(eip => {
                            if (!eip.laymanDescription) return null;
                            
                            return (
                              <button
                                key={eip.id}
                                onClick={() => scrollToSection(`eip-${eip.id}`)}
                                className="text-left p-3 bg-white border border-purple-200 rounded hover:border-purple-300 hover:shadow-sm transition-all duration-200 group"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-purple-900 text-sm group-hover:text-purple-700 transition-colors">
                                    EIP-{eip.id}: {getLaymanTitle(eip)}
                                  </h5>
                                  <svg className="w-4 h-4 text-purple-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                                  {eip.laymanDescription.length > 120 
                                    ? `${eip.laymanDescription.substring(0, 120)}...`
                                    : eip.laymanDescription
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { stage: 'Proposed for Inclusion', count: eips.filter(eip => getInclusionStage(eip) === 'Proposed for Inclusion').length, color: 'bg-slate-100 text-slate-700' },
                    { stage: 'Considered for Inclusion', count: eips.filter(eip => getInclusionStage(eip) === 'Considered for Inclusion').length, color: 'bg-slate-200 text-slate-700' },
                    { stage: 'Scheduled for Inclusion', count: eips.filter(eip => getInclusionStage(eip) === 'Scheduled for Inclusion').length, color: 'bg-yellow-50 text-yellow-700' },
                    { stage: 'Declined for Inclusion', count: eips.filter(eip => getInclusionStage(eip) === 'Declined for Inclusion').length, color: 'bg-red-50 text-red-800' }
                  ].map(({ stage, count, color }) => {
                    const stageId = stage.toLowerCase().replace(/\s+/g, '-');
                    const hasEips = count > 0;
                    
                    return (
                      <button
                        key={stage}
                        onClick={() => hasEips && scrollToSection(stageId)}
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
              </div>

              {/* Headliner Proposals Section (for Glamsterdam) */}
              {forkName.toLowerCase() === 'glamsterdam' && eips.filter(eip => isHeadliner(eip)).length > 1 && (
                <div className="space-y-6" id="headliner-proposals" data-section>
                  <div className="border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-medium text-slate-900">Headliner Proposals</h2>
                      <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-700">
                        {eips.filter(eip => isHeadliner(eip)).length} EIP{eips.filter(eip => isHeadliner(eip)).length !== 1 ? 's' : ''}
                      </span>
                      <CopyLinkButton
                        sectionId="headliner-proposals"
                        title="Copy link to headliner proposals"
                        size="sm"
                      />
                    </div>
                    <p className="text-sm text-slate-600 max-w-3xl">
                      Multiple major features are competing for inclusion as the headliner of this network upgrade. The community is actively deciding which direction to prioritize.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {eips
                      .filter(eip => isHeadliner(eip))
                      .sort((a, b) => a.id - b.id)
                      .map(eip => {
                        if (!eip.laymanDescription) return null;

                        const eipId = `eip-${eip.id}`;

                        return (
                          <article key={eip.id} className="bg-white border border-purple-200 rounded p-8 shadow-sm ring-1 ring-purple-100" id={eipId} data-section>
                            {/* Header */}
                            <header className="border-b border-slate-100 pb-6 mb-6">
                              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-medium text-slate-900 leading-tight">
                                      <Tooltip 
                                        text="Competing headliner proposal for this network upgrade"
                                        className="inline-block cursor-pointer"
                                      >
                                        <span className="text-purple-400 hover:text-purple-600 mr-2 transition-colors cursor-help">
                                          ☆
                                        </span>
                                      </Tooltip>
                                      <span className="text-slate-400 text-sm font-mono mr-2 relative -top-px">EIP-{eip.id}</span>
                                      <span>{getLaymanTitle(eip)}</span>
                                    </h3>
                                    <div className="flex items-center gap-2 relative top-0.5">
                                      <Tooltip text={`View EIP-${eip.id} specification`}>
                                        <a 
                                          href={`https://eips.ethereum.org/EIPS/eip-${eip.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
                            <div className="mb-8">
                              <p className="text-slate-700 text-sm leading-relaxed">
                                {eip.laymanDescription}
                              </p>

                              {/* Headliner Discussion Link (for headliners in regular sections) */}
                              {(() => {
                                const isHeadlinerEip = isHeadliner(eip);
                                const discussionLink = getHeadlinerDiscussionLink(eip);
                                return isHeadlinerEip && discussionLink && (
                                  <div className="mt-3">
                                    <a 
                                      href={discussionLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 underline decoration-1 underline-offset-2 transition-colors"
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

                            {/* North Star Goal Alignment */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">North Star Goal Alignment</h4>
                              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                                <div className="space-y-4">
                                  {eip.northStarAlignment?.scaleL1 && (
                                    <div className="bg-white border border-slate-200 rounded p-4">
                                      <h5 className="font-semibold text-slate-900 text-xs mb-3 border-b border-blue-200 pb-2">Scale L1</h5>
                                      <p className="text-slate-700 text-xs leading-relaxed">{eip.northStarAlignment.scaleL1.description}</p>
                                    </div>
                                  )}
                                  {eip.northStarAlignment?.scaleBlobs && (
                                    <div className="bg-white border border-slate-200 rounded p-4">
                                      <h5 className="font-semibold text-slate-900 text-xs mb-3 border-b border-purple-200 pb-2">Scale Blobs</h5>
                                      <p className="text-slate-700 text-xs leading-relaxed">{eip.northStarAlignment.scaleBlobs.description}</p>
                                    </div>
                                  )}
                                  {eip.northStarAlignment?.improveUX && (
                                    <div className="bg-white border border-slate-200 rounded p-4">
                                      <h5 className="font-semibold text-slate-900 text-xs mb-3 border-b border-emerald-200 pb-2">Improve UX</h5>
                                      <p className="text-slate-700 text-xs leading-relaxed">{eip.northStarAlignment.improveUX.description}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Stakeholder Impact */}
                            <div className="mb-8">
                              <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Stakeholder Impact</h4>
                              <div className="bg-slate-50 border border-slate-200 rounded p-4">
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
                                      <div key={stakeholder} className="bg-white border border-slate-200 rounded p-4">
                                        <h5 className="font-semibold text-slate-900 text-xs mb-3 border-b border-slate-100 pb-2">
                                          {stakeholderNames[stakeholder as keyof typeof stakeholderNames]}
                                        </h5>
                                        <p className="text-slate-700 text-xs leading-relaxed">{impact.description}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Benefits */}
                            <div className={eip.tradeoffs && eip.tradeoffs.length > 0 ? "mb-8" : ""}>
                              <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Key Benefits</h4>
                              <ul className="space-y-2">
                                {eip.benefits?.map((benefit, index) => (
                                  <li key={index} className="flex items-start text-sm">
                                    <span className="text-emerald-600 mr-3 mt-0.5 text-xs">●</span>
                                    <span className="text-slate-700">{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Trade-offs & Considerations */}
                            {eip.tradeoffs && eip.tradeoffs.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Trade-offs & Considerations</h4>
                                <ul className="space-y-2">
                                  {eip.tradeoffs.map((tradeoff, index) => (
                                    <li key={index} className="flex items-start text-sm">
                                      <span className="text-amber-600 mr-3 mt-0.5 text-xs">⚠</span>
                                      <span className="text-slate-700">{tradeoff}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
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
                { stage: 'Declined for Inclusion', description: 'EIPs that client teams have decided not to include in this upgrade. They may be reconsidered for future upgrades.' }
              ].map(({ stage, description }) => {
                const stageEips = eips.filter(eip => getInclusionStage(eip) === stage);
                
                if (stageEips.length === 0) return null;

                // Sort EIPs: headliners first, then by EIP number
                const sortedStageEips = stageEips.sort((a, b) => {
                  const aIsHeadliner = isHeadliner(a);
                  const bIsHeadliner = isHeadliner(b);
                  
                  // If one is headliner and other isn't, headliner comes first
                  if (aIsHeadliner && !bIsHeadliner) return -1;
                  if (!aIsHeadliner && bIsHeadliner) return 1;
                  
                  // If both are same type (both headliner or both not), sort by EIP number
                  return a.id - b.id;
                });

                const stageId = stage.toLowerCase().replace(/\s+/g, '-');

                return (
                  <div key={stage} className="space-y-6" id={stageId} data-section>
                    <div className="border-b border-slate-200 pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-medium text-slate-900">{stage}</h2>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getInclusionStageColor(stage)}`}>
                          {stageEips.length} EIP{stageEips.length !== 1 ? 's' : ''}
                        </span>
                        <CopyLinkButton 
                          sectionId={stageId} 
                          title={`Copy link to ${stage}`}
                          size="sm"
                        />
                      </div>
                      <p className="text-sm text-slate-600 max-w-3xl">{description}</p>
                    </div>

                    <div className="space-y-6">
                      {sortedStageEips.map(eip => {
                        if (!eip.laymanDescription) return null;

                        const eipId = `eip-${eip.id}`;

                        return (
                          <article key={eip.id} className={`bg-white border rounded p-8 ${
                            isHeadliner(eip) 
                              ? 'border-purple-200 shadow-sm ring-1 ring-purple-100' 
                              : 'border-slate-200'
                          }`} id={eipId} data-section>
                            {/* Header */}
                            <header className="border-b border-slate-100 pb-6 mb-6">
                              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-medium text-slate-900 leading-tight">
                                      {isHeadliner(eip) && (
                                        <Tooltip 
                                          text={forkName.toLowerCase() === 'glamsterdam' 
                                            ? "Competing headliner proposal for this network upgrade" 
                                            : "Headliner feature of this network upgrade"
                                          } 
                                          className="inline-block cursor-pointer"
                                        >
                                          <span 
                                            className="text-purple-400 hover:text-purple-600 mr-2 transition-colors cursor-help" 
                                          >
                                            {forkName.toLowerCase() === 'glamsterdam' ? '☆' : '★'}
                                          </span>
                                        </Tooltip>
                                      )}
                                      <span className="text-slate-400 text-sm font-mono mr-2 relative -top-px">EIP-{eip.id}</span>
                                      <span>{getLaymanTitle(eip)}</span>
                                    </h3>
                                    <div className="flex items-center gap-2 relative top-0.5">
                                      <Tooltip text={`View EIP-${eip.id} specification`}>
                                        <a 
                                          href={`https://eips.ethereum.org/EIPS/eip-${eip.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
                            <div className="mb-8">
                              <p className="text-slate-700 text-sm leading-relaxed">
                                {eip.laymanDescription}
                              </p>

                              {/* Headliner Discussion Link (for headliners in regular sections) */}
                              {(() => {
                                const isHeadlinerEip = isHeadliner(eip);
                                const discussionLink = getHeadlinerDiscussionLink(eip);
                                return isHeadlinerEip && discussionLink && (
                                  <div className="mt-3">
                                    <a 
                                      href={discussionLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 underline decoration-1 underline-offset-2 transition-colors"
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

                            {/* North Star Goal Alignment */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">North Star Goal Alignment</h4>
                              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                                <div className="space-y-4">
                                  {eip.northStarAlignment?.scaleL1 && (
                                    <div className="bg-white border border-slate-200 rounded p-4">
                                      <h5 className="font-semibold text-slate-900 text-xs mb-3 border-b border-blue-200 pb-2">Scale L1</h5>
                                      <p className="text-slate-700 text-xs leading-relaxed">{eip.northStarAlignment.scaleL1.description}</p>
                                    </div>
                                  )}
                                  {eip.northStarAlignment?.scaleBlobs && (
                                    <div className="bg-white border border-slate-200 rounded p-4">
                                      <h5 className="font-semibold text-slate-900 text-xs mb-3 border-b border-purple-200 pb-2">Scale Blobs</h5>
                                      <p className="text-slate-700 text-xs leading-relaxed">{eip.northStarAlignment.scaleBlobs.description}</p>
                                    </div>
                                  )}
                                  {eip.northStarAlignment?.improveUX && (
                                    <div className="bg-white border border-slate-200 rounded p-4">
                                      <h5 className="font-semibold text-slate-900 text-xs mb-3 border-b border-emerald-200 pb-2">Improve UX</h5>
                                      <p className="text-slate-700 text-xs leading-relaxed">{eip.northStarAlignment.improveUX.description}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Stakeholder Impact */}
                            <div className="mb-8">
                              <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Stakeholder Impact</h4>
                              <div className="bg-slate-50 border border-slate-200 rounded p-4">
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
                                      <div key={stakeholder} className="bg-white border border-slate-200 rounded p-4">
                                        <h5 className="font-semibold text-slate-900 text-xs mb-3 border-b border-slate-100 pb-2">
                                          {stakeholderNames[stakeholder as keyof typeof stakeholderNames]}
                                        </h5>
                                        <p className="text-slate-700 text-xs leading-relaxed">{impact.description}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Benefits */}
                            <div className={eip.tradeoffs && eip.tradeoffs.length > 0 ? "mb-8" : ""}>
                              <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Key Benefits</h4>
                              <ul className="space-y-2">
                                {eip.benefits?.map((benefit, index) => (
                                  <li key={index} className="flex items-start text-sm">
                                    <span className="text-emerald-600 mr-3 mt-0.5 text-xs">●</span>
                                    <span className="text-slate-700">{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Trade-offs & Considerations */}
                            {eip.tradeoffs && eip.tradeoffs.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Trade-offs & Considerations</h4>
                                <ul className="space-y-2">
                                  {eip.tradeoffs.map((tradeoff, index) => (
                                    <li key={index} className="flex items-start text-sm">
                                      <span className="text-amber-600 mr-3 mt-0.5 text-xs">⚠</span>
                                      <span className="text-slate-700">{tradeoff}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {eips.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-500 text-sm">No improvements found for this network upgrade.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicNetworkUpgradePage; 