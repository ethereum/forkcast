import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { eipsData } from '../../data/eips';
import { Logo } from '../ui/Logo';
import { useMetaTags } from '../../hooks/useMetaTags';
import { useAnalytics } from '../../hooks/useAnalytics';
import { EIP } from '../../types';
import ThemeToggle from '../ui/ThemeToggle';
import { StakeholderEipCard } from './StakeholderEipCard';
import { filterEipsForStakeholder, groupByInclusionStage } from '../../utils/stakeholder';

const STAKEHOLDER_OPTIONS = [
  { key: 'appDevs', label: 'App Developers' },
  { key: 'walletDevs', label: 'Wallet Developers' },
  { key: 'endUsers', label: 'End Users' },
  { key: 'layer2s', label: 'Layer 2s' },
  { key: 'stakersNodes', label: 'Stakers & Node Operators' },
  { key: 'toolingInfra', label: 'Tooling & Infrastructure' },
] as const;

type StakeholderKey = typeof STAKEHOLDER_OPTIONS[number]['key'];

interface StakeholderUpgradePageProps {
  forkName: string;
}

export const StakeholderUpgradePage: React.FC<StakeholderUpgradePageProps> = ({ forkName }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as StakeholderKey | null;
  const [selectedStakeholder, setSelectedStakeholder] = useState<StakeholderKey>(
    viewParam && STAKEHOLDER_OPTIONS.some(o => o.key === viewParam) ? viewParam : 'appDevs'
  );
  const [eips, setEips] = useState<EIP[]>([]);
  const [isPfiExpanded, setIsPfiExpanded] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { trackUpgradeView, trackLinkClick } = useAnalytics();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = STAKEHOLDER_OPTIONS.find(o => o.key === selectedStakeholder)!;

  useMetaTags({
    title: `${forkName} for ${currentOption.label} - Forkcast`,
    description: `EIPs relevant to ${currentOption.label.toLowerCase()} in the ${forkName} network upgrade.`,
    url: `https://forkcast.org/upgrade/${forkName.toLowerCase()}/stakeholders?view=${selectedStakeholder}`,
  });

  useEffect(() => {
    const filtered = filterEipsForStakeholder(eipsData, forkName, selectedStakeholder);
    setEips(filtered);
    setIsPfiExpanded(false);
  }, [forkName, selectedStakeholder]);

  useEffect(() => {
    trackUpgradeView(`${forkName}-${selectedStakeholder}`);
  }, [forkName, selectedStakeholder, trackUpgradeView]);

  const handleStakeholderChange = (key: StakeholderKey) => {
    setSelectedStakeholder(key);
    setSearchParams({ view: key });
  };

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  const grouped = groupByInclusionStage(eips, forkName);
  const totalCount = eips.length;
  const sortByEipId = (eipList: EIP[]) => [...eipList].sort((a, b) => a.id - b.id);

  const sections = [
    {
      id: 'sfi',
      title: 'Scheduled for Inclusion',
      hint: 'Nearly certain. Plan accordingly.',
      eips: sortByEipId(grouped.sfi),
      accentColor: 'border-emerald-400 dark:border-emerald-500',
      countColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'cfi',
      title: 'Considered for Inclusion',
      hint: 'Likely but not guaranteed.',
      eips: sortByEipId(grouped.cfi),
      accentColor: 'border-amber-400 dark:border-amber-500',
      countColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'pfi',
      title: 'Proposed for Inclusion',
      hint: 'Still being evaluated.',
      eips: sortByEipId(grouped.pfi),
      accentColor: 'border-blue-400 dark:border-blue-500',
      countColor: 'text-blue-600 dark:text-blue-400',
      collapsible: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-12 flex justify-between items-start">
            <Logo size="lg" />
            <ThemeToggle />
          </div>
          <Link
            to={`/upgrade/${forkName.toLowerCase()}`}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4 inline-block text-sm"
          >
            ← Back to {forkName}
          </Link>

          <h1 className="text-2xl font-light text-slate-900 dark:text-slate-100 tracking-tight mb-2">
            {forkName} for{' '}
            <div className="inline-block relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="font-light text-2xl border-b-2 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:border-purple-400 dark:hover:border-purple-500 transition-colors inline-flex items-baseline gap-1"
              >
                {currentOption.label}
                <svg
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-lg py-1 min-w-[200px] z-10">
                  {STAKEHOLDER_OPTIONS.map(option => (
                    <button
                      key={option.key}
                      onClick={() => {
                        handleStakeholderChange(option.key);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        option.key === selectedStakeholder
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            EIPs that may affect you, grouped by inclusion certainty.
          </p>
        </div>

        {/* Empty State */}
        {totalCount === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No EIPs with documented {currentOption.label.toLowerCase()} impact found for {forkName}.
            </p>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-8">
          {sections.map(({ id, title, hint, eips: sectionEips, accentColor, countColor, collapsible }) => {
            if (sectionEips.length === 0) return null;

            const isCollapsed = collapsible && !isPfiExpanded;

            return (
              <section key={id}>
                {/* Section header */}
                <div className={`border-l-4 ${accentColor} pl-4 mb-4`}>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                      {title}
                    </h2>
                    <span className={`text-sm ${countColor}`}>
                      ({sectionEips.length})
                    </span>
                    {collapsible && (
                      <button
                        onClick={() => setIsPfiExpanded(!isPfiExpanded)}
                        className="text-sm text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 ml-2"
                      >
                        {isPfiExpanded ? 'collapse' : 'expand'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {hint}
                  </p>
                </div>

                {/* EIP list */}
                {isCollapsed ? (
                  <button
                    onClick={() => setIsPfiExpanded(true)}
                    className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 pl-4"
                  >
                    {sectionEips.length} EIP{sectionEips.length !== 1 ? 's' : ''} under review →
                  </button>
                ) : (
                  <div className="pl-4">
                    {sectionEips.map(eip => (
                      <StakeholderEipCard
                        key={eip.id}
                        eip={eip}
                        stakeholderKey={selectedStakeholder}
                        handleExternalLinkClick={handleExternalLinkClick}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
