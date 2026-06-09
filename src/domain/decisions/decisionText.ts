/**
 * Pure helpers for rendering ACD key decisions as static HTML — the build-time
 * counterpart of the rendering logic in `components/call/KeyDecisionsSection.tsx`
 * (`getTagLabel`, `DecisionTextWithEipLinks`, `EipLinkWithTooltip`'s preview data).
 */
import type { EIP, KeyDecision } from '../../types/eip';

/** Short label for the colored decision tag. Ported from `KeyDecisionsSection.getTagLabel`. */
export const getTagLabel = (decision: KeyDecision): string => {
  if (decision.type === 'headliner_selected') return 'Headliner';
  if (decision.type === 'devnet_inclusion') return decision.devnet || 'devnet';
  if (decision.type === 'stage_change' && decision.stage_change) {
    switch (decision.stage_change.to) {
      case 'Considered':
        return 'CFI';
      case 'Scheduled':
        return 'SFI';
      case 'Declined':
        return 'DFI';
      case 'Included':
        return 'Included';
      case 'Withdrawn':
        return 'Withdrawn';
      default:
        return decision.stage_change.to;
    }
  }
  return '';
};

const cleanAuthorName = (author: string): string =>
  author
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*$/, '')
    .trim();

const truncateText = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : text.slice(0, maxLength).trimEnd() + '...';

export type DecisionTextPart = { kind: 'text'; value: string } | { kind: 'eip'; id: number };

/**
 * Split a decision's `original_text` into plain-text and EIP-link parts, replacing
 * "EIP-XXXX"/bare "XXXX" mentions of known EIPs with link parts and appending any
 * referenced EIPs not present in the text. Ported from `DecisionTextWithEipLinks`.
 */
export const splitTextWithEipLinks = (decision: KeyDecision): DecisionTextPart[] => {
  const { original_text: text, eips } = decision;
  if (eips.length === 0) return [{ kind: 'text', value: text }];

  const eipSet = new Set(eips);
  const idPattern = eips.map((id) => `EIP-${id}\\b|\\b${id}\\b`).join('|');
  const regex = new RegExp(`(${idPattern})`, 'g');

  const linkedIds = new Set<number>();
  const out: DecisionTextPart[] = [];
  for (const part of text.split(regex)) {
    const bareMatch = part.match(/^(?:EIP-)?(\d+)$/);
    if (bareMatch) {
      const id = Number(bareMatch[1]);
      if (eipSet.has(id)) {
        linkedIds.add(id);
        out.push({ kind: 'eip', id });
        continue;
      }
    }
    if (part) out.push({ kind: 'text', value: part });
  }

  const unlinked = eips.filter((id) => !linkedIds.has(id));
  if (unlinked.length > 0) {
    out.push({ kind: 'text', value: ' (' });
    unlinked.forEach((id, i) => {
      if (i > 0) out.push({ kind: 'text', value: ', ' });
      out.push({ kind: 'eip', id });
    });
    out.push({ kind: 'text', value: ')' });
  }
  return out;
};

/** Data shown in an EIP hover preview card. Mirrors `EipLinkWithTooltip`. */
export interface EipPreview {
  id: number;
  layer?: 'EL' | 'CL';
  title: string;
  description: string;
  author: string;
}

export const buildEipPreview = (eip: EIP): EipPreview => ({
  id: eip.id,
  layer: eip.layer,
  title: eip.title.replace(/^EIP-\d+:\s*/, ''),
  description: truncateText(eip.laymanDescription || eip.description || '', 250),
  author: cleanAuthorName(eip.author),
});

/** Collect preview data for every EIP referenced across a set of decisions. */
export const collectEipPreviews = (
  decisions: KeyDecision[],
  eipMap: Map<number, EIP>,
): EipPreview[] => {
  const ids = new Set<number>();
  for (const d of decisions) for (const id of d.eips) ids.add(id);
  return [...ids]
    .map((id) => eipMap.get(id))
    .filter((eip): eip is EIP => Boolean(eip))
    .map(buildEipPreview);
};
