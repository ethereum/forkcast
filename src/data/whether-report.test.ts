import { describe, expect, it } from 'vitest';
import { whetherReport } from './whether-report';
import { getUpgradePagePath, networkUpgrades } from './upgrades';
import { linkKind, parseBriefText } from '../domain/home/briefText';

/**
 * The brief is hand-written, so these guard the ways a typo would show on the homepage
 * rather than fail anywhere a person would notice.
 */
describe('the Whether Report', () => {
  it('is dated as a calendar day', () => {
    expect(whetherReport.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(whetherReport.date))).toBe(false);
  });

  it('gives every item something to be headed by, and something to say', () => {
    for (const item of whetherReport.items) {
      expect(item.title ?? item.fork, JSON.stringify(item)).toBeTruthy();
      expect(item.body.trim().length, JSON.stringify(item)).toBeGreaterThan(0);
    }
  });

  it('does not set a href that the fork page would override', () => {
    for (const item of whetherReport.items) {
      // The fork's own page always wins the link, so a href here would go nowhere silently.
      if (item.fork) expect(item.href, `${item.title ?? item.fork}`).toBeUndefined();
    }
  });

  it('names upgrades that exist and have a page to link to', () => {
    for (const item of whetherReport.items) {
      if (!item.fork) continue;
      const upgrade = networkUpgrades.find((candidate) => candidate.id === item.fork);
      expect(upgrade, `no upgrade "${item.fork}"`).toBeDefined();
      // Without a public page the heading would link at a route the build never emits.
      expect(getUpgradePagePath(item.fork), `upgrade "${item.fork}" has no page`).not.toBeNull();
    }
  });

  it('only links a title heading somewhere the page will render', () => {
    for (const item of whetherReport.items) {
      if (!item.href) continue;
      expect(
        /^https?:\/\//.test(item.href) || (item.href.startsWith('/') && !item.href.startsWith('//')),
        `${item.title}: ${item.href}`
      ).toBe(true);
    }
  });

  /**
   * Every run of words a reader sees, labelled by where to go and change it. Bodies are
   * taken as rendered, so a `/our/` or an em dash inside a link's URL is not read as copy.
   */
  const prose = (): [string, string][] => {
    const runs: [string, string][] = [['the tagline', whetherReport.tagline]];

    for (const item of whetherReport.items) {
      const where = item.fork ?? item.title;
      if (item.title) runs.push([`${where} title`, item.title]);
      for (const action of item.actions ?? []) runs.push([`${where} action`, action.label]);
      runs.push([
        `${where} body`,
        parseBriefText(item.body)
          .map((segment) => segment.text)
          .join(''),
      ]);
    }

    return runs;
  };

  it('carries no em dash, the one mark that reads as though nobody wrote it', () => {
    for (const [where, written] of prose()) {
      expect(written, `${where}: use a full stop or a semicolon`).not.toMatch(/\u2014/);
    }
  });

  it('is not written in the first person, since the byline already says who is talking', () => {
    for (const [where, written] of prose()) {
      expect(written, `${where}: write it as the page, not as the author`).not.toMatch(
        /\b(?:I|me|my|mine|we|our|ours)\b/i
      );
    }
  });

  it('gives every call to action a label and a link the page will open', () => {
    for (const item of whetherReport.items) {
      for (const action of item.actions ?? []) {
        const where = `${item.fork ?? item.title}: ${action.label || '(no label)'}`;
        expect(action.label.trim().length, where).toBeGreaterThan(0);
        // A chip whose href the page rejects renders as nothing at all, not as plain text.
        expect(linkKind(action.href), `${where} -> ${action.href}`).not.toBeNull();
      }
    }
  });

  it('leaves no link in the prose that would silently render as plain words', () => {
    for (const item of whetherReport.items) {
      const written = (item.body.match(/\[[^\]]+\]\(/g) ?? []).length;
      const rendered = parseBriefText(item.body).filter((segment) => segment.href).length;
      expect(rendered, `${item.fork ?? item.title}: a link in the body was rejected`).toBe(written);
    }
  });
});
