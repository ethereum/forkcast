import { InclusionStage } from '../types/eip';

/**
 * Get the color classes for inclusion stage badges
 */
export const getInclusionStageColor = (stage: InclusionStage): string => {
  switch (stage) {
    case 'Proposed for Inclusion':
      return 'bg-slate-100 text-slate-700';
    case 'Considered for Inclusion':
      return 'bg-slate-200 text-slate-700';
    case 'Scheduled for Inclusion':
      return 'bg-yellow-50 text-yellow-700';
    case 'Declined for Inclusion':
      return 'bg-red-50 text-red-700 dark:text-black';
    case 'Included':
      return 'bg-emerald-50 text-emerald-800';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

/**
 * Get the color classes for upgrade status badges
 */
export const getUpgradeStatusColor = (status: string): string => {
  switch (status) {
    case 'Active':
      return 'bg-emerald-100 text-emerald-800';
    case 'Upcoming':
      return 'bg-blue-100 text-blue-800';
    case 'Planning':
      return 'bg-purple-100 text-purple-800';
    case 'Research':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-slate-200 text-slate-700';
  }
};

/**
 * Get the color classes for timeline phase status
 */
export const getPhaseStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'current':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'upcoming':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};
