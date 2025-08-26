import { InclusionStage } from '../types/eip';

/**
 * Get the color classes for inclusion stage badges
 */
export const getInclusionStageColor = (stage: InclusionStage): string => {
  switch (stage) {
    case 'Proposed for Inclusion':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
    case 'Considered for Inclusion':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300';
    case 'Scheduled for Inclusion':
      return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';
    case 'Declined for Inclusion':
      return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
    case 'Included':
      return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }
};

/**
 * Get the color classes for upgrade status badges
 */
export const getUpgradeStatusColor = (status: string): string => {
  switch (status) {
    case 'Active':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';
    case 'Upcoming':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    case 'Planning':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    case 'Research':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
    default:
      return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  }
};

/**
 * Get the color classes for timeline phase status
 */
export const getPhaseStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700';
    case 'current':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700';
    case 'upcoming':
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
  }
};