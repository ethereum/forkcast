import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NetworkUpgrade } from '../../data/upgrades';
import { FORK_PROGRESS_MAP } from '../../constants/timeline-phases';
import { getMacroPhaseForUpgrade, getMacroPhaseSummary } from '../../utils/macroPhase';
import MacroPhaseBar from './MacroPhaseBar';

interface UpgradeCarouselProps {
  upgrades: NetworkUpgrade[];
}

const UpgradeCarousel = ({ upgrades }: UpgradeCarouselProps) => {
  const visibleCount = 3;
  const maxIndex = Math.max(0, upgrades.length - visibleCount);
  const [currentIndex, setCurrentIndex] = useState(maxIndex);

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(Math.min(index, maxIndex));
  };

  const visibleUpgrades = upgrades.slice(currentIndex, currentIndex + visibleCount);

  const renderCard = (upgrade: NetworkUpgrade) => {
    const isLive = upgrade.status === 'Live';
    const progress = FORK_PROGRESS_MAP[upgrade.id];
    const macroPhase = getMacroPhaseForUpgrade(upgrade);
    const summary = getMacroPhaseSummary(upgrade, progress);

    const cardContent = (
      <div className="flex flex-col h-full">
        <h2
          className={`text-xl font-medium leading-tight mb-4 ${upgrade.disabled ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}
        >
          {upgrade.name}
        </h2>

        {/* Progress bar */}
        <div className="mb-4">
          <MacroPhaseBar currentPhase={macroPhase} shipped={isLive} />
        </div>

        <p
          className={`text-sm leading-relaxed flex-grow ${upgrade.disabled ? 'text-slate-400 dark:text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}
        >
          {summary}
        </p>

        <div
          className={`text-xs mt-4 ${upgrade.disabled ? 'text-slate-400 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <span className="font-medium">
            {isLive ? 'Activated:' : 'Target:'}
          </span>{' '}
          {upgrade.activationDate}
        </div>
      </div>
    );

    if (upgrade.disabled) {
      return (
        <div
          key={upgrade.path}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 opacity-60 cursor-not-allowed h-full"
        >
          {cardContent}
        </div>
      );
    } else {
      return (
        <Link
          key={upgrade.path}
          to={upgrade.path}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-md dark:hover:shadow-slate-700/20 hover:border-purple-300 dark:hover:border-purple-600 block h-full"
        >
          {cardContent}
        </Link>
      );
    }
  };

  const renderCompactCard = (upgrade: NetworkUpgrade) => {
    const isLive = upgrade.status === 'Live';
    const macroPhase = getMacroPhaseForUpgrade(upgrade);

    const cardContent = (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2
            className={`text-base font-medium truncate ${upgrade.disabled ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}
          >
            {upgrade.name}
          </h2>
          <div
            className={`text-xs shrink-0 ml-3 ${upgrade.disabled ? 'text-slate-400 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {upgrade.activationDate}
          </div>
        </div>
        <MacroPhaseBar currentPhase={macroPhase} shipped={isLive} />
      </div>
    );

    if (upgrade.disabled) {
      return (
        <div
          key={upgrade.path}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 opacity-60 cursor-not-allowed"
        >
          {cardContent}
        </div>
      );
    } else {
      return (
        <Link
          key={upgrade.path}
          to={upgrade.path}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 hover:shadow-md dark:hover:shadow-slate-700/20 hover:border-purple-300 dark:hover:border-purple-600 block"
        >
          {cardContent}
        </Link>
      );
    }
  };

  // Determine number of dots needed
  const dotCount = Math.max(1, upgrades.length - visibleCount + 1);

  return (
    <>
      {/* Desktop Carousel - hidden on mobile */}
      <div className="hidden lg:block">
        <div className="relative">
          {/* Left Arrow */}
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md transition-all duration-200 ${
              currentIndex === 0
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-lg cursor-pointer'
            }`}
            aria-label="Previous upgrades"
          >
            <svg
              className="w-5 h-5 text-slate-600 dark:text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Cards Grid */}
          <div className="grid grid-cols-3 gap-6">
            {visibleUpgrades.map((upgrade) => (
              <div key={upgrade.path} className="min-h-[220px]">
                {renderCard(upgrade)}
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          <button
            onClick={goToNext}
            disabled={currentIndex >= maxIndex}
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md transition-all duration-200 ${
              currentIndex >= maxIndex
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-lg cursor-pointer'
            }`}
            aria-label="Next upgrades"
          >
            <svg
              className="w-5 h-5 text-slate-600 dark:text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Dot Indicators */}
        {upgrades.length > visibleCount && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: dotCount }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  currentIndex === index
                    ? 'bg-slate-700 dark:bg-slate-300 w-4'
                    : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Compact List - hidden on desktop, reversed so newest is on top */}
      <div className="lg:hidden space-y-3">
        {[...upgrades].reverse().map((upgrade) => renderCompactCard(upgrade))}
      </div>
    </>
  );
};

export default UpgradeCarousel;
