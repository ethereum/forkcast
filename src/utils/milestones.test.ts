import { describe, expect, it } from 'vitest';
import {
  addDays,
  callLabel,
  deploymentPhase,
  formatMilestone,
  formatRange,
  mainnetProgress,
  milestoneStatus,
  rangeStatus,
  testnetsProgress
} from './milestones';
import { buildGlamsterdamProgress, buildGlamsterdamTimelinePhases } from '../constants/timeline-phases';
import { buildTimelineEvents } from '../data/events';

describe('formatMilestone', () => {
  it('formats each precision', () => {
    expect(formatMilestone({ date: '2026-10-06' })).toBe('Oct 6, 2026');
    expect(formatMilestone({ date: '2026-10-06' }, 'short')).toBe('Oct 6');
    expect(formatMilestone({ date: '2026-08-13' }, 'prose')).toBe('August 13, 2026');
    expect(formatMilestone({ date: '2026-10-26' }, 'prose-short')).toBe('October 26');
    expect(formatMilestone({ date: '2026-10-01', precision: 'quarter' }, 'short')).toBe('Q4 2026');
    expect(formatMilestone({ date: '2027-04-01', precision: 'quarter' })).toBe('Q2 2027');
    expect(formatMilestone({ date: '2025-06-01', precision: 'month' })).toBe('Jun 2025');
    expect(formatMilestone({ date: '2027-01-01', precision: 'year' })).toBe('2027');
    expect(formatMilestone({})).toBe('TBD');
  });

  it('does not shift the day with the local time zone', () => {
    expect(formatMilestone({ date: '2025-12-03' })).toBe('Dec 3, 2025');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('milestoneStatus', () => {
  it('completes on the day of an agreed date', () => {
    expect(milestoneStatus({ date: '2026-10-26' }, '2026-10-25')).toBe('upcoming');
    expect(milestoneStatus({ date: '2026-10-26' }, '2026-10-26')).toBe('completed');
  });

  it('never completes a proposed, coarse or missing date', () => {
    expect(milestoneStatus({ date: '2026-10-26', proposed: true }, '2027-01-01')).toBe('upcoming');
    expect(milestoneStatus({ date: '2026-10-01', precision: 'quarter' }, '2027-01-01')).toBe('upcoming');
    expect(milestoneStatus(undefined, '2027-01-01')).toBe('upcoming');
  });

  it('derives a window from its ends', () => {
    const start = { date: '2026-04-09' };
    const end = { date: '2026-08-06' };
    expect(rangeStatus(start, end, '2026-04-08')).toBe('upcoming');
    expect(rangeStatus(start, end, '2026-04-09')).toBe('in-progress');
    expect(rangeStatus(start, end, '2026-08-06')).toBe('completed');
    expect(formatRange(start, end)).toBe('Apr 9 - Aug 6');
    expect(formatRange(start, { date: '2026-10-29', proposed: true })).toBe('TBD');
  });
});

describe('deploymentPhase', () => {
  const hoodi = {
    date: '2026-10-26',
    source: 'https://forkcast.org/calls/acde/247#00:06:44',
    clientReleases: '2026-10-16'
  };

  it('cites the agreeing call until the fork, then reports it', () => {
    expect(callLabel(hoodi.source)).toBe('ACDE 247');
    expect(deploymentPhase(hoodi, '2026-10-10')).toEqual({
      dateRange: 'Oct 26',
      note: 'The Oct 26 slot was agreed on ACDE 247, with client releases due Oct 16.',
      status: 'upcoming'
    });
    expect(deploymentPhase(hoodi, '2026-10-26')).toEqual({
      dateRange: 'Oct 26',
      note: 'The fork activated on schedule Oct 26.',
      status: 'completed'
    });
  });

  it('marks a proposed slot and adds no note without a source', () => {
    expect(deploymentPhase({ date: '2026-10-27', proposed: true }, '2026-10-01')).toEqual({
      dateRange: 'Oct 27 (proposed)',
      note: undefined,
      status: 'upcoming'
    });
    expect(deploymentPhase({ date: '2025-05-07' }, '2026-01-01').note).toBeUndefined();
  });
});

describe('testnetsProgress', () => {
  const testnets = [
    { name: 'Holešky', milestone: { date: '2025-10-01' } },
    { name: 'Sepolia', milestone: { date: '2025-10-14' } },
    { name: 'Hoodi', milestone: { date: '2025-10-28', proposed: true } }
  ];

  it('summarises the forked testnets and the next slot', () => {
    const progress = testnetsProgress(testnets, '2025-10-20');
    expect(progress.status).toBe('in-progress');
    expect(progress.actualStartDate).toBe('Oct 1, 2025');
    expect(progress.actualEndDate).toBeUndefined();
    expect(progress.progressNotes).toBe('Holešky and Sepolia are forked; Hoodi slot proposed for Oct 28');
    expect(progress.testnets?.[2]).toEqual({ name: 'Hoodi', status: 'upcoming', proposedDate: 'Oct 28, 2025' });
  });

  it('switches to the full chain once every testnet has forked', () => {
    const agreed = testnets.map(t => ({ ...t, milestone: { date: t.milestone.date } }));
    const progress = testnetsProgress(agreed, '2025-11-01');
    expect(progress.status).toBe('completed');
    expect(progress.actualEndDate).toBe('Oct 28, 2025');
    expect(progress.progressNotes).toBe('Holešky (Oct 1) → Sepolia (Oct 14) → Hoodi (Oct 28)');
  });

  it('targets mainnet until it ships', () => {
    expect(mainnetProgress({ date: '2026-10-01', precision: 'quarter' }, '2026-10-10')).toEqual({
      status: 'upcoming',
      projectedDate: 'Q4 2026',
      progressNotes: 'Target mainnet activation Q4 2026'
    });
    expect(mainnetProgress({ date: '2025-12-03' }, '2026-01-01')).toEqual({
      status: 'completed',
      actualEndDate: 'Dec 3, 2025',
      progressNotes: 'Mainnet activation complete'
    });
  });
});

describe('Glamsterdam derived from milestones', () => {
  it('flips Hoodi from upcoming to completed on the fork day', () => {
    const before = buildGlamsterdamTimelinePhases('2026-10-10').find(p => p.id === 'hoodi');
    const after = buildGlamsterdamTimelinePhases('2026-10-26').find(p => p.id === 'hoodi');
    expect(before?.status).toBe('upcoming');
    expect(before?.description).toBe(
      'Deploy Glamsterdam to the permissionless validator testnet for final testing. The Oct 26 slot was agreed on ACDE 247, with client releases due Oct 16.'
    );
    expect(after?.status).toBe('completed');
    expect(after?.description).toBe(
      'Deploy Glamsterdam to the permissionless validator testnet for final testing. The fork activated on schedule Oct 26.'
    );

    const testnetPhase = (today: string) =>
      buildGlamsterdamProgress(today).phases.find(p => p.phaseId === 'public-testnets');
    expect(testnetPhase('2026-10-10')?.progressNotes).toBe('Platåberget and Sepolia are forked; Hoodi agreed for Oct 26');
    expect(testnetPhase('2026-10-26')?.status).toBe('completed');
  });

  it('adds the Hoodi event once the fork has happened', () => {
    const title = 'Glamsterdam Live on Hoodi Testnet';
    expect(buildTimelineEvents('2026-10-25').some(e => e.title === title)).toBe(false);
    expect(buildTimelineEvents('2026-10-26').find(e => e.title === title)).toMatchObject({
      date: '2026-10-26',
      category: 'testnet',
      networkId: 'hoodi'
    });
  });

  it('keeps the event titles the feed GUIDs are built from', () => {
    const titles = buildTimelineEvents('2026-10-10').map(e => e.title);
    expect(titles).toContain('Pectra Live on Mainnet');
    expect(titles).toContain('Fusaka BPO1 on Holešky (10/15 blobs)');
    expect(titles).toContain('BPO2 on Mainnet (14/21 blobs)');
    expect(titles).toContain('Glamsterdam Live on Sepolia Testnet');
    expect(titles).not.toContain('Pectra Live on Sepolia Testnet');
  });
});
