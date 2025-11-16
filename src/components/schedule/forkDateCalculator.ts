import { ForkProgress, DevnetDetail, TestnetDetail } from '../../constants/timeline-phases';

// Phase duration type
export interface PhaseDurations {
  HOODI_TO_MAINNET: number;
  SEPOLIA_TO_HOODI: number;
  DEVNET_TO_SEPOLIA: number;
  DEVNET_DURATION: number;
  DEVNET_COUNT: number;
  EIP_SELECTION_TO_DEVNET: number;
  EIP_PFI_DURATION: number;
  HEADLINER_SELECTION_DURATION: number;
  SELECTION_TO_EIP_PFI: number;
}

// Default phase duration constants (in days)
export const DEFAULT_PHASE_DURATIONS: PhaseDurations = {
  // Working backwards from mainnet: Devnets → Sepolia → Hoodi → Mainnet
  HOODI_TO_MAINNET: 30,        // 30 days from Hoodi to mainnet
  SEPOLIA_TO_HOODI: 14,        // 2 weeks between testnets
  DEVNET_TO_SEPOLIA: 30,       // 30 days from last devnet to first public testnet
  DEVNET_DURATION: 14,         // 2 weeks per devnet
  DEVNET_COUNT: 6,             // 6 devnets total (based on Fusaka actual)

  // EIP Selection substeps
  EIP_SELECTION_TO_DEVNET: 30,  // 30 days between CFI deadline and first devnet
  EIP_PFI_DURATION: 30,         // 30 days for EIP proposals (PFI to CFI)

  // Headliner Selection substeps
  HEADLINER_SELECTION_DURATION: 30,  // 30 days for review/selection
  SELECTION_TO_EIP_PFI: 7            // 7 days between headliner selection and EIP proposal window
};

// For backwards compatibility
export const PHASE_DURATIONS = DEFAULT_PHASE_DURATIONS;

// Helper to parse date string as local date (avoiding timezone issues)
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Helper to subtract days from a date
function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

// Helper to format date as "MMM DD, YYYY"
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Helper to parse "MMM DD, YYYY" format date string
export function parseShortDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

// Helper to calculate days between two dates
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((utc2 - utc1) / msPerDay);
}

export interface CalculatedDates {
  mainnet: Date;
  hoodi: Date;
  sepolia: Date;
  holesky: Date;
  devnets: Date[];
  eipSfiDeadline: Date;
  eipPfiDeadline: Date;
  headlinerSelectionDeadline: Date;
  headlinerProposalDeadline: Date;
}

export function calculateForkDates(
  mainnetDate: Date,
  devnetCount: number = DEFAULT_PHASE_DURATIONS.DEVNET_COUNT,
  durations: PhaseDurations = DEFAULT_PHASE_DURATIONS
): CalculatedDates {
  // Holesky is deprecated - Sepolia is now the first public testnet
  // Timeline: CFI → (21d) → Devnets → (30d) → Sepolia → (14d) → Hoodi → (30d) → Mainnet
  const hoodi = subtractDays(mainnetDate, durations.HOODI_TO_MAINNET);
  const sepolia = subtractDays(hoodi, durations.SEPOLIA_TO_HOODI);
  const holesky = sepolia; // Holesky deprecated, keep for interface compatibility

  // Days from last devnet to first public testnet (Sepolia)
  const lastDevnetDate = subtractDays(sepolia, durations.DEVNET_TO_SEPOLIA);

  // Calculate devnet dates (working backwards from lastDevnetDate)
  const devnets: Date[] = [];
  let currentDevnetEnd = lastDevnetDate;

  for (let i = devnetCount - 1; i >= 0; i--) {
    devnets.unshift(currentDevnetEnd);
    currentDevnetEnd = subtractDays(currentDevnetEnd, durations.DEVNET_DURATION);
  }

  // EIP Selection substeps (working backwards from first devnet)
  const eipSfiDeadline = subtractDays(devnets[0], durations.EIP_SELECTION_TO_DEVNET);
  const eipPfiDeadline = subtractDays(eipSfiDeadline, durations.EIP_PFI_DURATION);

  // Headliner Selection substeps (working backwards from EIP PFI deadline)
  const headlinerSelectionDeadline = subtractDays(eipPfiDeadline, durations.SELECTION_TO_EIP_PFI);
  const headlinerProposalDeadline = subtractDays(headlinerSelectionDeadline, durations.HEADLINER_SELECTION_DURATION);

  return {
    mainnet: mainnetDate,
    hoodi,
    sepolia,
    holesky,
    devnets,
    eipSfiDeadline,
    eipPfiDeadline,
    headlinerSelectionDeadline,
    headlinerProposalDeadline
  };
}

export interface ForkProgressOptions {
  isHistorical?: boolean;
  headlinerProposalDeadlineOverride?: Date;
  devnetCount?: number;
  durations?: PhaseDurations;
}

export function generateForkProgress(
  forkName: string,
  mainnetDate: Date,
  optionsOrIsHistorical: boolean | ForkProgressOptions = false
): ForkProgress {
  const options: ForkProgressOptions = typeof optionsOrIsHistorical === 'boolean'
    ? { isHistorical: optionsOrIsHistorical }
    : optionsOrIsHistorical;
  const isHistorical = options.isHistorical ?? false;
  const durations = options.durations ?? DEFAULT_PHASE_DURATIONS;
  const devnetCount = options.devnetCount ?? durations.DEVNET_COUNT;

  const dates = calculateForkDates(mainnetDate, devnetCount, durations);

  // Allow overriding the headliner proposal deadline for forks with locked-in dates
  if (options.headlinerProposalDeadlineOverride) {
    dates.headlinerProposalDeadline = options.headlinerProposalDeadlineOverride;
    // Recalculate selection deadline based on the override
    dates.headlinerSelectionDeadline = new Date(options.headlinerProposalDeadlineOverride);
    dates.headlinerSelectionDeadline.setDate(dates.headlinerSelectionDeadline.getDate() + durations.HEADLINER_SELECTION_DURATION);
  }

  const devnets: DevnetDetail[] = dates.devnets.map((date, idx) => ({
    name: `Devnet-${idx}`,
    status: isHistorical ? 'completed' : 'upcoming',
    projectedDate: formatDate(date),
    ...(isHistorical && { date: formatDate(date) })
  }));

  const testnets: TestnetDetail[] = [
    {
      name: 'Holešky',
      status: 'deprecated'
    },
    {
      name: 'Sepolia',
      status: isHistorical ? 'completed' : 'upcoming',
      projectedDate: formatDate(dates.sepolia),
      ...(isHistorical && { date: formatDate(dates.sepolia) })
    },
    {
      name: 'Hoodi',
      status: isHistorical ? 'completed' : 'upcoming',
      projectedDate: formatDate(dates.hoodi),
      ...(isHistorical && { date: formatDate(dates.hoodi) })
    }
  ];

  return {
    forkName,
    phases: [
      {
        phaseId: 'headliner-selection',
        status: isHistorical ? 'completed' : 'upcoming',
        projectedDate: `${formatDate(dates.headlinerProposalDeadline)} - ${formatDate(dates.headlinerSelectionDeadline)}`,
        progressNotes: 'Headliner proposals received and under review',
        substeps: [
          {
            name: 'Proposal Deadline',
            status: isHistorical ? 'completed' : 'upcoming',
            projectedDate: formatDate(dates.headlinerProposalDeadline)
          },
          {
            name: 'Selection Date',
            status: isHistorical ? 'completed' : 'upcoming',
            projectedDate: formatDate(dates.headlinerSelectionDeadline)
          }
        ]
      },
      {
        phaseId: 'eip-selection',
        status: 'upcoming',
        projectedDate: `${formatDate(dates.eipPfiDeadline)} - ${formatDate(dates.eipSfiDeadline)}`,
        progressNotes: 'PFI/CFI decisions ongoing, SFI decisions upcoming',
        substeps: [
          {
            name: 'PFI Deadline',
            status: isHistorical ? 'completed' : 'upcoming',
            projectedDate: formatDate(dates.eipPfiDeadline)
          },
          {
            name: 'CFI Deadline',
            status: isHistorical ? 'completed' : 'upcoming',
            projectedDate: formatDate(dates.eipSfiDeadline)
          }
        ]
      },
      {
        phaseId: 'development',
        status: 'upcoming',
        projectedDate: `${formatDate(dates.devnets[0])} - ${formatDate(dates.devnets[dates.devnets.length - 1])}`,
        progressNotes: `${dates.devnets.length} devnets planned`,
        devnets
      },
      {
        phaseId: 'public-testnets',
        status: 'upcoming',
        projectedDate: `${formatDate(dates.sepolia)} - ${formatDate(dates.hoodi)}`,
        progressNotes: 'Sequential testnet deployments',
        testnets
      },
      {
        phaseId: 'mainnet-deployment',
        status: 'upcoming',
        projectedDate: formatDate(dates.mainnet),
        progressNotes: 'Target mainnet activation'
      }
    ]
  };
}
