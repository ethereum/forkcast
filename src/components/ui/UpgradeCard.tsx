import React from 'react';
import { Link } from 'react-router-dom';
import { NetworkUpgrade } from '../../data/upgrades';
import { FORK_PROGRESS_MAP } from '../../constants/timeline-phases';
import { getMacroPhaseForUpgrade, getMacroPhaseSummary } from '../../utils/macroPhase';
import MacroPhaseBar from './MacroPhaseBar';

interface UpgradeCardProps {
  upgrade: NetworkUpgrade;
  className?: string;
}

const UpgradeCard: React.FC<UpgradeCardProps> = ({ upgrade, className = '' }) => {
  const isLive = upgrade.status === 'Live';
  const progress = FORK_PROGRESS_MAP[upgrade.id];
  const macroPhase = getMacroPhaseForUpgrade(upgrade);
  const summary = getMacroPhaseSummary(upgrade, progress);

  const cardContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <h2
          className={`text-xl font-medium leading-tight ${
            upgrade.disabled
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {upgrade.name}
        </h2>
        {upgrade.externalLink && (
          <svg className="w-4 h-4 shrink-0 mt-0.5 ml-2 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        )}
      </div>

      {!upgrade.hideProgressBar && (
        <div className="mb-4">
          <MacroPhaseBar currentPhase={macroPhase} shipped={isLive} />
        </div>
      )}

      <p
        className={`text-sm leading-relaxed flex-grow ${
          upgrade.disabled ? 'text-slate-400 dark:text-slate-400' : 'text-slate-600 dark:text-slate-300'
        }`}
      >
        {summary}
      </p>

      {upgrade.activationDate && (
        <div
          className={`text-xs mt-4 ${
            upgrade.disabled ? 'text-slate-400 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <span className="font-medium">{isLive ? 'Activated:' : 'Target:'}</span> {upgrade.activationDate}
        </div>
      )}
    </div>
  );

  const baseClasses =
    'group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 h-full block';
  const hoverClasses =
    'hover:shadow-md dark:hover:shadow-slate-700/20 hover:border-purple-300 dark:hover:border-purple-600';

  if (upgrade.disabled && upgrade.externalLink) {
    return (
      <a
        href={upgrade.externalLink}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClasses} ${hoverClasses} ${className}`}
      >
        {cardContent}
      </a>
    );
  }
  if (upgrade.disabled) {
    return (
      <div className={`${baseClasses} opacity-60 cursor-not-allowed ${className}`}>{cardContent}</div>
    );
  }
  return (
    <Link to={upgrade.path} className={`${baseClasses} ${hoverClasses} ${className}`}>
      {cardContent}
    </Link>
  );
};

export default UpgradeCard;
