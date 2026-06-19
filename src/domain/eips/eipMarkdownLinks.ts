import type { EIP } from '../../types/eip';

const eipReferencePattern =
  /(?:\.\/eip-|(?:\.\.\/)?EIPS\/eip-|https?:\/\/eips\.ethereum\.org\/EIPS\/eip-)(\d+)(?:\.md)?/;

export type EipMarkdownLinkResolution =
  | { kind: 'internal'; eipId: number; href: string }
  | { kind: 'external'; eipId: number; href: string };

export function resolveEipMarkdownLink(
  href: string,
  eipsById: ReadonlyMap<number, Pick<EIP, 'pendingPullRequest'>>
): EipMarkdownLinkResolution | null {
  const match = href.match(eipReferencePattern);
  if (!match) return null;

  const eipId = Number(match[1]);
  const target = eipsById.get(eipId);

  if (target && !target.pendingPullRequest) {
    return { kind: 'internal', eipId, href: `/eips/${eipId}` };
  }

  return {
    kind: 'external',
    eipId,
    href: `https://eips.ethereum.org/EIPS/eip-${eipId}`,
  };
}
