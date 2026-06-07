import { describe, expect, it } from 'vitest';
import { protocolCalls } from '../../data/calls';
import { buildCallIssueRedirects } from './callRoutes';

describe('buildCallIssueRedirects', () => {
  it('maps a bare issue number to the call canonical /calls/{type}/{number} path', () => {
    const map = buildCallIssueRedirects([
      { issue: 2018, path: 'aa/001' },
      // one-off: the bare issue number redirects to the synthetic canonical path
      { issue: 1954, path: 'one-off-1954/001' },
    ]);
    expect(map['/calls/2018']).toBe('/calls/aa/001');
    expect(map['/calls/1954']).toBe('/calls/one-off-1954/001');
  });

  it('skips calls without an issue', () => {
    expect(buildCallIssueRedirects([{ path: 'acde/238' }])).toEqual({});
  });

  // Guards the published-URL invariant the bot asked for: every completed call with
  // an issue keeps an alias, and issue numbers are unique (no alias collision), so a
  // future call sync cannot silently drop or clobber a shared /calls/{issue} URL.
  it('emits exactly one alias per completed call that has an issue', () => {
    const map = buildCallIssueRedirects(protocolCalls);
    const withIssue = protocolCalls.filter((c) => c.issue != null);
    expect(Object.keys(map)).toHaveLength(withIssue.length);
    for (const call of withIssue) {
      expect(map[`/calls/${call.issue}`]).toBe(`/calls/${call.path}`);
    }
  });
});
