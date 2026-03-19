export interface TimelineEvent {
  type: 'event';
  date: string; // YYYY-MM-DD format for sorting/display
  datetime?: string; // Optional UTC datetime (YYYY-MM-DD HH:MM:SS)
  title: string;
  category: 'mainnet' | 'testnet' | 'milestone' | 'announcement' | 'devnet';
}

export const timelineEvents: TimelineEvent[] = [
  {
    type: 'event',
    date: '2025-05-07',
    title: 'Pectra Live on Mainnet',
    category: 'mainnet'
  },
  {
    type: 'event',
    date: '2025-05-26',
    title: 'Fusaka Devnet-0 Launches',
    category: 'devnet'
  },
  {
    type: 'event',
    date: '2025-06-09',
    title: 'Fusaka Devnet-1 Launches',
    category: 'devnet'
  },
  {
    type: 'event',
    date: '2025-06-26',
    title: 'Fusaka Devnet-2 Launches',
    category: 'devnet'
  },
  {
    type: 'event',
    date: '2025-07-23',
    title: 'Fusaka Devnet-3 Launches',
    category: 'devnet'
  },
  {
    type: 'event',
    date: '2025-07-30',
    title: 'Ethereum Turns 10! 🎉',
    category: 'milestone'
  },
  {
    type: 'event',
    date: '2025-08-08',
    title: 'Fusaka Devnet-4 Launches',
    category: 'devnet'
  },
  {
    type: 'event',
    date: '2025-09-10',
    title: 'Fusaka Devnet-5 Launches',
    category: 'devnet'
  },
  {
    type: 'event',
    date: '2025-10-01',
    title: 'Fusaka Live on Holešky Testnet',
    category: 'testnet'
  },
  {
    type: 'event',
    date: '2025-10-07',
    title: 'Fusaka BPO1 on Holešky (10/15 blobs)',
    category: 'testnet'
  },
  {
    type: 'event',
    date: '2025-10-13',
    title: 'Fusaka BPO2 on Holešky (14/21 blobs)',
    category: 'testnet'
  },
  {
    type: 'event',
    date: '2025-10-14',
    title: 'Fusaka Live on Sepolia Testnet',
    category: 'testnet'
  },
  {
    type: 'event',
    date: '2025-10-21',
    title: 'Fusaka BPO1 on Sepolia (10/15 blobs)',
    category: 'testnet'
  },
  {
    type: 'event',
    date: '2025-10-27',
    title: 'Fusaka BPO2 on Sepolia (14/21 blobs)',
    category: 'testnet'
  },
  {
    type: 'event',
    date: '2025-10-28',
    title: 'Fusaka Live on Hoodi Testnet',
    category: 'testnet'
  },
  {
    type: 'event',
    date: '2025-11-05',
    title: 'Fusaka BPO1 on Hoodi (10/15 blobs)',
    category: 'testnet'
  },
  {
    type: 'event',
    date: '2025-11-12',
    title: 'Fusaka BPO2 on Hoodi (14/21 blobs)',
    category: 'testnet'
  },
  {
    type: 'event',
    date: '2025-12-03',
    title: 'Fusaka Live on Mainnet',
    category: 'mainnet'
  },
  {
    type: 'event',
    date: '2025-12-09',
    datetime: '2025-12-09 14:21:11',
    title: 'BPO1 on Mainnet (10/15 blobs)',
    category: 'mainnet'
  },
  {
    type: 'event',
    date: '2026-01-07',
    datetime: '2026-01-07 01:01:11',
    title: 'BPO2 on Mainnet (14/21 blobs)',
    category: 'mainnet'
  }
];

