import { Link } from 'react-router-dom';
import { callTypeNames, isOneOffCall, type Call, type CallType } from '../../data/calls';
import { type TimelineEvent } from '../../data/events';
import {
  getItemCalendarDate,
  getTimelineItemKey,
  isEventItem,
  isUpcomingCallItem,
  type DateSectionId,
  type TimelineDateSection,
  type TimelineItem
} from '../../domain/calls/timeline';

const CALL_TYPE_BORDER_COLORS: Record<CallType, string> = {
  acdc: 'border-l-blue-500 dark:border-l-blue-400',
  acde: 'border-l-sky-500 dark:border-l-sky-400',
  acdt: 'border-l-cyan-500 dark:border-l-cyan-400',
  epbs: 'border-l-amber-500 dark:border-l-amber-400',
  bal: 'border-l-red-500 dark:border-l-red-400',
  focil: 'border-l-orange-500 dark:border-l-orange-400',
  price: 'border-l-rose-500 dark:border-l-rose-400',
  tli: 'border-l-pink-500 dark:border-l-pink-400',
  pqts: 'border-l-yellow-500 dark:border-l-yellow-400',
  rpc: 'border-l-violet-500 dark:border-l-violet-400',
  zkevm: 'border-l-fuchsia-500 dark:border-l-fuchsia-400',
  etm: 'border-l-purple-500 dark:border-l-purple-400',
  awd: 'border-l-lime-500 dark:border-l-lime-400',
  pqi: 'border-l-emerald-500 dark:border-l-emerald-400',
  fcr: 'border-l-teal-500 dark:border-l-teal-400'
};

const CALL_TYPE_BADGE_COLORS: Record<CallType, string> = {
  acdc: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  acde: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
  acdt: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  epbs: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  bal: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  focil: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  price: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  tli: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  pqts: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  rpc: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  zkevm: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300',
  etm: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  awd: 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300',
  pqi: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  fcr: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
};

const FALLBACK_BORDER_COLOR = 'border-l-slate-400 dark:border-l-slate-500';
const FALLBACK_BADGE_COLOR = 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300';

const EVENT_CARD_STYLES = {
  mainnet: 'border-emerald-300/90 bg-emerald-50/70 dark:border-emerald-700/70 dark:bg-emerald-950/20',
  testnet: 'border-teal-300/90 bg-teal-50/70 dark:border-teal-700/70 dark:bg-teal-950/20',
  milestone: 'border-blue-300/90 bg-blue-50/70 dark:border-blue-700/70 dark:bg-blue-950/20',
  announcement: 'border-purple-300/90 bg-purple-50/70 dark:border-purple-700/70 dark:bg-purple-950/20',
  devnet: 'border-orange-300/90 bg-orange-50/70 dark:border-orange-700/70 dark:bg-orange-950/20'
} satisfies Record<TimelineEvent['category'], string>;

const EVENT_DOT_STYLES = {
  mainnet: 'bg-emerald-500 dark:bg-emerald-400',
  testnet: 'bg-teal-500 dark:bg-teal-400',
  milestone: 'bg-blue-500 dark:bg-blue-400',
  announcement: 'bg-purple-500 dark:bg-purple-400',
  devnet: 'bg-orange-500 dark:bg-orange-400'
} satisfies Record<TimelineEvent['category'], string>;

const SECTION_STYLES: Record<
  DateSectionId,
  {
    label: string;
    shellClasses: string;
    pillClasses: string;
    placeholderClasses: string;
  }
> = {
  today: {
    label: 'Today',
    shellClasses: 'rounded-lg border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/10',
    pillClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    placeholderClasses: 'border-amber-300/80 bg-white/70 text-slate-600 dark:border-amber-800 dark:bg-slate-900/40 dark:text-slate-300'
  },
  future: {
    label: 'Future Events',
    shellClasses: 'rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/10',
    pillClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    placeholderClasses: 'border-emerald-300/80 bg-white/70 text-slate-600 dark:border-emerald-800 dark:bg-slate-900/40 dark:text-slate-300'
  },
  previous: {
    label: 'Previous Events',
    shellClasses: 'rounded-lg border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/40',
    pillClasses: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    placeholderClasses: 'border-slate-300/80 bg-white/70 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300'
  }
};

const TimelineItemCard = ({ item, sectionId }: { item: TimelineItem; sectionId: DateSectionId }) => {
  if (isEventItem(item)) {
    const eventDisplayDate = getItemCalendarDate(item);

    return (
      <div
        className={`rounded-lg border px-4 py-3 shadow-sm ${EVENT_CARD_STYLES[item.category]} ${
          sectionId === 'previous' ? 'opacity-85' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${EVENT_DOT_STYLES[item.category]}`}></div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                {item.category}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 text-sm text-slate-600 dark:text-slate-400">{eventDisplayDate}</div>
        </div>
      </div>
    );
  }

  if (isUpcomingCallItem(item)) {
    const upcomingCallDisplayDate = getItemCalendarDate(item);
    const cardContent = (
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`inline-block min-w-[3.5rem] flex-shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium ${CALL_TYPE_BADGE_COLORS[item.type]}`}>
            {item.type.toUpperCase()}
          </span>
          <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            <span className="sm:hidden">Call #{item.number}</span>
            <span className="hidden sm:inline">{callTypeNames[item.type] || item.type} #{item.number}</span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <div className="text-sm text-slate-600 dark:text-slate-400">{upcomingCallDisplayDate}</div>
          <div className="text-slate-400 transition-colors group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300">
            {item.youtubeUrl ? '→' : '↗'}
          </div>
        </div>
      </div>
    );

    const cardClasses = `block rounded-lg border border-slate-200 border-l-3 bg-white p-3 transition-all hover:border-slate-300 hover:shadow-md group dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-slate-700/20 ${CALL_TYPE_BORDER_COLORS[item.type]}`;
    if (item.youtubeUrl) {
      return (
        <Link
          to={`/calls/${item.type}/${item.number}`}
          state={{
            upcoming: true,
            date: item.date,
            youtubeUrl: item.youtubeUrl,
            githubUrl: item.githubUrl,
            issueNumber: item.issueNumber
          }}
          className={cardClasses}
          style={{ borderLeftStyle: 'dashed' }}
        >
          {cardContent}
        </Link>
      );
    }

    return (
      <a
        href={item.githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClasses}
        style={{ borderLeftStyle: 'dashed' }}
      >
        {cardContent}
      </a>
    );
  }

  const call = item as Call;
  const oneOff = isOneOffCall(call.type);

  return (
    <Link
      to={`/calls/${call.path}`}
      className={`block rounded-lg border border-slate-200 border-l-4 bg-white p-3 transition-all hover:border-slate-300 hover:shadow-md group dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-slate-700/20 ${CALL_TYPE_BORDER_COLORS[call.type as CallType] || FALLBACK_BORDER_COLOR}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`inline-block min-w-[3.5rem] flex-shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium ${CALL_TYPE_BADGE_COLORS[call.type as CallType] || FALLBACK_BADGE_COLOR}`}>
            {oneOff ? '1-OFF' : call.type.toUpperCase()}
          </span>
          <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {oneOff ? (
              call.name || call.type
            ) : (
              <>
                <span className="sm:hidden">Call #{call.number}</span>
                <span className="hidden sm:inline">{callTypeNames[call.type as CallType] || call.type} #{call.number}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <div className="text-sm text-slate-600 dark:text-slate-400">{call.date}</div>
          <div className="text-slate-400 transition-colors group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300">
            →
          </div>
        </div>
      </div>
    </Link>
  );
};

interface CallsIndexTimelineProps {
  sections: TimelineDateSection[];
}

export const CallsIndexTimeline = ({ sections }: CallsIndexTimelineProps) => (
  <div className="space-y-6">
    {sections.map((section) => {
      const sectionStyles = SECTION_STYLES[section.id];

      return (
        <section
          key={section.id}
          aria-labelledby={`${section.id}-calls-heading`}
          className={sectionStyles.shellClasses}
        >
          <div>
            <h2
              id={`${section.id}-calls-heading`}
              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${sectionStyles.pillClasses}`}
            >
              {sectionStyles.label}
            </h2>
          </div>

          <div className="mt-4 space-y-5">
            {section.showLoadingPlaceholder && (
              <div className={`rounded-lg border border-dashed px-4 py-3 text-sm ${sectionStyles.placeholderClasses}`}>
                Checking for calls on GitHub...
              </div>
            )}
            {section.monthGroups.map((group) => (
              <div key={`${section.id}-${group.monthLabel}`} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {group.monthLabel}
                  </h3>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                </div>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div key={getTimelineItemKey(item)}>
                      <TimelineItemCard item={item} sectionId={section.id} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    })}
  </div>
);
