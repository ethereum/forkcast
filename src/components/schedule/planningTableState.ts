import { DEFAULT_PHASE_DURATIONS, PhaseDurations } from './forkDateCalculator';

export const STORAGE_KEY = 'forkcast-planning-table';
const STORAGE_VERSION = 1;
const OLD_GLAMSTERDAM_MAINNET_DATE_DEFAULT = '2026-08-26';

export interface PlanningTableState {
  glamsterdamMainnetDate: string;
  hegotaMainnetDate: string;
  glamsterdamDevnetCount: number;
  hegotaDevnetCount: number;
  lockedDates: Record<string, string>;
  phaseDurations: PhaseDurations;
}

type PlanningTableOverrides = Partial<Omit<PlanningTableState, 'phaseDurations'>> & {
  phaseDurations?: Partial<PhaseDurations>;
};

interface SavedPlanningTableRecord {
  version: typeof STORAGE_VERSION;
  overrides: PlanningTableOverrides;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const DEFAULT_STATE: PlanningTableState = {
  glamsterdamMainnetDate: '2026-09-02',
  hegotaMainnetDate: '2027-03-01',
  glamsterdamDevnetCount: 7,
  hegotaDevnetCount: 5,
  lockedDates: {},
  phaseDurations: DEFAULT_PHASE_DURATIONS,
};

const LEGACY_DEFAULT_STATE: PlanningTableState = {
  ...DEFAULT_STATE,
  glamsterdamMainnetDate: OLD_GLAMSTERDAM_MAINNET_DATE_DEFAULT,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every(item => typeof item === 'string');

const isPhaseDurationKey = (key: string): key is keyof PhaseDurations =>
  key in DEFAULT_PHASE_DURATIONS;

const readPhaseDurationOverrides = (value: unknown): Partial<PhaseDurations> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const overrides: Partial<PhaseDurations> = {};
  for (const [key, duration] of Object.entries(value)) {
    if (isPhaseDurationKey(key) && typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
      overrides[key] = duration;
    }
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined;
};

const readPlanningTableOverrides = (value: unknown): PlanningTableOverrides => {
  if (!isRecord(value)) {
    return {};
  }

  const overrides: PlanningTableOverrides = {};

  if (typeof value.glamsterdamMainnetDate === 'string') {
    overrides.glamsterdamMainnetDate = value.glamsterdamMainnetDate;
  }

  if (typeof value.hegotaMainnetDate === 'string') {
    overrides.hegotaMainnetDate = value.hegotaMainnetDate;
  }

  if (typeof value.glamsterdamDevnetCount === 'number' && Number.isFinite(value.glamsterdamDevnetCount) && value.glamsterdamDevnetCount > 0) {
    overrides.glamsterdamDevnetCount = value.glamsterdamDevnetCount;
  }

  if (typeof value.hegotaDevnetCount === 'number' && Number.isFinite(value.hegotaDevnetCount) && value.hegotaDevnetCount > 0) {
    overrides.hegotaDevnetCount = value.hegotaDevnetCount;
  }

  if (isStringRecord(value.lockedDates) && Object.keys(value.lockedDates).length > 0) {
    overrides.lockedDates = value.lockedDates;
  }

  const phaseDurations = readPhaseDurationOverrides(value.phaseDurations);
  if (phaseDurations) {
    overrides.phaseDurations = phaseDurations;
  }

  return overrides;
};

const applyOverrides = (overrides: PlanningTableOverrides): PlanningTableState => ({
  ...DEFAULT_STATE,
  ...overrides,
  lockedDates: overrides.lockedDates ?? DEFAULT_STATE.lockedDates,
  phaseDurations: { ...DEFAULT_PHASE_DURATIONS, ...overrides.phaseDurations },
});

const hasOverrides = (overrides: PlanningTableOverrides): boolean =>
  Object.keys(overrides).some(key => {
    const value = overrides[key as keyof PlanningTableOverrides];
    return isRecord(value) ? Object.keys(value).length > 0 : value !== undefined;
  });

const addScalarLegacyOverride = <Key extends keyof Omit<PlanningTableState, 'lockedDates' | 'phaseDurations'>>(
  overrides: PlanningTableOverrides,
  key: Key,
  value: PlanningTableState[Key]
) => {
  if (value !== DEFAULT_STATE[key] && value !== LEGACY_DEFAULT_STATE[key]) {
    overrides[key] = value;
  }
};

const legacyOverridesFromSnapshot = (snapshot: PlanningTableOverrides): PlanningTableOverrides => {
  const overrides: PlanningTableOverrides = {};

  if (snapshot.glamsterdamMainnetDate) {
    addScalarLegacyOverride(overrides, 'glamsterdamMainnetDate', snapshot.glamsterdamMainnetDate);
  }

  if (snapshot.hegotaMainnetDate) {
    addScalarLegacyOverride(overrides, 'hegotaMainnetDate', snapshot.hegotaMainnetDate);
  }

  if (snapshot.glamsterdamDevnetCount) {
    addScalarLegacyOverride(overrides, 'glamsterdamDevnetCount', snapshot.glamsterdamDevnetCount);
  }

  if (snapshot.hegotaDevnetCount) {
    addScalarLegacyOverride(overrides, 'hegotaDevnetCount', snapshot.hegotaDevnetCount);
  }

  if (snapshot.lockedDates && Object.keys(snapshot.lockedDates).length > 0) {
    overrides.lockedDates = snapshot.lockedDates;
  }

  if (snapshot.phaseDurations) {
    const phaseDurations = Object.fromEntries(
      Object.entries(snapshot.phaseDurations).filter(([key, duration]) =>
        isPhaseDurationKey(key) && duration !== DEFAULT_PHASE_DURATIONS[key]
      )
    ) as Partial<PhaseDurations>;

    if (Object.keys(phaseDurations).length > 0) {
      overrides.phaseDurations = phaseDurations;
    }
  }

  return overrides;
};

export const deserializePlanningTableState = (stored: string | null): PlanningTableState => {
  if (!stored) {
    return DEFAULT_STATE;
  }

  const parsed: unknown = JSON.parse(stored);

  if (isRecord(parsed) && parsed.version === STORAGE_VERSION) {
    return applyOverrides(readPlanningTableOverrides(parsed.overrides));
  }

  return applyOverrides(legacyOverridesFromSnapshot(readPlanningTableOverrides(parsed)));
};

export const createPlanningTableStorageRecord = (state: PlanningTableState): SavedPlanningTableRecord | null => {
  const overrides: PlanningTableOverrides = {};

  if (state.glamsterdamMainnetDate !== DEFAULT_STATE.glamsterdamMainnetDate) {
    overrides.glamsterdamMainnetDate = state.glamsterdamMainnetDate;
  }

  if (state.hegotaMainnetDate !== DEFAULT_STATE.hegotaMainnetDate) {
    overrides.hegotaMainnetDate = state.hegotaMainnetDate;
  }

  if (state.glamsterdamDevnetCount !== DEFAULT_STATE.glamsterdamDevnetCount) {
    overrides.glamsterdamDevnetCount = state.glamsterdamDevnetCount;
  }

  if (state.hegotaDevnetCount !== DEFAULT_STATE.hegotaDevnetCount) {
    overrides.hegotaDevnetCount = state.hegotaDevnetCount;
  }

  if (Object.keys(state.lockedDates).length > 0) {
    overrides.lockedDates = state.lockedDates;
  }

  const phaseDurations = Object.fromEntries(
    Object.entries(state.phaseDurations).filter(([key, duration]) =>
      isPhaseDurationKey(key) && duration !== DEFAULT_PHASE_DURATIONS[key]
    )
  ) as Partial<PhaseDurations>;

  if (Object.keys(phaseDurations).length > 0) {
    overrides.phaseDurations = phaseDurations;
  }

  return hasOverrides(overrides) ? { version: STORAGE_VERSION, overrides } : null;
};

export const loadPlanningTableStateFromStorage = (storage: StorageLike): PlanningTableState =>
  deserializePlanningTableState(storage.getItem(STORAGE_KEY));

export const savePlanningTableStateToStorage = (storage: StorageLike, state: PlanningTableState): void => {
  const record = createPlanningTableStorageRecord(state);

  if (!record) {
    storage.removeItem(STORAGE_KEY);
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(record));
};

export const clearPlanningTableStateFromStorage = (storage: StorageLike): void => {
  storage.removeItem(STORAGE_KEY);
};

