/**
 * Cross-section ordering, capping, and flattening into the keyboard-navigable row
 * list.
 */
import type { FlatRow, SearchScope, SectionId, SectionResults } from './types';

/**
 * `calls` sits last despite being cheap to match: a bare list of call pages
 * rarely answers the question, and anyone who *does* want one names it
 * ("acde 242"), which promotes the section to the front anyway.
 */
const SECTION_BASE_ORDER: SectionId[] = [
  'eips',
  'summaries',
  'upgrades',
  'devnets',
  'pages',
  'transcripts',
  'calls',
];

const SECTION_LABELS: Record<SectionId, string> = {
  eips: 'EIPs',
  calls: 'Calls',
  summaries: 'Call summaries',
  upgrades: 'Network upgrades',
  devnets: 'Devnets',
  pages: 'Pages',
  transcripts: 'Transcripts',
};

/** How many results each section shows in `all` scope. */
const SECTION_CAPS: Record<SectionId, number> = {
  eips: 3,
  calls: 5,
  summaries: 6,
  upgrades: 3,
  devnets: 3,
  pages: 3,
  transcripts: 5,
};

/**
 * Identity confidence a section's top result must reach to jump the queue.
 * Summaries and transcripts never promote: matching prose says nothing about
 * whether the query *named* that call.
 */
const SECTION_PROMOTE_AT: Record<SectionId, number> = {
  eips: 100,
  calls: 100,
  summaries: Infinity,
  upgrades: 100,
  devnets: 100,
  pages: 100,
  transcripts: Infinity,
};

/** Which scope chip each section belongs to. */
export const SECTION_SCOPE: Record<SectionId, Exclude<SearchScope, 'all'>> = {
  eips: 'eips',
  calls: 'calls',
  summaries: 'calls',
  upgrades: 'site',
  devnets: 'site',
  pages: 'site',
  transcripts: 'transcripts',
};

/**
 * A stable partition, not a re-score: sections whose top result names something
 * concrete move to the front, each group keeping its base order. Raw scores from
 * different sections aren't on a comparable scale, so they're never mixed.
 */
export function orderSections(sections: SectionResults[]): SectionResults[] {
  const byBaseOrder = [...sections].sort(
    (a, b) => SECTION_BASE_ORDER.indexOf(a.id) - SECTION_BASE_ORDER.indexOf(b.id),
  );

  const promoted = byBaseOrder.filter(
    (section) => (section.results[0]?.identity ?? 0) >= SECTION_PROMOTE_AT[section.id],
  );
  const rest = byBaseOrder.filter((section) => !promoted.includes(section));

  return [...promoted, ...rest];
}

/** Caps only apply in `all` scope; a scoped view shows the full list. */
export function capSections(sections: SectionResults[], capped: boolean): SectionResults[] {
  if (!capped) return sections;
  return sections.map((section) => ({
    ...section,
    results: section.results.slice(0, SECTION_CAPS[section.id]),
  }));
}

export function flattenSections(
  sections: SectionResults[],
  /** `transcriptAction` labels the row that activates the heavy tier. */
  options: { transcriptAction?: string } = {},
): FlatRow[] {
  const rows: FlatRow[] = [];

  for (const section of sections) {
    if (section.results.length === 0) continue;

    rows.push({ type: 'header', sectionId: section.id, label: SECTION_LABELS[section.id], total: section.total });
    for (const result of section.results) {
      rows.push({ type: 'result', sectionId: section.id, result });
    }

    if (section.total > section.results.length) {
      rows.push({
        type: 'action',
        action: {
          kind: 'expand-section',
          sectionId: section.id,
          scope: SECTION_SCOPE[section.id],
          label: `Show all ${section.total} ${SECTION_LABELS[section.id].toLowerCase()}`,
        },
      });
    }
  }

  if (options.transcriptAction) {
    rows.push({ type: 'action', action: { kind: 'activate-transcripts', label: options.transcriptAction } });
  }

  return rows;
}
