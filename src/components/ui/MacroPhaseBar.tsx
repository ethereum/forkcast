import { MACRO_PHASES } from '../../constants/timeline-phases';
import type { MacroPhase } from '../../constants/timeline-phases';
import { Tooltip } from './Tooltip';

interface MacroPhaseBarProps {
  currentPhase: MacroPhase;
  shipped?: boolean;
}

const PHASE_ORDER: MacroPhase[] = ['headliners', 'scoping', 'devnets', 'testnets', 'mainnet'];

const MacroPhaseBar = ({ currentPhase, shipped }: MacroPhaseBarProps) => {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  const currentLabel = shipped
    ? 'Live'
    : MACRO_PHASES[currentIndex]?.label;

  return (
    <div>
      <div className="flex gap-1 pb-2.5">
        {MACRO_PHASES.map((phase, index) => {
          let segmentClasses: string;

          if (shipped) {
            segmentClasses = 'bg-emerald-500 dark:bg-emerald-400';
          } else if (index < currentIndex) {
            segmentClasses = 'bg-emerald-500 dark:bg-emerald-400';
          } else if (index === currentIndex) {
            segmentClasses = 'bg-purple-500 dark:bg-purple-400';
          } else {
            segmentClasses = 'bg-slate-200 dark:bg-slate-700';
          }

          return (
            <div key={phase.id} className="flex-1 relative">
              <Tooltip text={phase.label} position="top" className="w-full">
                <div
                  className={`w-full h-2 rounded-full ${segmentClasses} transition-colors`}
                />
              </Tooltip>
              {((shipped && index === PHASE_ORDER.length - 1) || (!shipped && index === currentIndex)) && (
                <p className={`absolute mt-0.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap ${
                  index === 0 ? 'left-0' : index === PHASE_ORDER.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                }`}>
                  {currentLabel}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MacroPhaseBar;
