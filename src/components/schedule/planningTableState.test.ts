import { describe, expect, it } from 'vitest';
import {
  createPlanningTableStorageRecord,
  DEFAULT_STATE,
  deserializePlanningTableState,
  savePlanningTableStateToStorage,
  STORAGE_KEY,
} from './planningTableState';

const makeStorage = (initial?: string) => {
  const values = new Map<string, string>();
  if (initial !== undefined) {
    values.set(STORAGE_KEY, initial);
  }

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
};

describe('planning table state persistence', () => {
  it('does not persist default planning state', () => {
    expect(createPlanningTableStorageRecord(DEFAULT_STATE)).toBeNull();

    const storage = makeStorage('old value');
    savePlanningTableStateToStorage(storage, DEFAULT_STATE);

    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('stores only explicit overrides in a versioned record', () => {
    const record = createPlanningTableStorageRecord({
      ...DEFAULT_STATE,
      glamsterdamMainnetDate: '2026-10-01',
      phaseDurations: {
        ...DEFAULT_STATE.phaseDurations,
        HOODI_TO_MAINNET: 42,
      },
    });

    expect(record).toEqual({
      version: 1,
      overrides: {
        glamsterdamMainnetDate: '2026-10-01',
        phaseDurations: {
          HOODI_TO_MAINNET: 42,
        },
      },
    });
  });

  it('loads versioned overrides over current defaults', () => {
    const state = deserializePlanningTableState(JSON.stringify({
      version: 1,
      overrides: {
        lockedDates: {
          'glamsterdam:development:Devnet-0': 'May 1, 2026',
        },
        phaseDurations: {
          HOODI_TO_MAINNET: 42,
        },
      },
    }));

    expect(state).toEqual({
      ...DEFAULT_STATE,
      lockedDates: {
        'glamsterdam:development:Devnet-0': 'May 1, 2026',
      },
      phaseDurations: {
        ...DEFAULT_STATE.phaseDurations,
        HOODI_TO_MAINNET: 42,
      },
    });
  });

  it('drops legacy full snapshots that only pinned old defaults', () => {
    const state = deserializePlanningTableState(JSON.stringify({
      glamsterdamMainnetDate: '2026-08-26',
      hegotaMainnetDate: DEFAULT_STATE.hegotaMainnetDate,
      glamsterdamDevnetCount: DEFAULT_STATE.glamsterdamDevnetCount,
      hegotaDevnetCount: DEFAULT_STATE.hegotaDevnetCount,
      lockedDates: {},
      phaseDurations: DEFAULT_STATE.phaseDurations,
    }));

    expect(state).toEqual(DEFAULT_STATE);
  });

  it('migrates legacy snapshots that contain real user overrides', () => {
    const state = deserializePlanningTableState(JSON.stringify({
      glamsterdamMainnetDate: '2026-10-01',
      hegotaMainnetDate: DEFAULT_STATE.hegotaMainnetDate,
      glamsterdamDevnetCount: DEFAULT_STATE.glamsterdamDevnetCount,
      hegotaDevnetCount: 8,
      lockedDates: {
        'hegota:eip-selection:CFI Deadline': 'Oct 1, 2026',
      },
      phaseDurations: {
        ...DEFAULT_STATE.phaseDurations,
        EIP_PFI_DURATION: 45,
      },
    }));

    expect(state).toEqual({
      ...DEFAULT_STATE,
      glamsterdamMainnetDate: '2026-10-01',
      hegotaDevnetCount: 8,
      lockedDates: {
        'hegota:eip-selection:CFI Deadline': 'Oct 1, 2026',
      },
      phaseDurations: {
        ...DEFAULT_STATE.phaseDurations,
        EIP_PFI_DURATION: 45,
      },
    });
  });
});
