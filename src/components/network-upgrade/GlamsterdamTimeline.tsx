import React from 'react';
import { GLAMSTERDAM_TIMELINE_PHASES } from '../../constants/timeline-phases';
import { getPhaseStatusIcon } from '../../utils/timeline';
import { getPhaseStatusColor } from '../../utils/colors';
import { useAnalytics } from '../../hooks/useAnalytics';

export const GlamsterdamTimeline: React.FC = () => {
  const phases = GLAMSTERDAM_TIMELINE_PHASES;
  const { trackLinkClick } = useAnalytics();

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  return (
    <div className="mb-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <div className="relative">
          {/* Vertical line */}
          {phases.length > 1 && (
            <div className="absolute left-5 top-5 bottom-12 w-0.5 bg-slate-200 dark:bg-slate-600" />
          )}

          <div className="space-y-8">
            {phases.map((phase) => (
              <div key={phase.id} className="flex items-start gap-4">
                {/* Status icon */}
                <div
                  className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                    getPhaseStatusColor(phase.status)
                  }`}
                >
                  {/* Opaque base background (masks the timeline line) */}
                  <div className="absolute inset-0 rounded-full bg-white dark:bg-slate-800" />
                  {/* Subtle colored background (restores the desired color) */}
                  <div className={`absolute inset-0 rounded-full ${
                    getPhaseStatusColor(phase.status).match(/(bg-\S+)|(dark:bg-\S+)/g)?.join(' ')
                  }`} />
                  <div className="relative">
                    {getPhaseStatusIcon(phase.status)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm mb-1">{phase.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">{phase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Source link */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
          <div className="flex items-start justify-between">
            <a
              href="https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleExternalLinkClick('timeline_discussion', 'https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195')}
              className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2 transition-colors"
            >
              View full timeline details on Ethereum Magicians
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};