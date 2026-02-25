import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EIP } from '../../types';
import {
  getLaymanTitle,
  getProposalPrefix,
  getSpecificationUrl,
  getEipLayer,
  parseMarkdownLinks,
} from '../../utils';

type StakeholderKey = 'appDevs' | 'walletDevs' | 'endUsers' | 'layer2s' | 'stakersNodes' | 'toolingInfra';

interface StakeholderEipCardProps {
  eip: EIP;
  stakeholderKey: StakeholderKey;
  handleExternalLinkClick: (linkType: string, url: string) => void;
}

export const StakeholderEipCard: React.FC<StakeholderEipCardProps> = ({
  eip,
  stakeholderKey,
  handleExternalLinkClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const layer = getEipLayer(eip);
  const impact = eip.stakeholderImpacts?.[stakeholderKey]?.description;

  return (
    <div className="py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <Link
            to={`/eips/${eip.id}`}
            className="group inline-flex items-baseline gap-2 flex-wrap"
          >
            <span className="text-slate-400 dark:text-slate-400 text-sm font-mono underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2">
              {getProposalPrefix(eip)}-{eip.id}
            </span>
            <span className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {getLaymanTitle(eip)}
            </span>
            {layer && (
              <span className={`px-1.5 py-0.5 text-sm rounded ${
                layer === 'EL'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
              }`}>
                {layer}
              </span>
            )}
          </Link>
        </div>

        {/* Links */}
        <div className="flex items-center gap-3 text-sm">
          {eip.discussionLink && (
            <a
              href={eip.discussionLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleExternalLinkClick('discussion', eip.discussionLink)}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
            >
              forum
            </a>
          )}
          <a
            href={getSpecificationUrl(eip)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleExternalLinkClick('specification', getSpecificationUrl(eip))}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
          >
            spec
          </a>
        </div>
      </div>

      {/* Impact text - directly inline */}
      {impact && (
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {impact}
        </p>
      )}

      {/* Expandable full description */}
      {eip.laymanDescription && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-sm text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
          >
            {isExpanded ? '− hide description' : '+ what is this?'}
          </button>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="mt-2 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {parseMarkdownLinks(eip.laymanDescription)}
                </p>
                <Link
                  to={`/eips/${eip.id}`}
                  className="inline-block mt-2 text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2"
                >
                  View full EIP details →
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
