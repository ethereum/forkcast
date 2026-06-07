import type { Call } from '../../data/calls';

/**
 * Legacy `/calls/{githubIssue}` aliases, preserved as Astro configured redirects.
 *
 * The SPA matched a bare issue number and redirected it to the call's canonical
 * `/calls/{series}/{number}` page (the old CallPage issue-redirect effect). Phase 1
 * moves that React-Router redirect into Astro's static redirects. The map is derived
 * from the compiled call data so the alias set can never drift from the pages the
 * build emits — adding a call automatically preserves its shared issue-number URL.
 *
 * Returns a map of alias path -> canonical path. One-off calls are handled uniformly
 * (e.g. `/calls/1954` -> `/calls/one-off-1954/001`); the bare issue number is the
 * friendly entry point for a series-less call.
 */
export function buildCallIssueRedirects(
  calls: ReadonlyArray<Pick<Call, 'issue' | 'path'>>,
): Record<string, string> {
  const redirects: Record<string, string> = {};
  for (const call of calls) {
    if (call.issue != null) {
      redirects[`/calls/${call.issue}`] = `/calls/${call.path}`;
    }
  }
  return redirects;
}
