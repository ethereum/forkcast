import {
  FUSAKA_TIMELINE_PHASES,
  GLAMSTERDAM_TIMELINE_PHASES,
  HEGOTA_TIMELINE_PHASES,
  PECTRA_TIMELINE_PHASES,
} from '../../constants/timeline-phases';
import type { UpgradeTimelineProps } from './UpgradeTimeline';

interface UpgradeTimelineSection extends UpgradeTimelineProps {
  /** Intro line under the section heading. */
  description: string;
}

/** The upgrades whose page has a Timeline section, keyed by lowercase fork name. */
export const UPGRADE_TIMELINES: Partial<Record<string, UpgradeTimelineSection>> = {
  hegota: {
    description: 'The planning timeline for Hegotá, showing the progression from headliner selection to final implementation decisions.',
    phases: HEGOTA_TIMELINE_PHASES,
    sourceUrl: 'https://ethereum-magicians.org/t/eip-8081-hegota-network-upgrade-meta-thread/26876',
    sourceLabel: 'View full timeline details',
    footnote: 'Dates subject to change',
  },
  glamsterdam: {
    description: 'The planning timeline for Glamsterdam, showing the progression from headliner selection to final implementation decisions.',
    phases: GLAMSTERDAM_TIMELINE_PHASES,
    sourceUrl: 'https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195',
    sourceLabel: 'View full timeline details on Ethereum Magicians',
  },
  fusaka: {
    description: 'The deployment timeline for Fusaka, showing the progression from devnets through testnet deployments to mainnet.',
    phases: FUSAKA_TIMELINE_PHASES,
    sourceUrl: 'https://eips.ethereum.org/EIPS/eip-7607',
    sourceLabel: 'View the Meta EIP',
  },
  pectra: {
    description: 'The deployment timeline for Pectra, showing the progression from devnets through testnet deployments to mainnet.',
    phases: PECTRA_TIMELINE_PHASES,
    sourceUrl: 'https://eips.ethereum.org/EIPS/eip-7600',
    sourceLabel: 'View the Meta EIP',
  },
};
