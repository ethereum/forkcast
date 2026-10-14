const eipReferencePattern =
  /(?:\.\/eip-|(?:\.\.\/)?EIPS\/eip-|https?:\/\/eips\.ethereum\.org\/EIPS\/eip-)(\d+)(?:\.md)?/;

export type EipMarkdownLinkResolution =
  | { kind: 'internal'; eipId: number; href: string }
  | { kind: 'external'; eipId: number; href: string };

export function resolveEipMarkdownLink(
  href: string,
  eipsById: ReadonlyMap<number, unknown>
): EipMarkdownLinkResolution | null {
  const match = href.match(eipReferencePattern);
  if (!match) return null;

  const eipId = Number(match[1]);
  const target = eipsById.get(eipId);

  if (target) {
    return { kind: 'internal', eipId, href: `/eips/${eipId}` };
  }

  return {
    kind: 'external',
    eipId,
    href: `https://eips.ethereum.org/EIPS/eip-${eipId}`,
  };
}

const SPEC_SITE_PATH = /^\/EIPS\/eip-(\d+)(?:\.md)?\/?$/;
const FORKCAST_EIP_PATH = /^\/eips\/(\d+)\/?$/;

/**
 * The EIP a link merely points *at*, for callers that can show it in place
 * rather than navigate — the spec site's page for an EIP, or a Forkcast EIP
 * page with nothing further selected.
 *
 * Null for everything else, so the link is left alone: a GitHub PR labelled
 * "EIP-8358", a link into a particular tab of the EIP page, a deep link to a
 * section of a spec, or an EIP Forkcast holds no data for — there is nothing
 * to show in place for any of them.
 */
export function resolveEipOverviewLink(
  href: string,
  eipsById: ReadonlyMap<number, unknown>,
): number | null {
  let url: URL;
  try {
    // Relative hrefs in authored markdown are Forkcast's own.
    url = new URL(href, 'https://forkcast.org');
  } catch {
    return null;
  }
  if (url.hash) return null;

  const path =
    url.host === 'eips.ethereum.org' ? SPEC_SITE_PATH.exec(url.pathname)
    : url.host === 'forkcast.org' && !url.search ? FORKCAST_EIP_PATH.exec(url.pathname)
    : null;
  if (!path) return null;

  const eipId = Number(path[1]);
  return eipsById.has(eipId) ? eipId : null;
}
