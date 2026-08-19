const META_EIP_BASE_URL = 'https://raw.githubusercontent.com/ethereum/EIPs/refs/heads/master/EIPS/eip-';

/** Fork name -> its Hardfork Meta EIP number. */
export const META_EIP_BY_FORK = {
  pectra: 7600,
  fusaka: 7607,
  glamsterdam: 7773,
  hegota: 8081,
};

// Meta EIP section heading (lowercased) -> the Forkcast statusHistory status it implies.
const SECTION_STATUSES = [
  ['scheduled for inclusion', 'Scheduled'],
  ['considered for inclusion', 'Considered'],
  ['proposed for inclusion', 'Proposed'],
  ['declined for inclusion', 'Declined'],
  ['networking eip', 'Networking'],
  ['informational eip', 'Informational'],
  // Shipped forks list everything under one "Included EIPs" section.
  ['included eip', 'Included'],
];

// Stages an EIP advances through. Forkcast is normally *ahead* of the meta EIP,
// so only flag when the meta EIP is ahead of us. Statuses outside this list
// (Declined, Networking, Informational, ...) are terminal and compared exactly.
const STAGE_RANK = { Proposed: 0, Considered: 1, Scheduled: 2, Included: 3 };

function sectionStatus(heading) {
  const lower = heading.toLowerCase();
  const match = SECTION_STATUSES.find(([needle]) => lower.includes(needle));
  return match ? match[1] : null;
}

/**
 * Parse a Hardfork Meta EIP's markdown into a Map of EIP id -> status, keyed by
 * the section each EIP is listed under.
 */
export function parseMetaEip(markdown) {
  const entries = new Map();
  let status = null;
  let statusLevel = 0;

  for (const line of markdown.split('\n')) {
    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const matched = sectionStatus(heading[2]);
      if (matched) {
        status = matched;
        statusLevel = level;
      } else if (level <= statusLevel) {
        // Only a sibling or ancestor heading ends the section. Deeper unmatched
        // headings nest inside it: shipped forks split "Included EIPs" into
        // "Core EIPs" / "Other EIPs" subsections.
        status = null;
        statusLevel = 0;
      }
      continue;
    }
    const item = line.match(/^\s*[*-]\s*\[EIP-(\d+)\]/);
    if (item && status) {
      entries.set(Number(item[1]), status);
    }
  }

  return entries;
}

function currentStatus(forkRelationship) {
  const history = forkRelationship.statusHistory;
  if (!history || history.length === 0) return null;
  return history[history.length - 1].status;
}

/**
 * Diff a parsed meta EIP against Forkcast's EIP data for the same fork.
 * Only reports where the meta EIP knows something Forkcast does not.
 */
export function reconcileMetaEip(metaEntries, eips, forkName) {
  const byId = new Map(eips.map((e) => [e.id, e]));
  const issues = [];

  for (const [id, metaStatus] of metaEntries) {
    const eip = byId.get(id);
    if (!eip) {
      issues.push({ id, metaStatus, localStatus: null, reason: 'no EIP data file' });
      continue;
    }

    const fr = (eip.forkRelationships || []).find(
      (r) => r.forkName.toLowerCase() === forkName.toLowerCase(),
    );
    if (!fr) {
      issues.push({
        id,
        metaStatus,
        localStatus: null,
        reason: `no "${forkName}" fork relationship`,
      });
      continue;
    }

    const localStatus = currentStatus(fr);
    if (localStatus === metaStatus) continue;

    const metaRank = STAGE_RANK[metaStatus];
    const localRank = STAGE_RANK[localStatus];
    if (metaRank !== undefined && localRank !== undefined && localRank > metaRank) {
      continue; // Forkcast is ahead of the meta EIP, which is expected
    }

    issues.push({
      id,
      metaStatus,
      localStatus,
      reason: `meta EIP says "${metaStatus}", Forkcast says "${localStatus ?? 'nothing'}"`,
    });
  }

  issues.sort((a, b) => a.id - b.id);
  return issues;
}

export async function fetchMetaEip(metaEipNumber) {
  const response = await fetch(`${META_EIP_BASE_URL}${metaEipNumber}.md`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching EIP-${metaEipNumber}`);
  }
  return response.text();
}
