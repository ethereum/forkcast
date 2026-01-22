import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FUSAKA_PROGRESS, GLAMSTERDAM_PROGRESS, UPGRADE_PROCESS_PHASES } from '../../constants/timeline-phases';
import { useMetaTags } from '../../hooks/useMetaTags';
import { useAnalytics } from '../../hooks/useAnalytics';
import ThemeToggle from '../ui/ThemeToggle';
import AnalysisNav from '../ui/AnalysisNav';
import { generateForkProgress, parseLocalDate, parseShortDate, daysBetween, DEFAULT_PHASE_DURATIONS, PhaseDurations } from './forkDateCalculator';
import ForkGanttChart from './ForkGanttChart';
import EditableDateCell from './EditableDateCell';

const STORAGE_KEY = 'forkcast-planning-table';
const MOBILE_NOTICE_KEY = 'forkcast-mobile-notice-dismissed';

type MobileFork = 'fusaka' | 'glamsterdam' | 'hegota';

interface PlanningTableState {
  glamsterdamMainnetDate: string;
  hegotaMainnetDate: string;
  glamsterdamDevnetCount: number;
  hegotaDevnetCount: number;
  lockedDates: Record<string, string>;
  phaseDurations: PhaseDurations;
}

const DEFAULT_STATE: PlanningTableState = {
  glamsterdamMainnetDate: '2026-06-01',
  hegotaMainnetDate: '2027-01-15',
  glamsterdamDevnetCount: 6,
  hegotaDevnetCount: 6,
  lockedDates: {},
  phaseDurations: DEFAULT_PHASE_DURATIONS,
};

const loadFromStorage = (): PlanningTableState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure phaseDurations has all keys (in case new ones are added)
      return {
        ...DEFAULT_STATE,
        ...parsed,
        phaseDurations: { ...DEFAULT_PHASE_DURATIONS, ...parsed.phaseDurations },
      };
    }
  } catch (e) {
    console.warn('Failed to load planning table state from localStorage:', e);
  }
  return DEFAULT_STATE;
};

// Human-readable labels for duration settings
const DURATION_LABELS: Record<keyof PhaseDurations, { label: string; description: string }> = {
  HOODI_TO_MAINNET: { label: 'Hoodi → Mainnet', description: 'Days between Hoodi testnet and mainnet' },
  SEPOLIA_TO_HOODI: { label: 'Sepolia → Hoodi', description: 'Days between Sepolia and Hoodi testnets' },
  DEVNET_TO_SEPOLIA: { label: 'Last Devnet → Sepolia', description: 'Days between last devnet and Sepolia' },
  DEVNET_DURATION: { label: 'Devnet Duration', description: 'Days between each devnet' },
  DEVNET_COUNT: { label: 'Default Devnet Count', description: 'Default number of devnets (can override per fork)' },
  EIP_SELECTION_TO_DEVNET: { label: 'CFI → First Devnet', description: 'Days between CFI deadline and first devnet' },
  EIP_PFI_DURATION: { label: 'PFI → CFI', description: 'Expected days for EIP proposals (PFI to CFI)' },
  HEADLINER_SELECTION_DURATION: { label: 'Proposal → Selection', description: 'Expected days for headliner review/selection' },
  SELECTION_TO_EIP_PFI: { label: 'Selection → PFI', description: 'Expected days between headliner selection and EIP proposal window' },
};

const SchedulePage: React.FC = () => {
  const [glamsterdamMainnetDate, setGlamsterdamMainnetDate] = useState<string>(() => loadFromStorage().glamsterdamMainnetDate);
  const [hegotaMainnetDate, setHegotaMainnetDate] = useState<string>(() => loadFromStorage().hegotaMainnetDate);
  const [glamsterdamDevnetCount, setGlamsterdamDevnetCount] = useState<number>(() => loadFromStorage().glamsterdamDevnetCount);
  const [hegotaDevnetCount, setHegotaDevnetCount] = useState<number>(() => loadFromStorage().hegotaDevnetCount);
  const [lockedDates, setLockedDates] = useState<Record<string, string>>(() => loadFromStorage().lockedDates);
  const [phaseDurations, setPhaseDurations] = useState<PhaseDurations>(() => loadFromStorage().phaseDurations);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileFork, setMobileFork] = useState<MobileFork>('glamsterdam');
  const [mobileNoticeDismissed, setMobileNoticeDismissed] = useState(() => {
    try {
      return localStorage.getItem(MOBILE_NOTICE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const { trackLinkClick } = useAnalytics();

  const dismissMobileNotice = () => {
    setMobileNoticeDismissed(true);
    try {
      localStorage.setItem(MOBILE_NOTICE_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
  };

  // Persist state to localStorage
  useEffect(() => {
    const state: PlanningTableState = {
      glamsterdamMainnetDate,
      hegotaMainnetDate,
      glamsterdamDevnetCount,
      hegotaDevnetCount,
      lockedDates,
      phaseDurations,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save planning table state to localStorage:', e);
    }
  }, [glamsterdamMainnetDate, hegotaMainnetDate, glamsterdamDevnetCount, hegotaDevnetCount, lockedDates, phaseDurations]);

  // Reset to defaults
  const resetPlanningTable = () => {
    setGlamsterdamMainnetDate(DEFAULT_STATE.glamsterdamMainnetDate);
    setHegotaMainnetDate(DEFAULT_STATE.hegotaMainnetDate);
    setGlamsterdamDevnetCount(DEFAULT_STATE.glamsterdamDevnetCount);
    setHegotaDevnetCount(DEFAULT_STATE.hegotaDevnetCount);
    setLockedDates(DEFAULT_STATE.lockedDates);
    setPhaseDurations(DEFAULT_STATE.phaseDurations);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Update a single duration value
  const updateDuration = (key: keyof PhaseDurations, value: number) => {
    setPhaseDurations(prev => ({ ...prev, [key]: Math.max(1, value) }));
  };

  // Get the effective date (locked value or calculated value)
  const getEffectiveDate = (fork: string, phaseId: string, itemName: string, calculatedDate: string): string => {
    const key = `${fork}:${phaseId}:${itemName}`;
    return lockedDates[key] ?? calculatedDate;
  };

  // Calculate duration warning: returns { days, isUnderExpected } for phase transitions
  const getDurationWarning = (fromDate: string, toDate: string, expectedDuration: number): { days: number; isUnderExpected: boolean } | null => {
    if (!fromDate || !toDate) return null;
    const from = parseShortDate(fromDate);
    const to = parseShortDate(toDate);
    if (!from || !to) return null;
    const days = daysBetween(from, to);
    return { days, isUnderExpected: days < expectedDuration };
  };

  // Generate dynamic fork projections based on selected mainnet dates
  // These will override the static data for dates that haven't occurred yet
  const dynamicGlamsterdamProjection = useMemo(() => {
    const generated = generateForkProgress('Glamsterdam', parseLocalDate(glamsterdamMainnetDate), {
      devnetCount: glamsterdamDevnetCount,
      durations: phaseDurations,
    });
    // Use actual dates from GLAMSTERDAM_PROGRESS for completed milestones
    return {
      ...generated,
      phases: generated.phases.map((phase, idx) => {
        const staticPhase = GLAMSTERDAM_PROGRESS.phases[idx];
        if (staticPhase?.substeps) {
          return {
            ...phase,
            substeps: phase.substeps?.map((substep, substepIdx) => {
              const staticSubstep = staticPhase.substeps?.[substepIdx];
              // Use actual date if it exists (completed milestone)
              if (staticSubstep?.date) {
                return {
                  ...substep,
                  status: staticSubstep.status,
                  date: staticSubstep.date,
                  projectedDate: staticSubstep.date
                };
              }
              return substep;
            })
          };
        }
        return phase;
      })
    };
  }, [glamsterdamMainnetDate, glamsterdamDevnetCount, phaseDurations]);

  const dynamicHegotaProjection = useMemo(() =>
    generateForkProgress('Hegota', parseLocalDate(hegotaMainnetDate), {
      headlinerProposalDeadlineOverride: new Date(2026, 1, 4), // February 4, 2026
      headlinerSelectionDeadlineOverride: new Date(2026, 1, 26), // February 26, 2026
      devnetCount: hegotaDevnetCount,
      durations: phaseDurations,
    }),
    [hegotaMainnetDate, hegotaDevnetCount, phaseDurations]
  );

  // Get all milestones in chronological order for a fork
  const getMilestoneOrder = (fork: string): Array<{ phaseId: string; itemName: string }> => {
    const projection = fork === 'glamsterdam' ? dynamicGlamsterdamProjection : dynamicHegotaProjection;
    const devnetCount = fork === 'glamsterdam' ? glamsterdamDevnetCount : hegotaDevnetCount;

    const milestones: Array<{ phaseId: string; itemName: string }> = [
      { phaseId: 'headliner-selection', itemName: 'Proposal Deadline' },
      { phaseId: 'headliner-selection', itemName: 'Selection Date' },
      { phaseId: 'eip-selection', itemName: 'PFI Deadline' },
      { phaseId: 'eip-selection', itemName: 'CFI Deadline' },
    ];

    // Add devnets
    for (let i = 0; i < devnetCount; i++) {
      milestones.push({ phaseId: 'development', itemName: `Devnet-${i}` });
    }

    // Add testnets (skip Holesky as it's deprecated)
    const testnetPhase = projection.phases.find(p => p.phaseId === 'public-testnets');
    testnetPhase?.testnets?.forEach(testnet => {
      if (testnet.status !== 'deprecated') {
        milestones.push({ phaseId: 'public-testnets', itemName: testnet.name });
      }
    });

    return milestones;
  };

  // Get calculated date for a milestone from projections
  const getCalculatedDateForMilestone = (fork: string, phaseId: string, itemName: string): string => {
    const projection = fork === 'glamsterdam' ? dynamicGlamsterdamProjection : dynamicHegotaProjection;
    const phase = projection.phases.find(p => p.phaseId === phaseId);

    if (phaseId === 'headliner-selection' || phaseId === 'eip-selection') {
      const substep = phase?.substeps?.find(s => s.name === itemName);
      return substep?.date || substep?.projectedDate || '';
    } else if (phaseId === 'development') {
      const devnet = phase?.devnets?.find(d => d.name === itemName);
      return devnet?.date || devnet?.projectedDate || '';
    } else if (phaseId === 'public-testnets') {
      const testnet = phase?.testnets?.find(t => t.name === itemName);
      return testnet?.date || testnet?.projectedDate || '';
    }
    return '';
  };

  // Lock a date and cascade to all previous milestones
  const lockDate = (fork: string, phaseId: string, itemName: string, date: string) => {
    // Fusaka is read-only, no cascading needed
    if (fork === 'fusaka') {
      const key = `${fork}:${phaseId}:${itemName}`;
      setLockedDates(prev => ({ ...prev, [key]: date }));
      return;
    }

    const milestones = getMilestoneOrder(fork);
    const targetIndex = milestones.findIndex(m => m.phaseId === phaseId && m.itemName === itemName);

    if (targetIndex === -1) {
      // Fallback: just lock the single date
      const key = `${fork}:${phaseId}:${itemName}`;
      setLockedDates(prev => ({ ...prev, [key]: date }));
      return;
    }

    // Lock all milestones from start up to and including the target
    setLockedDates(prev => {
      const newLocked = { ...prev };
      for (let i = 0; i <= targetIndex; i++) {
        const milestone = milestones[i];
        const key = `${fork}:${milestone.phaseId}:${milestone.itemName}`;
        // Only lock if not already locked
        if (!(key in newLocked)) {
          const calcDate = getCalculatedDateForMilestone(fork, milestone.phaseId, milestone.itemName);
          const effectiveDate = prev[key] ?? calcDate;
          newLocked[key] = effectiveDate;
        }
      }
      // Always set the target date to the specified value
      newLocked[`${fork}:${phaseId}:${itemName}`] = date;
      return newLocked;
    });
  };

  const unlockDate = (fork: string, phaseId: string, itemName: string) => {
    const key = `${fork}:${phaseId}:${itemName}`;
    setLockedDates(prev => {
      const { [key]: _removed, ...rest } = prev;
      void _removed;
      return rest;
    });
  };

  useMetaTags({
    title: 'ACD Planning Sandbox - Forkcast',
    description: 'Internal planning tool for Ethereum core developers. Explore hypothetical upgrade timelines - these are not committed dates.',
    url: 'https://forkcast.org/schedule',
  });

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <Link
            to="/"
            className="text-2xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight inline-block mb-4"
          >
            Forkcast
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            ACD Planning Sandbox
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Internal planning tool for ACD facilitators, client teams, and testers. Dates shown are hypothetical projections, not commitments.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Edit and lock dates to explore planning scenarios. Changes are saved automatically to your browser.
          </p>
          <div className="mt-4">
            <AnalysisNav />
          </div>
        </div>

        {/* Mobile Notice Banner */}
        {!mobileNoticeDismissed && (
          <div className="md:hidden mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This planning tool is optimized for desktop viewing. For the best experience, use a larger screen.
              </p>
            </div>
            <button
              onClick={dismissMobileNotice}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 text-lg leading-none"
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        {/* Mobile Fork Selector */}
        <div className="md:hidden mb-4 flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">View:</span>
          <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
            {(['fusaka', 'glamsterdam', 'hegota'] as MobileFork[]).map((fork) => (
              <button
                key={fork}
                onClick={() => setMobileFork(fork)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  mobileFork === fork
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {fork.charAt(0).toUpperCase() + fork.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Planning View */}
        {(() => {
          // Track previous milestone dates for each fork to calculate gaps
          const previousDates = {
            fusaka: null as Date | null,
            glamsterdam: null as Date | null,
            hegota: null as Date | null
          };

          // Helper to calculate and format gap
          const calculateGap = (dateString: string | undefined, forkKey: 'fusaka' | 'glamsterdam' | 'hegota'): { text: string; isNegative: boolean } => {
            if (!dateString) return { text: '', isNegative: false };
            const currentDate = parseShortDate(dateString);
            if (!currentDate) return { text: '', isNegative: false };

            const prevDate = previousDates[forkKey];
            if (prevDate) {
              const gap = daysBetween(prevDate, currentDate);
              previousDates[forkKey] = currentDate;
              const isNegative = gap < 0;
              return { text: ` (${gap >= 0 ? '+' : ''}${gap}d)`, isNegative };
            } else {
              previousDates[forkKey] = currentDate;
              return { text: '', isNegative: false };
            }
          };

          // Helper to calculate months and days between two dates
          const getMonthsDaysBetween = (from: Date, to: Date): { months: number; days: number } => {
            let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

            // Adjust if the day of month hasn't been reached yet
            if (to.getDate() < from.getDate()) {
              months--;
              // Calculate remaining days by going to the same day in the previous month
              const prevMonth = new Date(to);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              prevMonth.setDate(from.getDate());
              const days = Math.floor((to.getTime() - prevMonth.getTime()) / (1000 * 60 * 60 * 24));
              return { months, days };
            }

            const days = to.getDate() - from.getDate();
            return { months, days };
          };

          // Helper to format months+days
          const formatMonthsDays = (from: Date, to: Date): string => {
            const { months, days } = getMonthsDaysBetween(from, to);
            if (months === 0) return `${days}d`;
            if (days === 0) return `${months}mo`;
            return `${months}mo ${days}d`;
          };

          // Calculate time between upgrade mainnet dates
          const pectraMainnet = parseShortDate('May 7, 2025')!;
          const fusakaMainnet = parseShortDate('Dec 3, 2025')!;
          const glamsterdamMainnet = parseLocalDate(glamsterdamMainnetDate);
          const hegotaMainnet = parseLocalDate(hegotaMainnetDate);

          return (
            <div className="mb-10">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Fork Timeline Planning</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        See the cascading impacts of scheduling decisions. Click dates to adjust. Changes are saved automatically.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Adjust phase duration assumptions"
                      >
                        <span>{showSettings ? '▼' : '▶'}</span>
                        Settings
                      </button>
                      <button
                        onClick={resetPlanningTable}
                        className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-slate-300 dark:border-slate-600 hover:border-red-300 dark:hover:border-red-700 transition-colors cursor-pointer"
                        title="Reset all dates and settings to defaults"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collapsible Settings Panel */}
                {showSettings && (
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phase Durations (days)</span>
                      <button
                        onClick={() => setPhaseDurations(DEFAULT_PHASE_DURATIONS)}
                        className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
                      >
                        Reset to defaults
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px]">
                      {/* Headliners */}
                      <div className="space-y-1">
                        <div className="font-medium text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-1">Headliners</div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400" title={DURATION_LABELS.HEADLINER_SELECTION_DURATION.description}>Proposal → Selection</span>
                          <input type="number" min="1" value={phaseDurations.HEADLINER_SELECTION_DURATION} onChange={(e) => updateDuration('HEADLINER_SELECTION_DURATION', parseInt(e.target.value) || 1)} className="px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 w-10 text-center text-[10px]" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400" title={DURATION_LABELS.SELECTION_TO_EIP_PFI.description}>Selection → PFI</span>
                          <input type="number" min="1" value={phaseDurations.SELECTION_TO_EIP_PFI} onChange={(e) => updateDuration('SELECTION_TO_EIP_PFI', parseInt(e.target.value) || 1)} className="px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 w-10 text-center text-[10px]" />
                        </div>
                      </div>
                      {/* Non-headliners */}
                      <div className="space-y-1">
                        <div className="font-medium text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-1">Non-headliners</div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400" title={DURATION_LABELS.EIP_PFI_DURATION.description}>PFI → CFI</span>
                          <input type="number" min="1" value={phaseDurations.EIP_PFI_DURATION} onChange={(e) => updateDuration('EIP_PFI_DURATION', parseInt(e.target.value) || 1)} className="px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 w-10 text-center text-[10px]" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400" title={DURATION_LABELS.EIP_SELECTION_TO_DEVNET.description}>CFI → Devnet</span>
                          <input type="number" min="1" value={phaseDurations.EIP_SELECTION_TO_DEVNET} onChange={(e) => updateDuration('EIP_SELECTION_TO_DEVNET', parseInt(e.target.value) || 1)} className="px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 w-10 text-center text-[10px]" />
                        </div>
                      </div>
                      {/* Devnets */}
                      <div className="space-y-1">
                        <div className="font-medium text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-1">Devnets</div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400" title={DURATION_LABELS.DEVNET_DURATION.description}>Between Each</span>
                          <input type="number" min="1" value={phaseDurations.DEVNET_DURATION} onChange={(e) => updateDuration('DEVNET_DURATION', parseInt(e.target.value) || 1)} className="px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 w-10 text-center text-[10px]" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400" title={DURATION_LABELS.DEVNET_TO_SEPOLIA.description}>Last → Sepolia</span>
                          <input type="number" min="1" value={phaseDurations.DEVNET_TO_SEPOLIA} onChange={(e) => updateDuration('DEVNET_TO_SEPOLIA', parseInt(e.target.value) || 1)} className="px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 w-10 text-center text-[10px]" />
                        </div>
                      </div>
                      {/* Testnets */}
                      <div className="space-y-1">
                        <div className="font-medium text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-1">Testnets</div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400" title={DURATION_LABELS.SEPOLIA_TO_HOODI.description}>Sepolia → Hoodi</span>
                          <input type="number" min="1" value={phaseDurations.SEPOLIA_TO_HOODI} onChange={(e) => updateDuration('SEPOLIA_TO_HOODI', parseInt(e.target.value) || 1)} className="px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 w-10 text-center text-[10px]" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400" title={DURATION_LABELS.HOODI_TO_MAINNET.description}>Hoodi → Mainnet</span>
                          <input type="number" min="1" value={phaseDurations.HOODI_TO_MAINNET} onChange={(e) => updateDuration('HOODI_TO_MAINNET', parseInt(e.target.value) || 1)} className="px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 w-10 text-center text-[10px]" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="sticky left-0 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-r border-slate-200 dark:border-slate-600">
                          Phase
                        </th>
                        <th className={`px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider ${mobileFork === 'fusaka' ? '' : 'hidden'} md:table-cell`}>
                          Fusaka
                        </th>
                        <th className={`px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider ${mobileFork === 'glamsterdam' ? '' : 'hidden'} md:table-cell`}>
                          <a
                            href="https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-purple-600 dark:hover:text-purple-400"
                            title="Glamsterdam upgrade meta thread"
                          >
                            Glamsterdam
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </th>
                        <th className={`px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider ${mobileFork === 'hegota' ? '' : 'hidden'} md:table-cell`}>
                          <a
                            href="https://ethereum-magicians.org/t/eip-8081-heka-bogota-network-upgrade-meta-thread/26876"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-purple-600 dark:hover:text-purple-400"
                            title="Hegotá upgrade meta thread"
                          >
                            Hegotá
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {UPGRADE_PROCESS_PHASES.filter(phase =>
                      phase.id !== 'mainnet-deployment' &&
                      phase.id !== 'public-testnets' &&
                      phase.id !== 'fork-focus'
                    ).map((phase) => {
                      const fusakaPhase = FUSAKA_PROGRESS.phases.find(p => p.phaseId === phase.id);
                      const glamsterdamPhase = dynamicGlamsterdamProjection.phases.find(p => p.phaseId === phase.id);
                      const hegotaPhase = dynamicHegotaProjection.phases.find(p => p.phaseId === phase.id);

                      return (
                        <React.Fragment key={phase.id}>
                          <tr className={(phase.id === 'development' || phase.id === 'headliner-selection' || phase.id === 'eip-selection') ? 'bg-slate-100 dark:bg-slate-700/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}>
                            <td className={`sticky left-0 ${(phase.id === 'development' || phase.id === 'headliner-selection' || phase.id === 'eip-selection') ? 'bg-slate-100 dark:bg-slate-700/50' : 'bg-white dark:bg-slate-800'} px-3 py-1.5 font-medium text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-600`}>
                              {phase.title}
                            </td>
                            <td className={`px-3 py-1.5 ${mobileFork === 'fusaka' ? '' : 'hidden'} md:table-cell`}>
                              {fusakaPhase && phase.id !== 'development' && phase.id !== 'headliner-selection' && phase.id !== 'eip-selection' && (
                                <div className="flex items-center gap-2">
                                  <div className={`inline-flex items-center justify-center w-4 py-0.5 rounded text-xs font-medium ${
                                    fusakaPhase.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                    fusakaPhase.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                  }`}>
                                    {fusakaPhase.status === 'completed' ? '✓' : fusakaPhase.status === 'in-progress' ? '→' : '○'}
                                  </div>
                                  <div className="text-slate-700 dark:text-slate-300 text-sm">
                                    {fusakaPhase.actualEndDate ? fusakaPhase.actualEndDate :
                                     fusakaPhase.projectedDate || fusakaPhase.actualStartDate}
                                  </div>
                                </div>
                              )}
                              {phase.id === 'development' && (
                                <span className="text-slate-500 dark:text-slate-400 text-sm">6 devnets</span>
                              )}
                            </td>
                            <td className={`px-3 py-1.5 ${mobileFork === 'glamsterdam' ? '' : 'hidden'} md:table-cell`}>
                              {glamsterdamPhase && phase.id !== 'development' && phase.id !== 'headliner-selection' && phase.id !== 'eip-selection' && (
                                <div className="flex items-center gap-2">
                                  <div className={`inline-flex items-center justify-center w-4 py-0.5 rounded text-xs font-medium ${
                                    glamsterdamPhase.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                    glamsterdamPhase.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                  }`}>
                                    {glamsterdamPhase.status === 'completed' ? '✓' : glamsterdamPhase.status === 'in-progress' ? '→' : '○'}
                                  </div>
                                  <div className="text-slate-700 dark:text-slate-300 text-sm">
                                    {glamsterdamPhase.actualEndDate || glamsterdamPhase.projectedDate || glamsterdamPhase.actualStartDate}
                                  </div>
                                </div>
                              )}
                              {phase.id === 'development' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 dark:text-slate-400 text-sm">{glamsterdamDevnetCount} devnets</span>
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => setGlamsterdamDevnetCount(Math.max(1, glamsterdamDevnetCount - 1))}
                                      className="px-1.5 py-0.5 text-sm bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-l border border-slate-300 dark:border-slate-500"
                                      title="Remove devnet"
                                    >
                                      −
                                    </button>
                                    <button
                                      onClick={() => setGlamsterdamDevnetCount(glamsterdamDevnetCount + 1)}
                                      className="px-1.5 py-0.5 text-sm bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-r border border-l-0 border-slate-300 dark:border-slate-500"
                                      title="Add devnet"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className={`px-3 py-1.5 ${mobileFork === 'hegota' ? '' : 'hidden'} md:table-cell`}>
                              {hegotaPhase && phase.id !== 'development' && phase.id !== 'headliner-selection' && phase.id !== 'eip-selection' && (
                                <div className="flex items-center gap-2">
                                  <div className={`inline-flex items-center justify-center w-4 py-0.5 rounded text-xs font-medium ${
                                    hegotaPhase.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                    hegotaPhase.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                  }`}>
                                    {hegotaPhase.status === 'completed' ? '✓' : hegotaPhase.status === 'in-progress' ? '→' : '○'}
                                  </div>
                                  <div className="text-slate-700 dark:text-slate-300 text-sm">
                                    {hegotaPhase.projectedDate}
                                  </div>
                                </div>
                              )}
                              {phase.id === 'development' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 dark:text-slate-400 text-sm">{hegotaDevnetCount} devnets</span>
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => setHegotaDevnetCount(Math.max(1, hegotaDevnetCount - 1))}
                                      className="px-1.5 py-0.5 text-sm bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-l border border-slate-300 dark:border-slate-500"
                                      title="Remove devnet"
                                    >
                                      −
                                    </button>
                                    <button
                                      onClick={() => setHegotaDevnetCount(hegotaDevnetCount + 1)}
                                      className="px-1.5 py-0.5 text-sm bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-r border border-l-0 border-slate-300 dark:border-slate-500"
                                      title="Add devnet"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>

                          {/* Substep detail rows (for headliner-selection and eip-selection) */}
                          {(phase.id === 'headliner-selection' || phase.id === 'eip-selection') && (glamsterdamPhase?.substeps || hegotaPhase?.substeps || fusakaPhase?.substeps) && (glamsterdamPhase?.substeps || hegotaPhase?.substeps || fusakaPhase?.substeps)!.map((substep, idx) => {
                            const fusakaSubstep = fusakaPhase?.substeps?.[idx];
                            const glamsterdamSubstep = glamsterdamPhase?.substeps?.[idx];
                            const hegotaSubstep = hegotaPhase?.substeps?.[idx];
                            const fusakaGap = fusakaSubstep ? calculateGap(fusakaSubstep.date || fusakaSubstep.projectedDate, 'fusaka') : { text: '', isNegative: false };
                            const glamsterdamCalcDate = glamsterdamSubstep?.date || glamsterdamSubstep?.projectedDate || '';
                            const glamsterdamEffectiveDate = getEffectiveDate('glamsterdam', phase.id, substep.name, glamsterdamCalcDate);
                            const glamsterdamGap = glamsterdamSubstep ? calculateGap(glamsterdamEffectiveDate, 'glamsterdam') : { text: '', isNegative: false };
                            const hegotaCalcDate = hegotaSubstep?.projectedDate || '';
                            const hegotaEffectiveDate = getEffectiveDate('hegota', phase.id, substep.name, hegotaCalcDate);
                            const hegotaGap = hegotaSubstep ? calculateGap(hegotaEffectiveDate, 'hegota') : { text: '', isNegative: false };

                            // Calculate duration warnings based on substep transitions
                            // Selection Date: from Proposal Deadline (HEADLINER_SELECTION_DURATION)
                            // PFI Deadline: from Selection Date (SELECTION_TO_EIP_PFI)
                            // CFI Deadline: from PFI Deadline (EIP_PFI_DURATION)
                            const getDurationConfig = (name: string): { prevPhase: string; prevItem: string; expected: number } | null => {
                              if (name === 'Selection Date') return { prevPhase: 'headliner-selection', prevItem: 'Proposal Deadline', expected: phaseDurations.HEADLINER_SELECTION_DURATION };
                              if (name === 'PFI Deadline') return { prevPhase: 'headliner-selection', prevItem: 'Selection Date', expected: phaseDurations.SELECTION_TO_EIP_PFI };
                              if (name === 'CFI Deadline') return { prevPhase: 'eip-selection', prevItem: 'PFI Deadline', expected: phaseDurations.EIP_PFI_DURATION };
                              return null;
                            };

                            const durationConfig = getDurationConfig(substep.name);
                            const getPhaseProgress = (fork: string) => {
                              if (fork === 'fusaka') return FUSAKA_PROGRESS;
                              if (fork === 'glamsterdam') return dynamicGlamsterdamProjection;
                              return dynamicHegotaProjection;
                            };
                            const calcDurationWarning = (fork: string, currentDate: string) => {
                              if (!durationConfig || !currentDate) return null;
                              const progress = getPhaseProgress(fork);
                              const prevPhaseData = progress.phases.find(p => p.phaseId === durationConfig.prevPhase);
                              const prevSubstep = prevPhaseData?.substeps?.find(s => s.name === durationConfig.prevItem);
                              const prevDate = prevSubstep?.date || prevSubstep?.projectedDate || '';
                              const prevEffectiveDate = getEffectiveDate(fork, durationConfig.prevPhase, durationConfig.prevItem, prevDate);
                              return getDurationWarning(prevEffectiveDate, currentDate, durationConfig.expected);
                            };

                            const glamsterdamDuration = calcDurationWarning('glamsterdam', glamsterdamEffectiveDate);
                            const hegotaDuration = calcDurationWarning('hegota', hegotaEffectiveDate);

                            return (
                            <tr key={`${phase.id}-substep-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 bg-slate-50/50 dark:bg-slate-800/50">
                              <td className="sticky left-0 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-1.5 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600 pl-8 text-sm">
                                {substep.name}
                              </td>
                              <td className={`px-3 py-1.5 ${mobileFork === 'fusaka' ? '' : 'hidden'} md:table-cell`}>
                                <EditableDateCell
                                  fork="fusaka"
                                  phaseId={phase.id}
                                  itemName={substep.name}
                                  calculatedDate={fusakaSubstep?.date || fusakaSubstep?.projectedDate || ''}
                                  isCompleted={fusakaSubstep?.status === 'completed'}
                                  isEditable={false}
                                  lockedDates={lockedDates}
                                  onLock={lockDate}
                                  onUnlock={unlockDate}
                                  gapText={fusakaGap.text}
                                  gapIsNegative={fusakaGap.isNegative}
                                />
                              </td>
                              <td className={`px-3 py-1.5 ${mobileFork === 'glamsterdam' ? '' : 'hidden'} md:table-cell`}>
                                {glamsterdamSubstep ? (
                                  <EditableDateCell
                                    fork="glamsterdam"
                                    phaseId={phase.id}
                                    itemName={substep.name}
                                    calculatedDate={glamsterdamSubstep.date || glamsterdamSubstep.projectedDate || ''}
                                    isCompleted={glamsterdamSubstep.status === 'completed'}
                                    isEditable={glamsterdamSubstep.status !== 'completed'}
                                    lockedDates={lockedDates}
                                    onLock={lockDate}
                                    onUnlock={unlockDate}
                                    gapText={glamsterdamDuration ? `(${glamsterdamDuration.days >= 0 ? '+' : ''}${glamsterdamDuration.days}d)` : glamsterdamGap.text}
                                    gapIsNegative={glamsterdamDuration ? glamsterdamDuration.days < 0 : glamsterdamGap.isNegative}
                                    gapIsWarning={glamsterdamDuration?.isUnderExpected && glamsterdamDuration.days >= 0}
                                  />
                                ) : null}
                              </td>
                              <td className={`px-3 py-1.5 ${mobileFork === 'hegota' ? '' : 'hidden'} md:table-cell`}>
                                {hegotaSubstep ? (
                                  <EditableDateCell
                                    fork="hegota"
                                    phaseId={phase.id}
                                    itemName={substep.name}
                                    calculatedDate={hegotaSubstep.projectedDate || ''}
                                    isCompleted={hegotaSubstep.status === 'completed'}
                                    isEditable={hegotaSubstep.status !== 'completed'}
                                    lockedDates={lockedDates}
                                    onLock={lockDate}
                                    onUnlock={unlockDate}
                                    gapText={hegotaDuration ? `(${hegotaDuration.days >= 0 ? '+' : ''}${hegotaDuration.days}d)` : hegotaGap.text}
                                    gapIsNegative={hegotaDuration ? hegotaDuration.days < 0 : hegotaGap.isNegative}
                                    gapIsWarning={hegotaDuration?.isUnderExpected && hegotaDuration.days >= 0}
                                    isSourceLocked={phase.id === 'headliner-selection' && (substep.name === 'Proposal Deadline' || substep.name === 'Selection Date')}
                                  />
                                ) : null}
                              </td>
                            </tr>
                          );
                          })}

                          {/* Devnet detail rows - iterate over max devnet count across all forks */}
                          {phase.id === 'development' && (() => {
                            const fusakaDevnetCount = fusakaPhase?.devnets?.length || 0;
                            const glamDevnetCount = glamsterdamPhase?.devnets?.length || 0;
                            const hegotaDevnetCount = hegotaPhase?.devnets?.length || 0;
                            const maxDevnets = Math.max(fusakaDevnetCount, glamDevnetCount, hegotaDevnetCount);

                            return Array.from({ length: maxDevnets }, (_, idx) => {
                              const fusakaDevnet = fusakaPhase?.devnets?.[idx];
                              const glamDevnet = glamsterdamPhase?.devnets?.[idx];
                              const hegotaDevnet = hegotaPhase?.devnets?.[idx];
                              const devnetName = `Devnet-${idx}`;

                              return (
                                <tr key={`${phase.id}-devnet-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 bg-slate-50/50 dark:bg-slate-800/50">
                                  <td className="sticky left-0 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-1.5 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600 pl-8 text-sm">
                                    {devnetName}
                                  </td>
                                  <td className={`px-3 py-1.5 ${mobileFork === 'fusaka' ? '' : 'hidden'} md:table-cell`}>
                                    {fusakaDevnet ? (() => {
                                      const fusakaDevnetGap = calculateGap(fusakaDevnet.date || fusakaDevnet.projectedDate, 'fusaka');
                                      return (
                                        <EditableDateCell
                                          fork="fusaka"
                                          phaseId="development"
                                          itemName={devnetName}
                                          calculatedDate={fusakaDevnet.date || fusakaDevnet.projectedDate || ''}
                                          isCompleted={fusakaDevnet.status === 'completed'}
                                          isEditable={false}
                                          lockedDates={lockedDates}
                                          onLock={lockDate}
                                          onUnlock={unlockDate}
                                          gapText={fusakaDevnetGap.text}
                                          gapIsNegative={fusakaDevnetGap.isNegative}
                                        />
                                      );
                                    })() : (
                                      <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                                    )}
                                  </td>
                                  <td className={`px-3 py-1.5 ${mobileFork === 'glamsterdam' ? '' : 'hidden'} md:table-cell`}>
                                    {glamDevnet ? (() => {
                                      const glamDevnetDate = glamDevnet.date || glamDevnet.projectedDate || '';
                                      const effectiveGlamDevnetDate = getEffectiveDate('glamsterdam', 'development', devnetName, glamDevnetDate);
                                      const glamDevnetGap = calculateGap(effectiveGlamDevnetDate, 'glamsterdam');
                                      return (
                                        <EditableDateCell
                                          fork="glamsterdam"
                                          phaseId="development"
                                          itemName={devnetName}
                                          calculatedDate={glamDevnetDate}
                                          isCompleted={glamDevnet.status === 'completed'}
                                          isEditable={true}
                                          lockedDates={lockedDates}
                                          onLock={lockDate}
                                          onUnlock={unlockDate}
                                          gapText={glamDevnetGap.text}
                                          gapIsNegative={glamDevnetGap.isNegative}
                                        />
                                      );
                                    })() : (
                                      <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                                    )}
                                  </td>
                                  <td className={`px-3 py-1.5 ${mobileFork === 'hegota' ? '' : 'hidden'} md:table-cell`}>
                                    {hegotaDevnet ? (() => {
                                      const hegotaDevnetDate = hegotaDevnet.date || hegotaDevnet.projectedDate || '';
                                      const effectiveHegotaDevnetDate = getEffectiveDate('hegota', 'development', devnetName, hegotaDevnetDate);
                                      const hegotaDevnetGap = calculateGap(effectiveHegotaDevnetDate, 'hegota');
                                      return (
                                        <EditableDateCell
                                          fork="hegota"
                                          phaseId="development"
                                          itemName={devnetName}
                                          calculatedDate={hegotaDevnetDate}
                                          isCompleted={hegotaDevnet.status === 'completed'}
                                          isEditable={true}
                                          lockedDates={lockedDates}
                                          onLock={lockDate}
                                          onUnlock={unlockDate}
                                          gapText={hegotaDevnetGap.text}
                                          gapIsNegative={hegotaDevnetGap.isNegative}
                                        />
                                      );
                                    })() : (
                                      <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </React.Fragment>
                      );
                    })}

                    {/* Public Testnets Header Row */}
                    <tr className="bg-slate-100 dark:bg-slate-700/50">
                      <td className="sticky left-0 bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 font-medium text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-600">
                        Public Testnets
                      </td>
                      <td className={`px-3 py-1.5 ${mobileFork === 'fusaka' ? '' : 'hidden'} md:table-cell`}></td>
                      <td className={`px-3 py-1.5 ${mobileFork === 'glamsterdam' ? '' : 'hidden'} md:table-cell`}></td>
                      <td className={`px-3 py-1.5 ${mobileFork === 'hegota' ? '' : 'hidden'} md:table-cell`}></td>
                    </tr>

                    {/* Testnet detail rows */}
                    {FUSAKA_PROGRESS.phases.find(p => p.phaseId === 'public-testnets')?.testnets?.map((testnet, idx) => {
                      const fusakaTestnetPhase = FUSAKA_PROGRESS.phases.find(p => p.phaseId === 'public-testnets');
                      const glamsterdamTestnetPhase = dynamicGlamsterdamProjection.phases.find(p => p.phaseId === 'public-testnets');
                      const hegotaTestnetPhase = dynamicHegotaProjection.phases.find(p => p.phaseId === 'public-testnets');

                      return (
                        <tr key={`testnet-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 bg-slate-50/50 dark:bg-slate-800/50">
                          <td className="sticky left-0 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-1.5 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600 pl-8 text-sm">
                            {testnet.name}
                          </td>
                          <td className={`px-3 py-1.5 ${mobileFork === 'fusaka' ? '' : 'hidden'} md:table-cell`}>
                            {fusakaTestnetPhase?.testnets?.[idx] && (() => {
                              const fusakaTestnet = fusakaTestnetPhase.testnets[idx];
                              const fusakaTestnetGap = calculateGap(fusakaTestnet.date || fusakaTestnet.projectedDate, 'fusaka');
                              return (
                                <EditableDateCell
                                  fork="fusaka"
                                  phaseId="public-testnets"
                                  itemName={testnet.name}
                                  calculatedDate={fusakaTestnet.date || fusakaTestnet.projectedDate || ''}
                                  isCompleted={fusakaTestnet.status === 'completed'}
                                  isEditable={false}
                                  lockedDates={lockedDates}
                                  onLock={lockDate}
                                  onUnlock={unlockDate}
                                  gapText={fusakaTestnetGap.text}
                                  gapIsNegative={fusakaTestnetGap.isNegative}
                                />
                              );
                            })()}
                          </td>
                          <td className={`px-3 py-1.5 ${mobileFork === 'glamsterdam' ? '' : 'hidden'} md:table-cell`}>
                            {glamsterdamTestnetPhase?.testnets?.[idx] && (
                              glamsterdamTestnetPhase.testnets[idx].status === 'deprecated' ? (
                                <div className="text-slate-400 dark:text-slate-500 text-sm italic">Deprecated</div>
                              ) : (() => {
                                const glamTestnet = glamsterdamTestnetPhase.testnets[idx];
                                const glamTestnetDate = glamTestnet.date || glamTestnet.projectedDate || '';
                                const effectiveGlamTestnetDate = getEffectiveDate('glamsterdam', 'public-testnets', testnet.name, glamTestnetDate);
                                const glamTestnetGap = calculateGap(effectiveGlamTestnetDate, 'glamsterdam');
                                return (
                                  <EditableDateCell
                                    fork="glamsterdam"
                                    phaseId="public-testnets"
                                    itemName={testnet.name}
                                    calculatedDate={glamTestnetDate}
                                    isCompleted={glamTestnet.status === 'completed'}
                                    isEditable={true}
                                    lockedDates={lockedDates}
                                    onLock={lockDate}
                                    onUnlock={unlockDate}
                                    gapText={glamTestnetGap.text}
                                    gapIsNegative={glamTestnetGap.isNegative}
                                  />
                                );
                              })()
                            )}
                          </td>
                          <td className={`px-3 py-1.5 ${mobileFork === 'hegota' ? '' : 'hidden'} md:table-cell`}>
                            {hegotaTestnetPhase?.testnets?.[idx] && (
                              hegotaTestnetPhase.testnets[idx].status === 'deprecated' ? (
                                <div className="text-slate-400 dark:text-slate-500 text-sm italic">Deprecated</div>
                              ) : (() => {
                                const hegotaTestnet = hegotaTestnetPhase.testnets[idx];
                                const hegotaTestnetDate = hegotaTestnet.date || hegotaTestnet.projectedDate || '';
                                const effectiveHegotaTestnetDate = getEffectiveDate('hegota', 'public-testnets', testnet.name, hegotaTestnetDate);
                                const hegotaTestnetGap = calculateGap(effectiveHegotaTestnetDate, 'hegota');
                                return (
                                  <EditableDateCell
                                    fork="hegota"
                                    phaseId="public-testnets"
                                    itemName={testnet.name}
                                    calculatedDate={hegotaTestnetDate}
                                    isCompleted={hegotaTestnet.status === 'completed'}
                                    isEditable={true}
                                    lockedDates={lockedDates}
                                    onLock={lockDate}
                                    onUnlock={unlockDate}
                                    gapText={hegotaTestnetGap.text}
                                    gapIsNegative={hegotaTestnetGap.isNegative}
                                  />
                                );
                              })()
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 dark:bg-slate-700/50 font-semibold">
                      <td className="sticky left-0 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-600 text-sm">
                        Mainnet Target
                      </td>
                      <td className={`px-3 py-1.5 text-slate-900 dark:text-slate-100 text-sm ${mobileFork === 'fusaka' ? '' : 'hidden'} md:table-cell`}>
                        <div className="flex flex-col">
                          <span>Dec 3, 2025</span>
                          {(() => {
                            const gap = calculateGap('Dec 3, 2025', 'fusaka');
                            return gap.text && (
                              <span className={`text-xs ${gap.isNegative ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                                {gap.text}
                              </span>
                            );
                          })()}
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                            {formatMonthsDays(pectraMainnet, fusakaMainnet)} after Pectra
                          </span>
                        </div>
                      </td>
                      <td className={`px-3 py-1.5 ${mobileFork === 'glamsterdam' ? '' : 'hidden'} md:table-cell`}>
                        <div className="flex flex-col gap-1">
                          <input
                            type="date"
                            value={glamsterdamMainnetDate}
                            onChange={(e) => setGlamsterdamMainnetDate(e.target.value)}
                            className="px-1.5 py-0.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                            title="Click to adjust Glamsterdam mainnet date"
                          />
                          {(() => {
                            const glamDate = parseLocalDate(glamsterdamMainnetDate);
                            const dateStr = glamDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            const gap = calculateGap(dateStr, 'glamsterdam');
                            return gap.text && (
                              <span className={`text-xs ${gap.isNegative ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                                {gap.text}
                              </span>
                            );
                          })()}
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                            {formatMonthsDays(fusakaMainnet, glamsterdamMainnet)} after Fusaka
                          </span>
                        </div>
                      </td>
                      <td className={`px-3 py-1.5 ${mobileFork === 'hegota' ? '' : 'hidden'} md:table-cell`}>
                        <div className="flex flex-col gap-1">
                          <input
                            type="date"
                            value={hegotaMainnetDate}
                            onChange={(e) => setHegotaMainnetDate(e.target.value)}
                            className="px-1.5 py-0.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                            title="Click to adjust Hegota mainnet date"
                          />
                          {(() => {
                            const hegotaDate = parseLocalDate(hegotaMainnetDate);
                            const dateStr = hegotaDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            const gap = calculateGap(dateStr, 'hegota');
                            return gap.text && (
                              <span className={`text-xs ${gap.isNegative ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                                {gap.text}
                              </span>
                            );
                          })()}
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                            {formatMonthsDays(glamsterdamMainnet, hegotaMainnet)} after Glamsterdam
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Gantt Chart Timeline View */}
        <div className="mb-10">
          <ForkGanttChart
            forks={[
              { name: 'Fusaka', progress: FUSAKA_PROGRESS, color: '#10b981' },
              { name: 'Glamsterdam', progress: dynamicGlamsterdamProjection, color: '#6366f1' },
              { name: 'Hegota', progress: dynamicHegotaProjection, color: '#f59e0b' },
            ]}
            startDate={new Date(2025, 4, 1)} // May 2025
            monthsToShow={(() => {
              // Calculate months from May 2025 to Hegota mainnet + 1 month buffer
              const start = new Date(2025, 4, 1);
              const hegotaDate = parseLocalDate(hegotaMainnetDate);
              const months = (hegotaDate.getFullYear() - start.getFullYear()) * 12
                + (hegotaDate.getMonth() - start.getMonth()) + 2; // +2 for buffer
              return Math.max(months, 12); // At least 12 months
            })()}
          />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>
            Feedback?{' '}
            <a
              href="mailto:nixo@ethereum.org"
              onClick={() => handleExternalLinkClick('email_contact', 'mailto:nixo@ethereum.org')}
              className="underline hover:text-slate-600 dark:hover:text-slate-300"
            >
              nixo
            </a>
            {' '}or{' '}
            <a
              href="https://x.com/wolovim"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleExternalLinkClick('twitter_contact', 'https://x.com/wolovim')}
              className="underline hover:text-slate-600 dark:hover:text-slate-300"
            >
              @wolovim
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
