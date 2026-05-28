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
