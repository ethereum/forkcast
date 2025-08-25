import React from 'react';
import { EIP } from '../../types';
import {
  getInclusionStage,
  isHeadliner,
  getLaymanTitle,
  getHeadlinerLayer,
  parseMarkdownLinks
} from '../../utils';
import { CopyLinkButton } from '../ui/CopyLinkButton';

interface HeadlinerOptionsProps {
  eips: EIP[];
  forkName: string;
  onOptionClick: (eipId: string) => void;
}

export const HeadlinerOptions: React.FC<HeadlinerOptionsProps> = ({
  eips,
  forkName,
  onOptionClick
}) => {
  const headlinerEips = eips.filter(eip => isHeadliner(eip, forkName));

  if (headlinerEips.length === 0) return null;

  return (
    <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-200 dark:border-purple-600 rounded" id="headliner-options" data-section>
      <h4 className="font-medium text-purple-900 dark:text-purple-100 text-sm mb-4 flex items-center gap-2">
        <span className="text-purple-600 dark:text-purple-400">★</span>
        Competing Headliner Options
        <div className="flex items-center relative top-0.5">
          <CopyLinkButton
            sectionId="headliner-options"
            title="Copy link to headliner options"
            size="sm"
          />
        </div>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {headlinerEips
          .sort((a, b) => {
            const stageA = getInclusionStage(a, forkName);
            const stageB = getInclusionStage(b, forkName);

            // Sort by inclusion status first (SFI, then CFI, then others)
            const statusOrder: Record<string, number> = {
              'Scheduled for Inclusion': 0,
              'Considered for Inclusion': 1,
              'Proposed for Inclusion': 2
            };
            const orderA = statusOrder[stageA] ?? 3;
            const orderB = statusOrder[stageB] ?? 3;

            if (orderA !== orderB) return orderA - orderB;

            // Then sort by layer (EL before CL)
            const layerA = getHeadlinerLayer(a, forkName);
            const layerB = getHeadlinerLayer(b, forkName);
            if (layerA === 'EL' && layerB === 'CL') return -1;
            if (layerA === 'CL' && layerB === 'EL') return 1;

            // Finally sort by EIP number
            return a.id - b.id;
          })
          .map(eip => {
            if (!eip.laymanDescription) return null;

            const layer = getHeadlinerLayer(eip, forkName);
            const inclusionStage = getInclusionStage(eip, forkName);

            // Determine SFI/CFI status
            const statusLabel = inclusionStage === 'Scheduled for Inclusion' ? 'Scheduled'
              : inclusionStage === 'Considered for Inclusion' ? 'Considered'
              : null;

            // Enhanced styling hierarchy: Scheduled gets full treatment, Considered gets moderate, others minimal
            const isMainHeadliner = statusLabel === 'Scheduled';
            const isConsidered = statusLabel === 'Considered';

            const cardClass = isMainHeadliner
              ? "text-left p-4 bg-gradient-to-br from-white to-emerald-50 dark:from-slate-700 dark:to-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-500 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group ring-1 ring-emerald-100 dark:ring-emerald-800"
              : isConsidered
                ? "text-left p-3 bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-600 rounded hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-sm transition-all duration-200 group"
                : "text-left p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm transition-all duration-200 group opacity-75 hover:opacity-100";

            return (
              <button
                key={eip.id}
                onClick={() => onOptionClick(`eip-${eip.id}`)}
                className={`${cardClass} relative cursor-pointer overflow-hidden`}
              >
                {/* Status Corner Flag */}
                {statusLabel && (
                  <div className={`absolute px-3 py-1 text-xs font-bold text-white rounded-tr-lg rounded-bl-lg shadow-sm ${
                    statusLabel === 'Scheduled'
                      ? '-top-px -right-px bg-emerald-500 dark:bg-emerald-500'
                      : '-top-0.5 -right-0.5 bg-amber-500 dark:bg-amber-500'
                  }`}>
                    {statusLabel}
                  </div>
                )}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      {layer && (
                        <span
                          key={layer}
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            layer === 'EL'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-600'
                              : 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 border-teal-200 dark:border-teal-600'
                          }`}
                        >
                          {layer}
                        </span>
                      )}
                    </div>
                    <h5 className={`font-medium text-sm transition-colors ${
                      isMainHeadliner
                        ? 'text-emerald-900 dark:text-emerald-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 font-semibold'
                        : isConsidered
                        ? 'text-slate-800 dark:text-slate-200 group-hover:text-slate-700 dark:group-hover:text-slate-100'
                        : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                    }`}>
                      EIP-{eip.id}: {getLaymanTitle(eip)}
                    </h5>
                  </div>
                </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                {eip.laymanDescription.length > 120
                  ? parseMarkdownLinks(eip.laymanDescription.substring(0, 120) + '...')
                  : parseMarkdownLinks(eip.laymanDescription)
                }
              </p>
              </button>
            );
          })}
      </div>
      <p className="text-xs text-purple-700 dark:text-purple-300 mt-4 italic">
        Click any option above to jump to its detailed analysis below.
      </p>
    </div>
  );
};

