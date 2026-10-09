/**
 * Pure extraction of the agenda from an `ethereum/pm` call issue body.
 *
 * Two body shapes are in circulation and both are still linked from call pages:
 * the GitHub issue form (`### Agenda` between `### UTC Date & Time` and
 * `### Call Series`) and the hand-written format that predates it (`# Agenda`
 * running to the end of the body). Keep this module pure — the fetch lives in
 * useCallAgenda.
 */

/**
 * Issue-form fields and meeting-config headings, which are the only headings that
 * reliably sit *outside* the agenda. The agenda itself carries headings of every
 * level — ACDT posts `### EL breakout` / `### CL breakout` as agenda items, at the
 * same level as `### Agenda` — so heading depth cannot mark the end.
 */
const SECTIONS_AFTER_AGENDA = new Set([
  'utc date & time',
  'call series',
  'autopilot mode',
  'meeting configuration',
  'duration',
  'occurrence rate',
  'use custom meeting link',
  'display zoom link in calendar invite',
  'youtube livestream link',
  'facilitator email',
  'facilitator emails',
  'zoom',
  'meeting info',
]);

const HEADING_RE = /^(#{1,6})[ \t]*(.+?)[ \t]*$/;
const DETAILS_RE = /^\s*<details/i;
/** Marks the `<details>` the meeting config is folded into, as opposed to one an agenda item uses. */
const CONFIG_SUMMARY_RE = /config/i;
/** The pre-form bodies trail off into bare template prompts rather than a heading. */
const TRAILING_FIELD_RE =
  /^\s*(facilitator\s+(e-?mails?|telegram|handle)|other comments and resources|(note:\s*)?the zoom link will be sent)/i;
/** What an author leaves in the Agenda field when there is nothing to list yet. */
const PLACEHOLDERS = new Set(['_no response_', 'n/a', 'na', 'tbd', 'tba', 'none', '-']);

const normalizeHeading = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .replace(/\s*\(optional\)\s*$/, '')
    .replace(/:+$/, '')
    .trim();

/**
 * Prefix rather than equality: facilitators qualify the heading they were given
 * ("Agenda (incl links to slides)", "Agenda for Call 04", "Agenda overview"), and an
 * unrecognized heading costs the whole agenda. Where a qualified heading sits *inside*
 * the issue form's own Agenda field it only adds a shorter candidate, which loses.
 */
const isAgendaHeading = (line: string): boolean => {
  const match = line.match(HEADING_RE);
  return Boolean(match && normalizeHeading(match[2]).startsWith('agenda'));
};

/**
 * Both body layouts fold the meeting config into a `<details>`, and in the pre-form
 * layout that block is the only thing marking the end. Reading its summary keeps an
 * agenda free to fold its own items away.
 */
const opensConfigBlock = (lines: string[], index: number): boolean =>
  DETAILS_RE.test(lines[index]) &&
  CONFIG_SUMMARY_RE.test(`${lines[index]} ${lines[index + 1] ?? ''}`);

const endsAgenda = (lines: string[], index: number): boolean => {
  const line = lines[index];
  if (opensConfigBlock(lines, index) || TRAILING_FIELD_RE.test(line)) return true;
  const match = line.match(HEADING_RE);
  return Boolean(match && SECTIONS_AFTER_AGENDA.has(normalizeHeading(match[2])));
};

/**
 * The agenda markdown, or an empty string when the issue carries none. A handful of
 * bodies paste the issue form twice with the first copy's Agenda field left blank,
 * so every Agenda section is read and the longest one wins.
 */
export function extractAgendaMarkdown(issueBody?: string): string {
  if (!issueBody) return '';

  const lines = issueBody.replace(/\r\n/g, '\n').split('\n');
  let agenda = '';

  for (let start = 0; start < lines.length; start++) {
    if (!isAgendaHeading(lines[start])) continue;

    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (endsAgenda(lines, i)) {
        end = i;
        break;
      }
    }

    const section = lines.slice(start + 1, end).join('\n').trim();
    if (PLACEHOLDERS.has(section.toLowerCase())) continue;
    if (section.length > agenda.length) agenda = section;
  }

  return agenda;
}
