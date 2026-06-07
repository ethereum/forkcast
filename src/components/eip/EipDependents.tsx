import React from 'react';
import { Link } from '../browserLocation';
import { EIP } from '../../types/eip';
import { getProposalPrefix, getLaymanTitle, getSpecificationUrl, isPendingEip } from '../../utils';

interface EipDependentsProps {
  dependents: EIP[];
}

export const EipDependents: React.FC<EipDependentsProps> = ({ dependents }) => {
  const sorted = [...dependents].sort((a, b) => a.id - b.id);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {sorted.length} EIP{sorted.length !== 1 ? 's' : ''} depend{sorted.length === 1 ? 's' : ''} on this proposal.
      </p>
      <div className="space-y-2">
        {sorted.map((eip) => {
          const isPr = isPendingEip(eip);
          const cardClasses = "block bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-4 hover:border-purple-400 dark:hover:border-purple-500 transition-colors";
          const content = (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm text-slate-400 dark:text-slate-400">
                  {getProposalPrefix(eip)}-{eip.id}
                </span>
                {isPr ? (
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    PR
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                    {eip.status}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {getLaymanTitle(eip)}
              </h4>
              {eip.description && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                  {eip.description}
                </p>
              )}
            </>
          );

          return isPr ? (
            <a
              key={eip.id}
              href={getSpecificationUrl(eip)}
              target="_blank"
              rel="noopener noreferrer"
              className={cardClasses}
            >
              {content}
            </a>
          ) : (
            <Link
              key={eip.id}
              to={`/eips/${eip.id}`}
              className={cardClasses}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
