import React from 'react';
import { ClientTeamPerspective } from '../../types';
import { ALL_CLIENT_TEAMS } from '../../constants/client-teams';

interface ClientPerspectivesProps {
  perspectives?: ClientTeamPerspective[];
  onLinkClick?: (url: string) => void;
}

export const ClientPerspectives: React.FC<ClientPerspectivesProps> = ({
  perspectives = [],
  onLinkClick
}) => {
  return (
    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded">
      <h4 className="font-medium text-indigo-900 dark:text-indigo-100 text-sm mb-3">
        Client Team Perspectives
      </h4>
      <p className="text-indigo-800 dark:text-indigo-200 text-xs leading-relaxed mb-3">
        Client teams publish their perspectives on headliner selection. These viewpoints are especially important as these teams will implement and maintain the chosen features.
      </p>
      <div className="flex flex-wrap gap-2">
        {ALL_CLIENT_TEAMS.map((team) => {
          const perspective = perspectives.find(p => p.teamName === team.name);
          const hasPerspective = !!perspective;

          return (
            <div
              key={team.name}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                hasPerspective
                  ? 'bg-white dark:bg-slate-700 border border-indigo-200 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer'
                  : 'bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-600 opacity-60'
              }`}
              onClick={() => hasPerspective && perspective?.blogPostUrl && onLinkClick?.(perspective.blogPostUrl)}
            >
              <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                team.type === 'EL' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' :
                team.type === 'CL' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300' :
                'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
              }`}>
                {team.type}
              </span>
              <span className="font-medium text-indigo-900 dark:text-indigo-100">{team.name}</span>
              {hasPerspective && (
                <span className="text-indigo-600 dark:text-indigo-400">→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
