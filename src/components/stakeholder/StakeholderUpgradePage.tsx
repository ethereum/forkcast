import React, { useEffect, useState } from 'react';
import { useSearchParams } from '../browserLocation';
import { eipsData } from '../../data/eips';
import { useAnalytics } from '../../hooks/useAnalytics';
import { EIP } from '../../types';
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
  const { trackUpgradeView, trackLinkClick } = useAnalytics();

  const currentOption = STAKEHOLDER_OPTIONS.find(o => o.key === selectedStakeholder)!;


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

  const sidebar = (
    <nav className="flex flex-row md:flex-col gap-1.5 md:gap-0.5 flex-wrap md:w-48 md:flex-shrink-0">
      {STAKEHOLDER_OPTIONS.map(option => (
        <button
          key={option.key}
          onClick={() => handleStakeholderChange(option.key)}
          className={`text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
            option.key === selectedStakeholder
              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {option.label}
        </button>
      ))}
    </nav>
  );

  const eipContent = (
    <>
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
    </>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {sidebar}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          EIPs that may affect <span className="font-semibold text-slate-900 dark:text-slate-100">{currentOption.label.toLowerCase()}</span>, grouped by inclusion certainty.
        </p>
        {eipContent}
      </div>
    </div>
  );
};
