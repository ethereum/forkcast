import React from 'react';
import type { EIP } from '../../types/eip';
import { stakeholderLabels } from '../../domain/eips/stakeholders';
import { parseMarkdownLinks } from '../../utils';

interface EipAnalysisSectionsProps {
  eip: EIP;
  /** Render "No benefits documented yet." placeholders instead of hiding empty sections. */
  showEmptyStates: boolean;
  onExternalLinkClick?: (linkType: string, url: string) => void;
}

/**
 * The narrative half of the EIP Analysis tab — everything a champion authors,
 * split out from `EipContent` so the field-by-field rendering stays readable
 * next to that component's tab, spec, and dependency machinery.
 */
export const EipAnalysisSections: React.FC<EipAnalysisSectionsProps> = ({
  eip,
  showEmptyStates,
  onExternalLinkClick,
}) => (
  <>
    {/* The champion's `laymanDescription`, headed neutrally because readers
        should not have to know the field name. */}
    {eip.laymanDescription && (
      <section>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wide">
          TL;DR
        </h3>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {parseMarkdownLinks(eip.laymanDescription)}
        </p>
      </section>
    )}

    {/* Supporting Documents */}
    {eip.supportingDocuments && eip.supportingDocuments.length > 0 && (
      <section className="bg-purple-50/50 dark:bg-purple-900/10 border-l-4 border-purple-500 rounded-r-lg p-4">
        <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3 uppercase tracking-wide">
          Resources
        </h3>
        <ul className="space-y-2">
          {eip.supportingDocuments.map((doc) => (
            <li key={doc.url}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onExternalLinkClick?.('supporting_document', doc.url)}
                className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2 transition-colors"
              >
                {doc.label}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </section>
    )}

    {/* Benefits */}
    {eip.benefits && eip.benefits.length > 0 ? (
      <section className="bg-emerald-50/50 dark:bg-emerald-900/10 border-l-4 border-emerald-500 rounded-r-lg p-4">
        <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-3 uppercase tracking-wide">
          Key Benefits
        </h3>
        <ul className="space-y-2">
          {eip.benefits.map((benefit, index) => (
            <li key={index} className="flex items-start text-sm">
              <span className="text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 text-xs">●</span>
              <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
            </li>
          ))}
        </ul>
      </section>
    ) : showEmptyStates ? (
      <section className="bg-slate-50 dark:bg-slate-700/30 border-l-4 border-slate-300 dark:border-slate-600 rounded-r-lg p-4">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
          Key Benefits
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          No benefits documented yet.
        </p>
      </section>
    ) : null}

    {/* Trade-offs */}
    {eip.tradeoffs && eip.tradeoffs.length > 0 ? (
      <section className="bg-amber-50/50 dark:bg-amber-900/10 border-l-4 border-amber-500 rounded-r-lg p-4">
        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3 uppercase tracking-wide">
          Trade-offs & Considerations
        </h3>
        <ul className="space-y-2">
          {eip.tradeoffs.map((tradeoff, index) => (
            <li key={index} className="flex items-start text-sm">
              <span className="text-amber-600 dark:text-amber-400 mr-3 mt-0.5 text-xs">●</span>
              <span className="text-slate-700 dark:text-slate-300">{tradeoff}</span>
            </li>
          ))}
        </ul>
      </section>
    ) : showEmptyStates ? (
      <section className="bg-slate-50 dark:bg-slate-700/30 border-l-4 border-slate-300 dark:border-slate-600 rounded-r-lg p-4">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
          Trade-offs & Considerations
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          No trade-offs documented yet.
        </p>
      </section>
    ) : null}

    {/* Stakeholder Impact */}
    {eip.stakeholderImpacts && Object.keys(eip.stakeholderImpacts).length > 0 && (
      <section>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
          Stakeholder Impact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(eip.stakeholderImpacts).map(([stakeholder, impact]) => (
            <div
              key={stakeholder}
              className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 overflow-hidden"
            >
              <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm mb-1">
                {stakeholderLabels[stakeholder] || stakeholder}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed break-words">
                {impact.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    )}

    {/* North Star Alignment */}
    {(eip.northStarAlignment?.scaleL1 ||
      eip.northStarAlignment?.scaleBlobs ||
      eip.northStarAlignment?.improveUX) && (
      <section className="bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-indigo-500 rounded-r-lg p-4">
        <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-3 uppercase tracking-wide">
          North Star Goal Alignment
        </h3>
        <ul className="space-y-2">
          {eip.northStarAlignment?.scaleL1 && (
            <li className="flex items-start text-sm">
              <span className="text-blue-600 dark:text-blue-400 mr-3 mt-0.5 text-xs">●</span>
              <span>
                <span className="font-medium text-blue-700 dark:text-blue-300">Scale L1:</span>{' '}
                <span className="text-slate-700 dark:text-slate-300">{eip.northStarAlignment.scaleL1.description}</span>
              </span>
            </li>
          )}
          {eip.northStarAlignment?.scaleBlobs && (
            <li className="flex items-start text-sm">
              <span className="text-purple-600 dark:text-purple-400 mr-3 mt-0.5 text-xs">●</span>
              <span>
                <span className="font-medium text-purple-700 dark:text-purple-300">Scale Blobs:</span>{' '}
                <span className="text-slate-700 dark:text-slate-300">{eip.northStarAlignment.scaleBlobs.description}</span>
              </span>
            </li>
          )}
          {eip.northStarAlignment?.improveUX && (
            <li className="flex items-start text-sm">
              <span className="text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 text-xs">●</span>
              <span>
                <span className="font-medium text-emerald-700 dark:text-emerald-300">Improve UX:</span>{' '}
                <span className="text-slate-700 dark:text-slate-300">{eip.northStarAlignment.improveUX.description}</span>
              </span>
            </li>
          )}
        </ul>
      </section>
    )}
  </>
);
