import React, { useMemo } from 'react';
import { ForkProgress } from '../../constants/timeline-phases';
import { parseShortDate } from './forkDateCalculator';

interface ForkGanttChartProps {
  forks: {
    name: string;
    progress: ForkProgress;
    color: string;
  }[];
  startDate?: Date;
  monthsToShow?: number;
}

interface TimelineItem {
  forkName: string;
  phaseName: string;
  label: string;
  startDate: Date;
  endDate: Date;
  color: string;
  type: 'phase' | 'substep' | 'milestone';
  row: number;
}

const PHASE_LABELS: Record<string, string> = {
  'headliner-selection': 'Headliners',
  'eip-selection': 'Non-headliners',
  'development': 'Devnets',
  'public-testnets': 'Testnets',
  'mainnet-deployment': 'Mainnet',
};

function getDateFromPhase(phase: ForkProgress['phases'][0]): { start: Date | null; end: Date | null } {
  // Try to parse actualStartDate, actualEndDate, or projectedDate
  let start: Date | null = null;
  let end: Date | null = null;

  if (phase.actualStartDate) {
    start = parseShortDate(phase.actualStartDate);
  }
  if (phase.actualEndDate) {
    end = parseShortDate(phase.actualEndDate);
  }
  if (phase.projectedDate) {
    // projectedDate might be a range like "Jun 20, 2025 - Jul 17, 2025" or a single date
    const parts = phase.projectedDate.split(' - ');
    if (parts.length === 2) {
      if (!start) start = parseShortDate(parts[0]);
      if (!end) end = parseShortDate(parts[1]);
    } else {
      const parsed = parseShortDate(phase.projectedDate);
      if (!start) start = parsed;
      if (!end) end = parsed;
    }
  }

  // For single-date events (like mainnet), use end as start if start is missing
  if (!start && end) start = end;
  if (!end && start) end = start;

  return { start, end };
}

const ForkGanttChart: React.FC<ForkGanttChartProps> = ({
  forks,
  startDate,
  monthsToShow = 12,
}) => {
  // Calculate the timeline range
  const { timelineStart, timelineEnd, months } = useMemo(() => {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + monthsToShow);

    const monthsList: { date: Date; label: string }[] = [];
    const current = new Date(start);
    while (current < end) {
      monthsList.push({
        date: new Date(current),
        label: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      });
      current.setMonth(current.getMonth() + 1);
    }

    return { timelineStart: start, timelineEnd: end, months: monthsList };
  }, [startDate, monthsToShow]);

  // Build timeline items from fork progress data
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    let rowIndex = 0;

    forks.forEach((fork) => {
      fork.progress.phases.forEach((phase) => {
        const phaseLabel = PHASE_LABELS[phase.phaseId] || phase.phaseId;

        // Collect all milestone dates for this phase first
        const milestoneDates: Date[] = [];
        const milestoneItems: Omit<TimelineItem, 'row'>[] = [];

        // Add substeps if they exist
        if (phase.substeps) {
          phase.substeps.forEach((substep) => {
            const substepDate = parseShortDate(substep.date || substep.projectedDate || '');
            if (!substepDate) return;
            milestoneDates.push(substepDate);
            milestoneItems.push({
              forkName: fork.name,
              phaseName: phase.phaseId,
              label: substep.name,
              startDate: substepDate,
              endDate: substepDate,
              color: fork.color,
              type: 'milestone',
            });
          });
        }

        // Add devnets if they exist
        if (phase.devnets) {
          phase.devnets.forEach((devnet) => {
            const devnetDate = parseShortDate(devnet.date || devnet.projectedDate || '');
            if (!devnetDate) return;
            milestoneDates.push(devnetDate);
            milestoneItems.push({
              forkName: fork.name,
              phaseName: phase.phaseId,
              label: devnet.name,
              startDate: devnetDate,
              endDate: devnetDate,
              color: fork.color,
              type: 'milestone',
            });
          });
        }

        // Add testnets if they exist
        if (phase.testnets) {
          phase.testnets.forEach((testnet) => {
            if (testnet.status === 'deprecated') return;
            const testnetDate = parseShortDate(testnet.date || testnet.projectedDate || '');
            if (!testnetDate) return;
            milestoneDates.push(testnetDate);
            milestoneItems.push({
              forkName: fork.name,
              phaseName: phase.phaseId,
              label: testnet.name,
              startDate: testnetDate,
              endDate: testnetDate,
              color: fork.color,
              type: 'milestone',
            });
          });
        }

        // For mainnet-deployment, add the mainnet date as a milestone
        if (phase.phaseId === 'mainnet-deployment') {
          const phaseDates = getDateFromPhase(phase);
          if (phaseDates.start) {
            milestoneDates.push(phaseDates.start);
            milestoneItems.push({
              forkName: fork.name,
              phaseName: phase.phaseId,
              label: 'Mainnet',
              startDate: phaseDates.start,
              endDate: phaseDates.start,
              color: fork.color,
              type: 'milestone',
            });
          }
        }

        // Calculate phase bar from min/max of milestone dates (Option A)
        // If no milestones, fall back to phase dates
        let phaseStart: Date | null = null;
        let phaseEnd: Date | null = null;

        if (milestoneDates.length > 0) {
          phaseStart = new Date(Math.min(...milestoneDates.map(d => d.getTime())));
          phaseEnd = new Date(Math.max(...milestoneDates.map(d => d.getTime())));
        } else {
          // Fall back to phase-level dates if no milestones
          const phaseDates = getDateFromPhase(phase);
          phaseStart = phaseDates.start;
          phaseEnd = phaseDates.end;
        }

        // Skip phases outside our timeline
        if (!phaseStart || !phaseEnd) return;
        if (phaseEnd < timelineStart || phaseStart > timelineEnd) return;

        // Add the main phase bar
        items.push({
          forkName: fork.name,
          phaseName: phase.phaseId,
          label: phaseLabel,
          startDate: phaseStart,
          endDate: phaseEnd,
          color: fork.color,
          type: 'phase',
          row: rowIndex,
        });

        // Add all milestones with row index
        milestoneItems.forEach((milestone) => {
          if (milestone.startDate < timelineStart || milestone.startDate > timelineEnd) return;
          items.push({ ...milestone, row: rowIndex });
        });

        rowIndex++;
      });

      // Add some spacing between forks
      rowIndex++;
    });

    return { items };
  }, [forks, timelineStart, timelineEnd]);

  // Calculate position as percentage of timeline
  const getPosition = (date: Date): number => {
    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    const dateMs = date.getTime() - timelineStart.getTime();
    return Math.max(0, Math.min(100, (dateMs / totalMs) * 100));
  };

  const rowHeight = 32;
  const headerHeight = 48;
  const labelWidth = 140;

  // Calculate today's position if within range
  const today = new Date();
  const todayInRange = today >= timelineStart && today <= timelineEnd;
  const todayPosition = todayInRange ? getPosition(today) : null;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Timeline View</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Visualize upgrade phases and their overlap across forks
        </p>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: `${labelWidth + months.length * 80}px` }} className="relative">

          {/* Month header */}
          <div
            className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50"
            style={{ height: headerHeight }}
          >
            <div
              className="flex-shrink-0 border-r border-slate-200 dark:border-slate-600 flex items-center px-3 bg-slate-50 dark:bg-slate-700 sticky left-0 z-20"
              style={{ width: labelWidth }}
            >
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
                Fork / Phase
              </span>
            </div>
            <div className="flex-1 flex">
              {months.map((month, idx) => (
                <div
                  key={idx}
                  className="border-r border-slate-200 dark:border-slate-700 flex items-center justify-center"
                  style={{ width: 80 }}
                >
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {month.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline rows with single Today marker spanning all rows */}
          <div className="relative">
            {/* Solid background for sticky column to hide Today line behind it */}
            <div
              className="absolute top-0 bottom-0 bg-white dark:bg-slate-800 sticky left-0 z-[5]"
              style={{ width: labelWidth }}
            />
            {forks.map((fork, forkIdx) => {
              const forkItems = timelineItems.items.filter((item) => item.forkName === fork.name);
              const phaseItems = forkItems.filter((item) => item.type === 'phase');

              return (
                <React.Fragment key={fork.name}>
                  {/* Fork label row */}
                  <div
                    className="flex"
                    style={{ height: rowHeight }}
                  >
                    <div
                      className="flex-shrink-0 border-r border-b border-slate-200 dark:border-slate-600 flex items-center px-3 bg-slate-100 dark:bg-slate-700 sticky left-0 z-10"
                      style={{ width: labelWidth }}
                    >
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: fork.color }}
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {fork.name}
                      </span>
                    </div>
                    <div className="flex border-b border-slate-100 dark:border-slate-700/50">
                      {/* Month grid lines */}
                      {months.map((_, idx) => (
                        <div
                          key={idx}
                          className="border-r border-slate-100 dark:border-slate-700/30"
                          style={{ width: 80 }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Phase rows */}
                  {phaseItems.map((phase) => {
                    const milestones = forkItems.filter(
                      (item) => item.phaseName === phase.phaseName && item.type === 'milestone'
                    );

                    return (
                      <div
                        key={`${fork.name}-${phase.phaseName}`}
                        className="flex"
                        style={{ height: rowHeight }}
                      >
                        <div
                          className="flex-shrink-0 border-r border-b border-slate-200 dark:border-slate-600 flex items-center px-3 pl-6 bg-white dark:bg-slate-800 sticky left-0 z-10"
                          style={{ width: labelWidth }}
                        >
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {phase.label}
                          </span>
                        </div>
                        <div className="relative border-b border-slate-100 dark:border-slate-700/50" style={{ width: months.length * 80 }}>
                          {/* Month grid lines */}
                          <div className="absolute inset-0 flex">
                            {months.map((_, idx) => (
                              <div
                                key={idx}
                                className="flex-1 border-r border-slate-100 dark:border-slate-700/30"
                              />
                            ))}
                          </div>

                          {/* Phase bar - only show if phase spans multiple dates */}
                          {phase.startDate.getTime() !== phase.endDate.getTime() && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 h-5 rounded opacity-30"
                              style={{
                                left: `${getPosition(phase.startDate)}%`,
                                width: `${Math.max(0.5, getPosition(phase.endDate) - getPosition(phase.startDate))}%`,
                                backgroundColor: fork.color,
                              }}
                            />
                          )}

                          {/* Milestones */}
                          {milestones.map((milestone, mIdx) => (
                            <div
                              key={mIdx}
                              className="absolute top-1/2 -translate-y-1/2 group hover:z-20"
                              style={{
                                left: `${getPosition(milestone.startDate)}%`,
                              }}
                            >
                              <div
                                className="w-2 h-2 rounded-full -ml-1 ring-2 ring-white dark:ring-slate-800"
                                style={{ backgroundColor: fork.color }}
                              />
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {milestone.label}
                                <br />
                                {milestone.startDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Spacer row between forks */}
                  {forkIdx < forks.length - 1 && (
                    <div className="flex" style={{ height: rowHeight / 2 }}>
                      <div
                        className="flex-shrink-0 border-r border-b border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 sticky left-0 z-10"
                        style={{ width: labelWidth }}
                      />
                      <div className="flex-1 border-b border-slate-200 dark:border-slate-600" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Single Today marker spanning all rows */}
            {todayPosition !== null && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: labelWidth,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
              >
                <div
                  className="absolute w-0.5 bg-red-500"
                  style={{
                    left: `${todayPosition}%`,
                    top: 0,
                    bottom: 0,
                  }}
                >
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-red-500 text-white text-[9px] rounded whitespace-nowrap">
                    Today
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-3 rounded bg-slate-400 opacity-30" />
            <span className="text-slate-600 dark:text-slate-400">Phase duration</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">Milestone</span>
          </div>
          {forks.map((fork) => (
            <div key={fork.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fork.color }} />
              <span className="text-slate-600 dark:text-slate-400">{fork.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ForkGanttChart;
