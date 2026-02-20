import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './ui/Logo';
import ThemeToggle from './ui/ThemeToggle';
import { protocolCalls, Call, CallType } from '../data/calls';
import { KeyDecision, EIP } from '../types/eip';
import { eipsData } from '../data/eips';
import { StructuredDecisionContent } from './call/KeyDecisionsSection';
import { useMetaTags } from '../hooks/useMetaTags';

interface MeetingDecisions {
  call: Call;
  decisions: KeyDecision[];
}

type FilterType = 'all' | 'stage_change' | 'devnet_inclusion' | 'headliner_selected' | 'other';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'stage_change', label: 'Stage Changes' },
  { value: 'devnet_inclusion', label: 'Devnet' },
  { value: 'headliner_selected', label: 'Headliner' },
  { value: 'other', label: 'Other' },
];

const ACD_TYPES: CallType[] = ['acdc', 'acde', 'acdt'];

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const DecisionsPage: React.FC = () => {
  const [meetings, setMeetings] = useState<MeetingDecisions[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useMetaTags({
    title: 'Key Decisions - Forkcast',
    description: 'Key decisions from Ethereum All Core Devs meetings, aggregated in reverse-chronological order.',
    url: 'https://forkcast.org/decisions',
  });

  const eipMap = useMemo(() => {
    const map = new Map<number, EIP>();
    for (const eip of eipsData) {
      map.set(eip.id, eip);
    }
    return map;
  }, []);

  useEffect(() => {
    const fetchAllDecisions = async () => {
      const acdCalls = protocolCalls.filter(c => ACD_TYPES.includes(c.type));

      const results = await Promise.allSettled(
        acdCalls.map(async (call) => {
          const artifactPath = `${call.type}/${call.date}_${call.number}`;
          const response = await fetch(`/artifacts/${artifactPath}/key_decisions.json`);
          if (!response.ok) return null;
          const data = await response.json();
          const decisions: KeyDecision[] = data?.key_decisions;
          if (!decisions || decisions.length === 0) return null;
          return { call, decisions };
        })
      );

      const meetingDecisions: MeetingDecisions[] = results
        .filter((r): r is PromiseFulfilledResult<MeetingDecisions | null> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter((m): m is MeetingDecisions => m !== null)
        .sort((a, b) => b.call.date.localeCompare(a.call.date));

      setMeetings(meetingDecisions);
      setLoading(false);
    };

    fetchAllDecisions();
  }, []);

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
        <div className="mb-6 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <Logo size="md" className="mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Key Decisions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Key decisions from All Core Devs meetings, aggregated in reverse-chronological order.
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                filter === opt.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Stats line */}
        {!loading && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
            {stats.decisions} decision{stats.decisions !== 1 ? 's' : ''} across {stats.calls} call{stats.calls !== 1 ? 's' : ''}
          </p>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        )}

        {/* Decisions grouped by meeting */}
        {!loading && (
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
                          ? <StructuredDecisionContent decision={decision} eipMap={eipMap} />
                          : decision.original_text
                        }
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DecisionsPage;
