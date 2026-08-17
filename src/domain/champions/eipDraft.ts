/**
 * The champion-owned slice of an EIP data file, and the pure merge that folds a
 * draft back into `src/data/eips/{id}.json`.
 *
 * The load-bearing invariant is roundtrip fidelity: an untouched draft must
 * re-serialize to the file byte for byte, so a champion pasting the builder's
 * output into GitHub produces a diff of only the lines they edited. That is why
 * every merge assigns into a clone (existing keys keep their position, new keys
 * append) rather than rebuilding objects from a canonical key order.
 */
import type {
  Champion,
  EIP,
  EipFaqItem,
  ForkRelationship,
  SupportingDocument,
} from '../../types/eip';
import { stakeholders, type StakeholderKey } from '../eips/stakeholders';

/**
 * `northStarAlignment` is deliberately absent: the goals it names are dated, so
 * the builder does not offer it. Existing values pass through untouched — the
 * merge only assigns keys it is given.
 */
export interface ChampionDraft {
  layer: 'EL' | 'CL' | '';
  reviewer: string;
  discussionLink: string;
  laymanDescription: string;
  benefits: string[];
  /** `null` is the explicit "there genuinely are none"; `[]` means unset. */
  tradeoffs: string[] | null;
  stakeholderImpacts: Record<StakeholderKey, string>;
  faq: EipFaqItem[];
  supportingDocuments: SupportingDocument[];
  /** Scoped to a single `forkRelationships[]` entry, selected by index. */
  champions: Champion[];
}

// ---------------------------------------------------------------------------
// Guideline and schema limits
// ---------------------------------------------------------------------------

/** Advisory style guidelines, from the /champions field guide. */
export const LAYMAN_DESCRIPTION_MAX_WORDS = 60;
export const CLAIM_MAX_WORDS = 16;

/** Hard limits from scripts/eip-schema.json. */
export const FAQ_MAX_ITEMS = 20;
export const FAQ_QUESTION_MAX_CHARS = 200;
export const FAQ_ANSWER_MAX_CHARS = 5000;
export const CHAMPIONS_MAX = 3;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Draft extraction
// ---------------------------------------------------------------------------

export function emptyStakeholderImpacts(): Record<StakeholderKey, string> {
  return Object.fromEntries(stakeholders.map((s) => [s.key, ''])) as Record<StakeholderKey, string>;
}

export function draftFromEip(eip: EIP, forkIndex: number): ChampionDraft {
  const impacts = emptyStakeholderImpacts();
  for (const { key } of stakeholders) {
    impacts[key] = eip.stakeholderImpacts?.[key]?.description ?? '';
  }

  return {
    layer: eip.layer ?? '',
    reviewer: eip.reviewer ?? '',
    discussionLink: eip.discussionLink ?? '',
    laymanDescription: eip.laymanDescription ?? '',
    benefits: [...(eip.benefits ?? [])],
    tradeoffs: eip.tradeoffs === null ? null : [...(eip.tradeoffs ?? [])],
    stakeholderImpacts: impacts,
    faq: (eip.faq ?? []).map((item) => ({ ...item })),
    supportingDocuments: (eip.supportingDocuments ?? []).map((doc) => ({ ...doc })),
    champions: (eip.forkRelationships[forkIndex]?.champions ?? []).map((c) => ({ ...c })),
  };
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

/**
 * Assign `updates` into a clone of `base`. Keys already present keep their
 * position, new keys append, and an `undefined` value deletes the key. Returns
 * `undefined` when nothing is left, so the caller can drop the parent key too.
 */
function mergeInto<T extends object>(
  base: T | undefined,
  updates: Record<string, unknown>,
): T | undefined {
  const out: Record<string, unknown> = { ...(base ?? {}) };
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) delete out[key];
    else out[key] = value;
  }
  return Object.keys(out).length === 0 ? undefined : (out as T);
}

/** Empty string means "clear this field", which deletes the key. */
const orUndefined = (value: string) => (value.trim() === '' ? undefined : value);

function mergeDescriptions<K extends string>(
  base: Partial<Record<K, { impact?: string; description: string }>> | undefined,
  keys: readonly K[],
  values: Record<K, string>,
) {
  return mergeInto(
    base,
    Object.fromEntries(
      keys.map((key) => [
        key,
        values[key].trim() === ''
          ? undefined
          : mergeInto(base?.[key], { description: values[key] }),
      ]),
    ),
  );
}

function mergeChampions(base: Champion[] | undefined, draft: Champion[]): Champion[] | undefined {
  const merged = draft
    .filter((c) => c.name.trim() !== '')
    .map((c, i) =>
      mergeInto<Champion>(base?.[i], {
        name: c.name,
        discord: orUndefined(c.discord ?? ''),
        telegram: orUndefined(c.telegram ?? ''),
        email: orUndefined(c.email ?? ''),
      })!,
    );
  return merged.length === 0 ? undefined : merged;
}

/** Merges a draft into a clone of `eip`. `eip` itself is never mutated. */
export function applyDraft(eip: EIP, draft: ChampionDraft, forkIndex: number): EIP {
  const faq = draft.faq.filter((item) => item.question.trim() !== '' || item.answer.trim() !== '');
  const docs = draft.supportingDocuments.filter(
    (doc) => doc.label.trim() !== '' || doc.url.trim() !== '',
  );

  const forkRelationships = eip.forkRelationships.map((relationship, i) =>
    i === forkIndex
      ? mergeInto<ForkRelationship>(relationship, {
          champions: mergeChampions(relationship.champions, draft.champions),
        })!
      : relationship,
  );

  return mergeInto<EIP>(eip, {
    layer: draft.layer === '' ? undefined : draft.layer,
    reviewer: orUndefined(draft.reviewer),
    discussionLink: orUndefined(draft.discussionLink),
    laymanDescription: orUndefined(draft.laymanDescription),
    benefits: draft.benefits.length > 0 ? draft.benefits : undefined,
    // `null` is meaningful here — it is the explicit "no tradeoffs" the schema allows.
    tradeoffs: draft.tradeoffs === null ? null : draft.tradeoffs.length > 0 ? draft.tradeoffs : undefined,
    stakeholderImpacts: mergeDescriptions(
      eip.stakeholderImpacts,
      stakeholders.map((s) => s.key),
      draft.stakeholderImpacts,
    ),
    faq: faq.length > 0 ? faq : undefined,
    supportingDocuments: docs.length > 0 ? docs : undefined,
    forkRelationships,
  })!;
}

/** Matches exactly what scripts/fetch-all-eips.mjs writes. */
export function serializeEip(eip: EIP): string {
  return JSON.stringify(eip, null, 2) + '\n';
}

// ---------------------------------------------------------------------------
// Validation (advisory — never blocks output)
// ---------------------------------------------------------------------------

export interface DraftWarning {
  /** Anchor of the matching field card on /champions. */
  field: string;
  message: string;
}

export function validateDraft(draft: ChampionDraft): DraftWarning[] {
  const warnings: DraftWarning[] = [];

  // Same completeness checks as scripts/audit-eips.mjs.
  if (draft.layer === '') {
    warnings.push({ field: 'smaller-fields', message: 'Missing layer — pick EL or CL.' });
  }
  if (draft.reviewer.trim() === '') {
    warnings.push({
      field: 'how-to-submit',
      message: 'Missing reviewer — set it to "expert" if you champion or authored this EIP.',
    });
  }
  if (draft.laymanDescription.trim() === '') {
    warnings.push({ field: 'laymanDescription', message: 'Missing laymanDescription.' });
  }
  if (draft.benefits.filter((b) => b.trim() !== '').length === 0) {
    warnings.push({ field: 'benefits', message: 'Missing benefits.' });
  }
  // Length is a guideline, not a warning — the live word counters carry it.

  // `null` is the explicit "there genuinely are none", a deliberate choice.
  if (draft.tradeoffs !== null && draft.tradeoffs.filter((t) => t.trim() !== '').length === 0) {
    warnings.push({
      field: 'tradeoffs',
      message: 'tradeoffs is empty — list them, or mark that there genuinely are none.',
    });
  }

  const faq = draft.faq.filter((item) => item.question.trim() !== '' || item.answer.trim() !== '');
  if (faq.length > FAQ_MAX_ITEMS) {
    warnings.push({
      field: 'faq',
      message: `${faq.length} FAQ items — the schema allows at most ${FAQ_MAX_ITEMS}.`,
    });
  }
  for (const [i, item] of faq.entries()) {
    if (item.question.length > FAQ_QUESTION_MAX_CHARS) {
      warnings.push({
        field: 'faq',
        message: `FAQ question ${i + 1} is ${item.question.length} characters — the schema allows at most ${FAQ_QUESTION_MAX_CHARS}.`,
      });
    }
    if (item.answer.length > FAQ_ANSWER_MAX_CHARS) {
      warnings.push({
        field: 'faq',
        message: `FAQ answer ${i + 1} is ${item.answer.length} characters — the schema allows at most ${FAQ_ANSWER_MAX_CHARS}.`,
      });
    }
    if (item.question.trim() === '' || item.answer.trim() === '') {
      warnings.push({
        field: 'faq',
        message: `FAQ item ${i + 1} needs both a question and an answer.`,
      });
    }
  }

  // No champion-count check: the builder hides "Add champion" at CHAMPIONS_MAX,
  // so a draft can never exceed it.

  const docs = draft.supportingDocuments.filter(
    (doc) => doc.label.trim() !== '' || doc.url.trim() !== '',
  );
  for (const [i, doc] of docs.entries()) {
    if (doc.label.trim() === '' || doc.url.trim() === '') {
      warnings.push({
        field: 'smaller-fields',
        message: `Supporting document ${i + 1} needs both a label and a URL.`,
      });
    }
  }

  return warnings;
}
