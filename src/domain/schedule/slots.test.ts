import { describe, it, expect } from 'vitest';
import {
  buildEpochCandidates,
  byFitThenQuality,
  candidateAtOrAfter,
  candidateBefore,
  epochToSlot,
  EPOCHS_PER_HISTORICAL_ROOT,
  formatUtc,
  hourBand,
  readZone,
  scoreReadings,
  slotToEpoch,
  slotToTimestamp,
  timestampToSlot,
  utcMidnight,
  zoneOptionsWithLocal,
  ZONE_OPTIONS,
  type HourBand,
  type ZoneReading,
} from './slots';

const MAINNET_GENESIS = 1606824023;

describe('slot arithmetic', () => {
  it('places mainnet genesis at slot 0', () => {
    expect(slotToTimestamp(0, MAINNET_GENESIS)).toBe(MAINNET_GENESIS);
    expect(timestampToSlot(MAINNET_GENESIS, MAINNET_GENESIS)).toBe(0);
  });

  it('round-trips a slot through its timestamp', () => {
    const slot = 13164544;
    expect(timestampToSlot(slotToTimestamp(slot, MAINNET_GENESIS), MAINNET_GENESIS)).toBe(slot);
  });

  it('floors a mid-slot timestamp to the slot in progress', () => {
    expect(timestampToSlot(MAINNET_GENESIS + 11, MAINNET_GENESIS)).toBe(0);
    expect(timestampToSlot(MAINNET_GENESIS + 12, MAINNET_GENESIS)).toBe(1);
  });

  it('reproduces the Deneb activation', () => {
    // Epoch 269568 on mainnet, 2024-03-13 13:55:35 UTC.
    expect(formatUtc(slotToTimestamp(epochToSlot(269568), MAINNET_GENESIS))).toBe(
      '2024-03-13 13:55:35',
    );
  });

  it('reproduces the Fusaka activation', () => {
    // Epoch 411392 on mainnet, 2025-12-03 21:49:11 UTC.
    expect(formatUtc(slotToTimestamp(epochToSlot(411392), MAINNET_GENESIS))).toBe(
      '2025-12-03 21:49:11',
    );
  });

  it('maps every slot of an epoch back to it', () => {
    expect(slotToEpoch(epochToSlot(1053))).toBe(1053);
    expect(slotToEpoch(epochToSlot(1053) + 31)).toBe(1053);
    expect(slotToEpoch(epochToSlot(1053) + 32)).toBe(1054);
  });
});

describe('buildEpochCandidates', () => {
  const day = (iso: string) => utcMidnight(iso);

  it('returns every epoch of a UTC day', () => {
    const { candidates, total } = buildEpochCandidates({
      genesisTime: MAINNET_GENESIS,
      from: day('2026-11-05'),
      to: day('2026-11-06'),
      filter: 'all',
      limit: 1000,
    });
    // 86400 / 384 = 225 epochs start in any given day.
    expect(total).toBe(225);
    expect(candidates).toHaveLength(225);
    expect(candidates[0].timestamp).toBeGreaterThanOrEqual(day('2026-11-05'));
    expect(candidates[0].timestamp - 384).toBeLessThan(day('2026-11-05'));
    expect(candidates.at(-1)!.timestamp).toBeLessThan(day('2026-11-06'));
  });

  it('steps the round filter in hundreds', () => {
    const { candidates } = buildEpochCandidates({
      genesisTime: MAINNET_GENESIS,
      from: day('2026-11-05'),
      to: day('2026-11-06'),
      filter: 'round',
      limit: 1000,
    });
    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) expect(candidate.epoch % 100).toBe(0);
  });

  it('only returns historical-root boundaries under that filter', () => {
    const { candidates } = buildEpochCandidates({
      genesisTime: MAINNET_GENESIS,
      from: day('2026-11-01'),
      to: day('2026-12-01'),
      filter: 'historical-root',
      limit: 1000,
    });
    // One every 256 epochs, i.e. every 27.3 hours.
    expect(candidates.length).toBe(27);
    for (const candidate of candidates) {
      expect(candidate.epoch % EPOCHS_PER_HISTORICAL_ROOT).toBe(0);
      expect(candidate.isHistoricalRootBoundary).toBe(true);
    }
  });

  it('flags the historical-root boundary inside an unfiltered window', () => {
    const { candidates } = buildEpochCandidates({
      genesisTime: MAINNET_GENESIS,
      from: day('2026-11-05'),
      to: day('2026-11-06'),
      filter: 'all',
      limit: 1000,
    });
    const boundaries = candidates.filter((candidate) => candidate.isHistoricalRootBoundary);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0].slot % 8192).toBe(0);
  });

  it('reports the overflow rather than rendering it', () => {
    const { candidates, total } = buildEpochCandidates({
      genesisTime: MAINNET_GENESIS,
      from: day('2026-11-05'),
      to: day('2026-11-06'),
      filter: 'all',
      limit: 10,
    });
    expect(candidates).toHaveLength(10);
    expect(total).toBe(225);
  });

  it('skips epochs before genesis', () => {
    const { candidates } = buildEpochCandidates({
      genesisTime: MAINNET_GENESIS,
      from: day('2019-01-01'),
      to: day('2019-01-02'),
      filter: 'all',
      limit: 1000,
    });
    expect(candidates).toEqual([]);
  });

  it('is empty for an inverted window', () => {
    const { candidates, total } = buildEpochCandidates({
      genesisTime: MAINNET_GENESIS,
      from: day('2026-11-06'),
      to: day('2026-11-05'),
      filter: 'all',
      limit: 1000,
    });
    expect(candidates).toEqual([]);
    expect(total).toBe(0);
  });
});

describe('hourBand', () => {
  it('bands the day from working hours out to night', () => {
    expect(hourBand(9)).toBe('work');
    expect(hourBand(17)).toBe('work');
    expect(hourBand(18)).toBe('fringe');
    expect(hourBand(8)).toBe('fringe');
    expect(hourBand(6)).toBe('edge');
    expect(hourBand(22)).toBe('edge');
    expect(hourBand(23)).toBe('night');
    expect(hourBand(0)).toBe('night');
    expect(hourBand(5)).toBe('night');
  });
});

describe('readZone', () => {
  // 2026-11-05 is a Thursday. 14:00 UTC.
  const thursdayAfternoon = utcMidnight('2026-11-05') + 14 * 3600;

  it('reads an instant in UTC', () => {
    expect(readZone(thursdayAfternoon, 'UTC')).toMatchObject({
      time: '14:00',
      hour: 14,
      weekday: 'Thu',
      isWeekend: false,
      dayOffset: 0,
      band: 'work',
    });
  });

  it('shifts an eastern zone onto the next calendar day', () => {
    const reading = readZone(thursdayAfternoon, 'Australia/Brisbane');
    expect(reading.time).toBe('00:00');
    expect(reading.dayOffset).toBe(1);
    expect(reading.weekday).toBe('Fri');
    expect(reading.band).toBe('night');
  });

  it('renders midnight as hour 0, not 24', () => {
    expect(readZone(utcMidnight('2026-11-05'), 'UTC').time).toBe('00:00');
    expect(readZone(utcMidnight('2026-11-05'), 'UTC').hour).toBe(0);
  });

  it('shifts a western zone back a day', () => {
    const reading = readZone(utcMidnight('2026-11-05') + 2 * 3600, 'America/Los_Angeles');
    expect(reading.dayOffset).toBe(-1);
    expect(reading.weekday).toBe('Wed');
  });

  it('follows daylight saving', () => {
    // Europe/London is UTC+1 in July and UTC+0 in January.
    expect(readZone(utcMidnight('2026-07-15') + 12 * 3600, 'Europe/London').time).toBe('13:00');
    expect(readZone(utcMidnight('2026-01-15') + 12 * 3600, 'Europe/London').time).toBe('12:00');
  });

  it('flags a local weekend', () => {
    // Saturday 2026-11-07 in UTC is still Friday evening in Los Angeles.
    const saturdayMorning = utcMidnight('2026-11-07') + 3 * 3600;
    expect(readZone(saturdayMorning, 'UTC').isWeekend).toBe(true);
    expect(readZone(saturdayMorning, 'America/Los_Angeles').isWeekend).toBe(false);
  });
});

describe('scoreReadings', () => {
  const reading = (overrides: Partial<ZoneReading>): ZoneReading => ({
    zone: 'UTC',
    time: '12:00',
    hour: 12,
    weekday: 'Thu',
    isWeekend: false,
    dayOffset: 0,
    band: 'work',
    ...overrides,
  });

  it('counts working zones and ignores the rest', () => {
    const score = scoreReadings([
      reading({}),
      reading({ band: 'fringe' }),
      reading({ band: 'night' }),
    ]);
    expect(score).toMatchObject({ working: 1, asleep: 1, weekend: 0 });
  });

  it('does not count a weekend zone as working', () => {
    const score = scoreReadings([reading({ isWeekend: true, weekday: 'Sat' })]);
    expect(score.working).toBe(0);
    expect(score.weekend).toBe(1);
  });

  it('ranks a shared working hour above a night one', () => {
    const shared = scoreReadings([reading({}), reading({})]);
    const awkward = scoreReadings([reading({}), reading({ band: 'night' })]);
    expect(shared.score).toBeGreaterThan(awkward.score);
  });

  it('ranks a weekday below nothing and a weekend below that', () => {
    const weekday = scoreReadings([reading({ band: 'edge' })]);
    const weekend = scoreReadings([reading({ band: 'edge', isWeekend: true, weekday: 'Sun' })]);
    expect(weekday.score).toBe(0);
    expect(weekend.score).toBeLessThan(weekday.score);
  });

  it('is zero for an empty comparison set', () => {
    expect(scoreReadings([])).toMatchObject({ working: 0, asleep: 0, weekend: 0, score: 0 });
  });
});

describe('zoneOptionsWithLocal', () => {
  it('leaves UTC out of the comparison set', () => {
    expect(ZONE_OPTIONS.some((option) => option.id === 'UTC')).toBe(false);
  });

  it('marks a listed zone rather than duplicating it', () => {
    const options = zoneOptionsWithLocal('Europe/Berlin');
    expect(options).toHaveLength(ZONE_OPTIONS.length);
    expect(options.find((option) => option.id === 'Europe/Berlin')!.label).toBe('Germany · local');
  });

  it('prepends an unlisted zone', () => {
    const options = zoneOptionsWithLocal('America/Argentina/Buenos_Aires');
    expect(options).toHaveLength(ZONE_OPTIONS.length + 1);
    expect(options[0].label).toBe('Buenos Aires · local');
  });

  it('offers only zones the platform can format', () => {
    for (const option of ZONE_OPTIONS) {
      expect(() => readZone(0, option.id)).not.toThrow();
    }
  });
});

describe('candidates just outside a window', () => {
  const day = (iso: string) => utcMidnight(iso);

  // The December 2026 run of mainnet boundaries, which skips the 3rd entirely.
  it('finds the boundary before a day that has one of its own', () => {
    const before = candidateBefore(MAINNET_GENESIS, day('2026-12-02'), 'historical-root')!;
    expect(before.epoch).toBe(493056);
    expect(formatUtc(before.timestamp)).toBe('2026-12-01 20:38:47');
  });

  it('brackets a day with no boundary at all', () => {
    const before = candidateBefore(MAINNET_GENESIS, day('2026-12-03'), 'historical-root')!;
    const after = candidateAtOrAfter(MAINNET_GENESIS, day('2026-12-04'), 'historical-root');
    expect(formatUtc(before.timestamp)).toBe('2026-12-02 23:57:11');
    expect(formatUtc(after.timestamp)).toBe('2026-12-04 03:15:35');
    // Nothing in between, which is why the window itself comes back empty.
    const { total } = buildEpochCandidates({
      genesisTime: MAINNET_GENESIS,
      from: day('2026-12-03'),
      to: day('2026-12-04'),
      filter: 'historical-root',
      limit: 10,
    });
    expect(total).toBe(0);
  });

  it('is strictly before, never the window edge itself', () => {
    const edge = candidateAtOrAfter(MAINNET_GENESIS, day('2026-12-01'), 'historical-root');
    const before = candidateBefore(MAINNET_GENESIS, edge.timestamp, 'historical-root')!;
    expect(before.epoch).toBeLessThan(edge.epoch);
    expect(before.timestamp).toBeLessThan(edge.timestamp);
  });

  it('returns the window edge when it lands exactly on a candidate', () => {
    const edge = candidateAtOrAfter(MAINNET_GENESIS, day('2026-12-01'), 'historical-root');
    expect(candidateAtOrAfter(MAINNET_GENESIS, edge.timestamp, 'historical-root').epoch).toBe(
      edge.epoch,
    );
  });

  it('honours the other filters', () => {
    expect(candidateBefore(MAINNET_GENESIS, day('2026-12-02'), 'round')!.epoch % 100).toBe(0);
    expect(candidateAtOrAfter(MAINNET_GENESIS, day('2026-12-02'), 'all').epoch).toBe(
      buildEpochCandidates({
        genesisTime: MAINNET_GENESIS,
        from: day('2026-12-02'),
        to: day('2026-12-03'),
        filter: 'all',
        limit: 1,
      }).candidates[0].epoch,
    );
  });

  it('has nothing before genesis', () => {
    expect(candidateBefore(MAINNET_GENESIS, MAINNET_GENESIS, 'historical-root')).toBeNull();
    expect(candidateBefore(MAINNET_GENESIS, day('2019-01-01'), 'all')).toBeNull();
  });

  it('agrees with the window builder about what is inside it', () => {
    const from = day('2026-12-05');
    const to = day('2026-12-08');
    const { candidates } = buildEpochCandidates({
      genesisTime: MAINNET_GENESIS,
      from,
      to,
      filter: 'historical-root',
      limit: 50,
    });
    expect(candidateBefore(MAINNET_GENESIS, from, 'historical-root')!.epoch).toBe(
      candidates[0].epoch - EPOCHS_PER_HISTORICAL_ROOT,
    );
    expect(candidateAtOrAfter(MAINNET_GENESIS, to, 'historical-root').epoch).toBe(
      candidates.at(-1)!.epoch + EPOCHS_PER_HISTORICAL_ROOT,
    );
  });
});

describe('ordering', () => {
  const reading = (band: HourBand, isWeekend = false): ZoneReading => ({
    zone: 'UTC',
    time: '12:00',
    hour: 12,
    weekday: isWeekend ? 'Sat' : 'Thu',
    isWeekend,
    dayOffset: 0,
    band,
  });
  const candidate = (bands: ZoneReading[], timestamp = 0) => ({
    score: scoreReadings(bands),
    timestamp,
  });

  it('a weekend night sorts below a weekday night', () => {
    const weekendNight = scoreReadings([reading('night', true)]);
    const weekdayNight = scoreReadings([reading('night')]);
    expect(weekendNight.score).toBeLessThan(weekdayNight.score);
  });

  it('a weekend afternoon beats a weekend night but never scores positively', () => {
    const afternoon = scoreReadings([reading('work', true)]);
    const night = scoreReadings([reading('night', true)]);
    expect(afternoon.score).toBeGreaterThan(night.score);
    expect(afternoon.score).toBeLessThanOrEqual(0);
    expect(afternoon.working).toBe(0);
  });

  it('ranks the higher Fit first, so the column the reader sees is the one sorted', () => {
    // Five working plus two asleep outranks four working plus three fringe, even though
    // the composite prefers the latter.
    const fiveWorking = candidate([
      ...Array(5).fill(reading('work')),
      reading('night'),
      reading('night'),
    ]);
    const fourWorking = candidate([
      ...Array(4).fill(reading('work')),
      ...Array(3).fill(reading('fringe')),
    ]);
    expect(fourWorking.score.score).toBeGreaterThan(fiveWorking.score.score);
    expect([fourWorking, fiveWorking].sort(byFitThenQuality)[0]).toBe(fiveWorking);
  });

  it('breaks a Fit tie on overall quality, then on time', () => {
    const asleep = candidate([reading('work'), reading('night')], 100);
    const fringe = candidate([reading('work'), reading('fringe')], 200);
    expect([asleep, fringe].sort(byFitThenQuality)[0]).toBe(fringe);

    const early = candidate([reading('work')], 100);
    const late = candidate([reading('work')], 200);
    expect([late, early].sort(byFitThenQuality)[0]).toBe(early);
  });

  it('is monotonically non-increasing in Fit once sorted', () => {
    const rows = [
      candidate([reading('work'), reading('fringe')], 1),
      candidate([...Array(2).fill(reading('work'))], 2),
      candidate([reading('night')], 3),
      candidate([...Array(2).fill(reading('work')), reading('night')], 4),
    ].sort(byFitThenQuality);
    const fits = rows.map((row) => row.score.working);
    expect(fits).toEqual([...fits].sort((a, b) => b - a));
  });
});
