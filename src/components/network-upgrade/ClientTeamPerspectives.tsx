import React from 'react';
import { ClientTeamPerspective } from '../../types';
import { useAnalytics } from '../../hooks/useAnalytics';
import { CopyLinkButton } from '../ui/CopyLinkButton';
import { Tooltip } from '../ui/Tooltip';

interface ClientTeamPerspectivesProps {
  perspectives: ClientTeamPerspective[];
}

export const ClientTeamPerspectives: React.FC<ClientTeamPerspectivesProps> = ({
  perspectives
}) => {
  const { trackLinkClick } = useAnalytics();

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  if (perspectives.length === 0) {
    return null;
  }

  const getTeamTypeColor = (teamType: string) => {
    switch (teamType) {
      case 'EL':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CL':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Both':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTeamTypeLabel = (teamType: string) => {
    switch (teamType) {
      case 'EL':
        return 'Execution Layer';
      case 'CL':
        return 'Consensus Layer';
      case 'Both':
        return 'EL & CL';
      default:
        return teamType;
    }
  };

  return (
    <div className="space-y-6" id="client-team-perspectives" data-section>
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-medium text-slate-900">Client Team Perspectives</h2>
          <span className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-700">
            {perspectives.length} Perspective{perspectives.length !== 1 ? 's' : ''}
          </span>
          <CopyLinkButton
            sectionId="client-team-perspectives"
            title="Copy link to client team perspectives"
            size="sm"
          />
        </div>
        <p className="text-sm text-slate-600 max-w-3xl">
          Client teams share their perspectives on headliner selection for this network upgrade. These viewpoints are crucial as these teams will implement and maintain the chosen features.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap gap-3">
          {perspectives.map((perspective, index) => (
            <div key={index} className="flex items-center gap-2">
              <Tooltip
                text={getTeamTypeLabel(perspective.teamType)}
                className="inline-block"
              >
                <span className={`px-2 py-1 text-xs font-medium rounded border ${getTeamTypeColor(perspective.teamType)}`}>
                  {perspective.teamType}
                </span>
              </Tooltip>
              <a
                href={perspective.blogPostUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleExternalLinkClick('client_team_perspective', perspective.blogPostUrl)}
                className="text-sm font-medium text-slate-900 hover:text-indigo-600 underline decoration-1 underline-offset-2 transition-colors"
              >
                {perspective.teamName}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 