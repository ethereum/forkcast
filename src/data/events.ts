import devnetLaunches from './generated/devnet-launches.json';
import { bpoMilestones, forkMilestones } from './milestones';
import { bpoUpgrades } from './upgrades';
import { BUILD_DATE, milestoneStatus, type Milestone } from '../utils/milestones';

export interface TimelineEvent {
  type: 'event';
  date: string; // YYYY-MM-DD format for sorting/display
  datetime?: string; // Optional UTC datetime (YYYY-MM-DD HH:MM:SS)
  title: string;
  category: 'mainnet' | 'testnet' | 'milestone' | 'announcement' | 'devnet';
  /**
   * `/networks/{id}` page this event happened on. Only set it for a network that
   * still has a page: retired ones (Holešky, the Fusaka devnets) drop out of the
   * Cartographoor snapshot the route set is built from.
   */
  networkId?: string;
}

const FORK_DISPLAY_NAMES: Record<string, string> = {
  glamsterdam: 'Glamsterdam',
  hegota: 'Hegotá',
};

const generatedDevnetEvents: TimelineEvent[] = Object.entries(
  devnetLaunches as Record<string, { version: number; date: string; dateISO: string }[]>,
).flatMap(([fork, launches]) =>
  launches.map((l) => ({
    type: 'event' as const,
    date: l.dateISO,
    title: `${FORK_DISPLAY_NAMES[fork] ?? fork} Devnet-${l.version} Launches`,
    category: 'devnet' as const,
    networkId: `${fork}-devnet-${l.version}`,
  })),
);

/**
 * Networks whose forks are timeline events, with the label the event title uses
 * and the `/networks/{id}` page (if it still has one). Platåberget is left out:
 * it is glamsterdam-devnet-8, whose launch is already a devnet event.
 */
const EVENT_NETWORKS: Record<string, { label: string; category: 'mainnet' | 'testnet'; networkId?: string }> = {
  holesky: { label: 'Holešky', category: 'testnet' },
  sepolia: { label: 'Sepolia', category: 'testnet', networkId: 'sepolia' },
  hoodi: { label: 'Hoodi', category: 'testnet', networkId: 'hoodi' },
  mainnet: { label: 'Mainnet', category: 'mainnet', networkId: 'mainnet' },
};

// The timeline opens with Pectra reaching mainnet; its testnet forks predate it.
const TIMELINE_START = '2025-05-07';

const UPGRADE_NAMES: Record<string, string> = { pectra: 'Pectra', fusaka: 'Fusaka', glamsterdam: 'Glamsterdam' };

const milestoneEvent = (title: string, milestone: Milestone, network: string): TimelineEvent => {
  const { category, networkId } = EVENT_NETWORKS[network];
  return {
    type: 'event',
    date: milestone.date!,
    ...(milestone.datetime ? { datetime: milestone.datetime } : {}),
    title,
    category,
    ...(networkId ? { networkId } : {}),
  };
};

/**
 * Network forks that have happened as of `today`, derived from the milestone
 * data, plus the hand-written community milestones. A fork shows up on the
 * first build on or after its day.
 */
export const buildTimelineEvents = (today: string): TimelineEvent[] => {
  const happened = (m: Milestone) => milestoneStatus(m, today) === 'completed' && m.date! >= TIMELINE_START;

  const upgradeEvents = Object.entries(UPGRADE_NAMES).flatMap(([id, name]) =>
    Object.entries(forkMilestones[id as keyof typeof forkMilestones] as Record<string, Milestone>)
      .filter(([network, m]) => network in EVENT_NETWORKS && happened(m))
      .map(([network, m]) =>
        milestoneEvent(
          network === 'mainnet' ? `${name} Live on Mainnet` : `${name} Live on ${EVENT_NETWORKS[network].label} Testnet`,
          m,
          network,
        ),
      ),
  );

  const fusakaDevnetEvents: TimelineEvent[] = forkMilestones.fusaka.devnets.filter(happened).map((m, i) => ({
    type: 'event',
    date: m.date,
    title: `Fusaka Devnet-${i} Launches`,
    category: 'devnet',
  }));

  const bpoEvents = bpoUpgrades.flatMap((bpo) =>
    Object.entries(bpoMilestones[bpo.id as keyof typeof bpoMilestones] as Record<string, Milestone>)
      .filter(([, m]) => happened(m))
      .map(([network, m]) =>
        milestoneEvent(
          network === 'mainnet'
            ? `${bpo.name} on Mainnet (${bpo.blobTarget}/${bpo.blobMax} blobs)`
            : `Fusaka ${bpo.name} on ${EVENT_NETWORKS[network].label} (${bpo.blobTarget}/${bpo.blobMax} blobs)`,
          m,
          network,
        ),
      ),
  );

  const communityEvents: TimelineEvent[] = [
    {
      type: 'event',
      date: '2025-07-30',
      title: 'Ethereum Turns 10! 🎉',
      category: 'milestone',
    },
  ];

  return [
    ...[...upgradeEvents, ...fusakaDevnetEvents, ...bpoEvents, ...communityEvents].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    ...generatedDevnetEvents,
  ];
};

export const timelineEvents: TimelineEvent[] = buildTimelineEvents(BUILD_DATE);
