import React from 'react';
import { forkHasTierMaker } from '../../utils/tierMaker';

interface TierMakerLinkProps {
  /** Lowercase upgrade id, e.g. 'hegota'. */
  forkId: string;
}

/**
 * Inline header link to a fork's proposal tier maker (`/rank/{fork}`). Renders
 * nothing for forks without a tier maker, so it is safe to drop into any upgrade
 * page header. Styled to match the adjacent "View Meta EIP Discussion" link.
 */
export const TierMakerLink: React.FC<TierMakerLinkProps> = ({ forkId }) => {
  const id = forkId.toLowerCase();
  if (!forkHasTierMaker(id)) return null;

  return (
    <a
      href={`/rank/${id}`}
      className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2 transition-colors"
    >
      Rank the proposals
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </a>
  );
};
