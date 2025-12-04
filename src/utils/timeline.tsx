import React from 'react';
import { TimelinePhase } from '../constants/timeline-phases';

/**
 * Calculate the position for the "we are here" marker on the network upgrade timeline
 * Position is between the last Active and first Upcoming upgrade
 */
export const calculateTimelineMarkerPosition = (upgrades: Array<{ status: string }>): number => {
  // Find the index for 'we are here' (between last Live and first Upcoming)
  const activeIdx = upgrades.findIndex(u => u.status === 'Live');
  const upcomingIdx = upgrades.findIndex(u => u.status === 'Upcoming');

  // Default position
  let markerPercent = 50;

  if (activeIdx !== -1 && upcomingIdx !== -1) {
    // Calculate position between the last active and first upcoming upgrade
    const totalUpgrades = upgrades.length;
    const activePosition = (activeIdx / (totalUpgrades - 1)) * 100;
    const upcomingPosition = (upcomingIdx / (totalUpgrades - 1)) * 100;
    // Move marker further right by weighting towards the upcoming position
    markerPercent = (activePosition * 0.25 + upcomingPosition * 0.7);
  }

  return markerPercent;
};

/**
 * Get the status icon for a timeline phase
 */
export const getPhaseStatusIcon = (status: TimelinePhase['status']): React.ReactNode => {
  switch (status) {
    case 'completed':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'current':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      );
    case 'upcoming':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    default:
      return null;
  }
};