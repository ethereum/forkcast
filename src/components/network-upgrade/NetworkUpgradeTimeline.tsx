import React from 'react';
import { Link } from 'react-router-dom';
import { networkUpgrades } from '../../data/upgrades';
import { calculateTimelineMarkerPosition } from '../../utils/timeline';

interface NetworkUpgradeTimelineProps {
  currentForkName: string;
}

export const NetworkUpgradeTimeline: React.FC<NetworkUpgradeTimelineProps> = ({ currentForkName }) => {
  const currentForkId = currentForkName.toLowerCase();
  const upgrades = networkUpgrades;

  // Calculate position for 'we are here' marker
  const markerPercent = calculateTimelineMarkerPosition(upgrades);
  const timelineHeight = 24;

  return (
    <div className="mb-6 hidden sm:block">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-6 py-4 relative overflow-visible min-h-[60px]">
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
            let labelClass = 'text-slate-500 dark:text-slate-400 font-normal';
            let boxClass = 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600';
            let dateClass = 'text-xs text-slate-400 dark:text-slate-500';
            if (isCurrent) {
              labelClass = 'text-slate-900 dark:text-slate-100 font-semibold';
              boxClass = 'bg-white dark:bg-slate-700 border border-purple-200 dark:border-purple-600 shadow-sm';
              dateClass = 'text-xs text-slate-500 dark:text-slate-400 font-medium';
            }

            const boxContent = (
              <div className={`px-3 py-1.5 rounded ${boxClass} mb-1 truncate max-w-[180px] text-center leading-tight flex flex-col items-center transition-all duration-200 ${
                !isCurrent
                  ? upgrade.disabled
                    ? 'cursor-not-allowed'
                    : 'hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-sm cursor-pointer'
                  : ''
              }`} style={{ position: 'relative', zIndex: 2 }}>
                  <span className={`${labelClass} text-xs mb-0.5 leading-tight`}>
                    {upgrade.name.replace(/ Upgrade$/, '')}
                  </span>
                  <span className={`text-xs ${dateClass}`}>{upgrade.activationDate}</span>
                </div>
            );

            return (
              <div key={upgrade.id} className="flex flex-col items-center flex-1 min-w-0" style={{ position: 'relative' }}>
                {/* Make non-current upgrades clickable only if not disabled */}
                {!isCurrent && upgrade.path && !upgrade.disabled ? (
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
        {markerPercent !== 50 && (
          <div
            className="absolute flex flex-col items-center z-20"
            style={{
              left: `calc(${markerPercent}%)`,
              top: '60%',
              transform: 'translateY(-50%)',
            }}
          >
            {/* Pulsing dot */}
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-200 dark:bg-purple-400 opacity-40"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-300 dark:bg-purple-400 border-2 border-purple-200 dark:border-purple-500"></span>
            </span>
            <div className="text-[10px] text-purple-300 dark:text-purple-400 font-medium mt-0.5 leading-tight text-center">
              <div>we are here</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};