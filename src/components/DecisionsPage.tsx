import React, { useState, useMemo } from 'react';
import { Link } from './navigation';
import { eipById } from '../data/eips';
import { StructuredDecisionContent, DecisionTextWithEipLinks } from './call/KeyDecisionsSection';
import type { MeetingDecisions } from '../domain/calls/keyDecisions';

type FilterType = 'all' | 'stage_change' | 'devnet_inclusion' | 'headliner_selected' | 'other';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'stage_change', label: 'Stage Changes' },
  { value: 'devnet_inclusion', label: 'Devnet' },
  { value: 'headliner_selected', label: 'Headliner' },
  { value: 'other', label: 'Other' },
];

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

interface DecisionsPageProps {
  meetings: MeetingDecisions[];
}

const DecisionsPage: React.FC<DecisionsPageProps> = ({ meetings }) => {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredMeetings = useMemo(() => {
    if (filter === 'all') return meetings;
    return meetings
      .map(m => ({
        ...m,
        decisions: m.decisions.filter(d => d.type === filter),
      }))
      .filter(m => m.decisions.length > 0);
  }, [meetings, filter]);

  const stats = useMemo(() => {
    const totalDecisions = filteredMeetings.reduce((sum, m) => sum + m.decisions.length, 0);
    return { decisions: totalDecisions, calls: filteredMeetings.length };
  }, [filteredMeetings]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Key Decisions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Key decisions from AllCoreDevs meetings, aggregated in reverse-chronological order.
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 mb-4">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                filter === opt.value
                  ? 'bg-purple-600 dark:bg-purple-500 text-white dark:text-white'
                  : 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Stats line */}
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
          {stats.decisions} decision{stats.decisions !== 1 ? 's' : ''} across {stats.calls} call{stats.calls !== 1 ? 's' : ''}
        </p>

        {/* Decisions grouped by meeting */}
        <div className="space-y-6">
          {filteredMeetings.map(({ call, decisions }) => (
            <div key={`${call.type}-${call.number}`}>
              {/* Meeting header */}
              <div className="flex items-baseline gap-2 mb-2">
                <Link
                  to={`/calls/${call.type}/${call.number}`}
                  className="text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  {call.type.toUpperCase()} #{call.number}
                </Link>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {formatDate(call.date)}
                </span>
              </div>

              {/* Decision list */}
              <ul className="space-y-1.5 list-none ml-0">
                {decisions.map((decision, index) => {
                  const isStructured = decision.type !== 'other';
                  return (
                    <li
                      key={index}
                      className="text-sm before:content-['→'] before:mr-2 before:text-slate-400 dark:before:text-slate-500 text-slate-600 dark:text-slate-400"
                    >
                      {isStructured
                        ? <StructuredDecisionContent decision={decision} eipMap={eipById} />
                        : <DecisionTextWithEipLinks decision={decision} eipMap={eipById} />
                      }
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DecisionsPage;
