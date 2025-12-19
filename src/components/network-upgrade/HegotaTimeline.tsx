import React from 'react';
import { HEGOTA_TIMELINE_PHASES } from '../../constants/timeline-phases';
import { getPhaseStatusIcon } from '../../utils/timeline';
import { getPhaseStatusColor } from '../../utils/colors';

export const HegotaTimeline: React.FC = () => {
  const phases = HEGOTA_TIMELINE_PHASES;

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
                <div className="flex-1 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm mb-1">{phase.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">{phase.description}</p>
                  </div>

                  {/* Date on the right */}
                  <div className="flex-shrink-0">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {phase.dateRange}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
