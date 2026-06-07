import type { Call } from '../../data/calls';

/**
 * Maps each completed call's GitHub-issue number to its canonical
 * `/calls/{series}/{number}` path, so a shared `/calls/{issue}` link still resolves
 * to the call page. Wired into Astro's configured redirects.
 *
 * Deriving the map from the compiled call data keeps it in lockstep with the pages
 * the build emits: adding a call automatically preserves its issue-number URL, and
 * the invariant test catches a duplicate issue clobbering one. One-off calls are
 * handled uniformly (e.g. `/calls/1954` -> `/calls/one-off-1954/001`).
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
