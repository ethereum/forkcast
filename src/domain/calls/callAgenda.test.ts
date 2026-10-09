import { describe, expect, it } from 'vitest';
import { extractAgendaMarkdown } from './callAgenda';

const issueForm = (agenda: string) =>
  [
    '### UTC Date & Time',
    '',
    'October 8, 2026, 14:00 UTC',
    '',
    '### Agenda',
    '',
    agenda,
    '',
    '### Call Series',
    '',
    'All Core Devs - Execution',
    '',
    '### Autopilot Mode',
    '',
    '- [x] Use autopilot (recommended defaults for this call series)',
    '',
    '<details>',
    '<summary>🔧 Meeting Configuration</summary>',
    '',
    '### Duration',
    '',
    '90 minutes',
    '</details>',
  ].join('\n');

describe('extractAgendaMarkdown', () => {
  it('takes the issue-form Agenda field without the fields around it', () => {
    expect(extractAgendaMarkdown(issueForm('- Glamsterdam\n  - Sepolia fork'))).toBe(
      '- Glamsterdam\n  - Sepolia fork',
    );
  });

  it('keeps headings the agenda itself uses, even at the same level as "### Agenda"', () => {
    // ACDT lists its breakouts as sibling headings of the Agenda field.
    const agenda = ['### Discussions', '', '- Devnet updates.', '', '### EL breakout', '', '- Gas limit'].join(
      '\n',
    );
    expect(extractAgendaMarkdown(issueForm(agenda))).toBe(agenda);
  });

  it('reads the pre-form layout, where the agenda is an h1 running to the end of the body', () => {
    const body = [
      '# All Core Devs - Execution (ACDE) #208, March 27, 2025',
      '',
      '* [March 27, 2025, 14:00-15:30 UTC](https://example.com)',
      '',
      '# Agenda ',
      '',
      '- Pectra',
      '    - Hoodi',
      '',
      'Facilitator email: tim@ethereum.org',
    ].join('\n');

    expect(extractAgendaMarkdown(body)).toBe('- Pectra\n    - Hoodi');
  });

  it('stops at the legacy config block that follows the agenda', () => {
    const body = [
      '# Agenda',
      '',
      '- Fusaka',
      '',
      '<details> <summary>🤖 config</summary>',
      '',
      '- Need a Zoom meeting ID : false',
      '</details>',
    ].join('\n');

    expect(extractAgendaMarkdown(body)).toBe('- Fusaka');
  });

  it('keeps a <details> the agenda itself folds items into', () => {
    // Only the meeting-config block ends the agenda, and it says so in its summary.
    const agenda = ['- Fusaka', '', '<details>', '<summary>Pre-reads</summary>', '', '- a link', '</details>'].join(
      '\n',
    );
    expect(extractAgendaMarkdown(issueForm(agenda))).toBe(agenda);
  });

  it('stops at the bare template prompts the pre-form bodies trail off into', () => {
    const body = [
      '# Agenda',
      '',
      '- Berlinterop updates',
      '',
      'Other comments and resources',
      '',
      'The zoom link will be sent to the facilitator via email',
    ].join('\n');

    expect(extractAgendaMarkdown(body)).toBe('- Berlinterop updates');
  });

  it('reads a heading the facilitator qualified', () => {
    // zkevm/004 titles it "Agenda (incl links to slides)"; others use
    // "Agenda for Call 04" or "Agenda overview". Equality would drop all of them.
    const body = ['### Agenda (incl links to slides)', '', '- [Project 1](https://example.com)'].join('\n');

    expect(extractAgendaMarkdown(body)).toBe('- [Project 1](https://example.com)');
  });

  it('prefers the issue-form field over a qualified heading nested inside it', () => {
    // FCR issues carry a whole briefing in the Agenda field, with "## Agenda for
    // Call 04" partway down. Taking that heading alone would drop everything above it.
    const agenda = ['## Client Implementation Status', '', '- Lighthouse', '', '## Agenda for Call 04', '', 'A. Client updates'].join(
      '\n',
    );
    expect(extractAgendaMarkdown(issueForm(agenda))).toBe(agenda);
  });

  it('treats an unfilled Agenda field as no agenda', () => {
    expect(extractAgendaMarkdown(issueForm('_No response_'))).toBe('');
    expect(extractAgendaMarkdown(issueForm('TBD'))).toBe('');
  });

  it('prefers the filled copy when a body pastes the issue form twice', () => {
    // Seen on ACDT #57: the first form's Agenda field is empty and the real
    // agenda sits under a second, duplicated header block.
    const body = [
      '### UTC Date & Time',
      '',
      'Oct 13, 2025, 14:00 UTC',
      '',
      '### Agenda',
      '',
      '### UTC Date & Time',
      '',
      '[October 13, 2025, 14:00 UTC](https://example.com)',
      '',
      '### Agenda',
      '',
      '#### Fusaka:',
      '',
      '- Fusaka devnet status updates',
    ].join('\n');

    expect(extractAgendaMarkdown(body)).toBe('#### Fusaka:\n\n- Fusaka devnet status updates');
  });

  it('returns nothing when the body has no agenda at all', () => {
    expect(extractAgendaMarkdown('# Previous Call Meeting Minutes\n\n- notes')).toBe('');
    expect(extractAgendaMarkdown(undefined)).toBe('');
  });
});
