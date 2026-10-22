// Official metadata fields that are synced from upstream.
// All other fields (forkRelationships, laymanDescription, benefits, etc.) are preserved.
export const METADATA_FIELDS = [
  'title',
  'description',
  'author',
  'status',
  'category',
  'createdDate',
  'type',
  'discussionLink',
  'requires',
];

export const OPTIONAL_METADATA_FIELDS = new Set([
  'category',
  'discussionLink',
  'requires',
]);

// EIPs with status "Moved" (e.g., ERCs moved to their own repo) are excluded.
export const EXCLUDED_STATUSES = new Set(['Moved']);

// Application-level standards live in ethereum/ERCs. One filed against
// ethereum/EIPs is in the wrong repo; the ones already on master carry
// status "Moved", but a fresh PR is still Draft, so the category is the tell.
export const EXCLUDED_CATEGORIES = new Set(['ERC']);

export function eipPullRequestUrl(prNumber) {
  return `https://github.com/ethereum/EIPs/pull/${prNumber}`;
}

export function pendingPullRequest(prNumber) {
  return {
    number: prNumber,
    url: eipPullRequestUrl(prNumber),
  };
}

export function getPendingPullRequestNumber(eip) {
  return eip?.pendingPullRequest?.number ?? null;
}

// Fields the PR sync never writes itself. Their presence means a human (or a
// curation skill) has invested work in the record, so it must not be deleted
// just because the PR it was scaffolded from went away.
const CURATED_FIELDS = [
  'layer',
  'reviewer',
  'laymanDescription',
  'benefits',
  'tradeoffs',
  'stakeholderImpacts',
  'northStarAlignment',
  'faq',
  'supportingDocuments',
];

export function hasCuratedContent(eip) {
  if (eip.forkRelationships?.length) return true;
  return CURATED_FIELDS.some((field) => eip[field] != null);
}

// An EIP can be claimed by more than one PR (e.g. a duplicate submission).
// Closing one of them must not orphan the record.
export function findOtherClaimingPr(manifest, prNumber, eipNumber) {
  for (const [other, entry] of Object.entries(manifest.prs)) {
    if (Number(other) === Number(prNumber)) continue;
    if ((entry.eipNumbers ?? []).includes(eipNumber)) return Number(other);
  }
  return null;
}

export function buildNewEipJson(eipNumber, mapped, options = {}) {
  return {
    id: eipNumber,
    title: `EIP-${eipNumber}: ${mapped.title || ''}`,
    status: mapped.status || 'Unknown',
    description: mapped.description || '',
    author: mapped.author || '',
    type: mapped.type || 'Standards Track',
    ...(mapped.category && { category: mapped.category }),
    createdDate: mapped.createdDate || '',
    ...(mapped.discussionLink && { discussionLink: mapped.discussionLink }),
    ...(mapped.requires?.length && { requires: mapped.requires }),
    ...(options.pendingPullRequest && {
      pendingPullRequest: options.pendingPullRequest,
    }),
    forkRelationships: [],
    tradeoffs: null,
  };
}

function normalize(str) {
  if (!str) return '';
  return str.toString().trim().replace(/\s+/g, ' ');
}

function officialMetadataValue(field, eipNumber, mapped) {
  if (field === 'title') {
    return `EIP-${eipNumber}: ${mapped.title || ''}`;
  }

  return mapped[field];
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function updateExistingEip(eipNumber, existing, mapped, options = {}) {
  const updated = { ...existing };
  let changed = false;

  for (const field of METADATA_FIELDS) {
    const officialValue = officialMetadataValue(field, eipNumber, mapped);

    if (officialValue === undefined || officialValue === null) {
      if (OPTIONAL_METADATA_FIELDS.has(field) && field in updated) {
        delete updated[field];
        changed = true;
      }
      continue;
    }

    if (normalize(existing[field]) !== normalize(officialValue)) {
      updated[field] = officialValue;
      changed = true;
    }
  }

  if (options.pendingPullRequest) {
    if (!sameJson(updated.pendingPullRequest, options.pendingPullRequest)) {
      updated.pendingPullRequest = options.pendingPullRequest;
      changed = true;
    }
    if (updated.specificationUrl?.includes('/ethereum/EIPs/pull/')) {
      delete updated.specificationUrl;
      changed = true;
    }
  } else if (options.clearPendingPullRequest) {
    if (updated.pendingPullRequest) {
      delete updated.pendingPullRequest;
      changed = true;
    }
    if (updated.specificationUrl?.includes('/ethereum/EIPs/pull/')) {
      delete updated.specificationUrl;
      changed = true;
    }
  }

  return { updated, changed };
}

// The EIPs repo allocates numbers in this range. Anything outside it is a
// placeholder (`eip-9999.md` awaiting an editor) or a malformed submission.
export const MIN_ALLOCATED_EIP_NUMBER = 1;
export const MAX_ALLOCATED_EIP_NUMBER = 9998;

/**
 * Whether a PR's added `EIPS/eip-{n}.md` carries a real, editor-allocated
 * number. The frontmatter `eip` field must be present, numeric, agree with the
 * filename, and fall inside the allocated range.
 */
export function isAllocatedEipNumber(eipNumber, frontmatterEip) {
  if (frontmatterEip == null) return false;

  const raw = String(frontmatterEip).trim();
  if (!/^\d+$/.test(raw)) return false;
  if (Number(raw) !== eipNumber) return false;

  return (
    eipNumber >= MIN_ALLOCATED_EIP_NUMBER &&
    eipNumber <= MAX_ALLOCATED_EIP_NUMBER
  );
}

// The three types the EIP process defines. A submission claiming anything else
// has not been through an editor, whatever number its frontmatter carries.
export const VALID_EIP_TYPES = new Set([
  'Standards Track',
  'Meta',
  'Informational',
]);

export function isValidEipType(type) {
  return VALID_EIP_TYPES.has(String(type ?? '').trim());
}

/**
 * Why a PR's EIP submission is not worth a record, or null if it is.
 * `type` catches invented types; `category` and `status` catch submissions
 * that belong in another repo.
 */
export function eipSubmissionRejection(mapped) {
  if (!isValidEipType(mapped.type)) {
    return `type "${mapped.type}" is not an EIP type`;
  }
  if (EXCLUDED_CATEGORIES.has(mapped.category)) {
    return `category "${mapped.category}" belongs in ethereum/ERCs`;
  }
  if (EXCLUDED_STATUSES.has(mapped.status)) {
    return `status "${mapped.status}"`;
  }
  return null;
}
