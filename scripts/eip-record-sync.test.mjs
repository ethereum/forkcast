import { describe, expect, it } from 'vitest';
import {
  buildNewEipJson,
  findOtherClaimingPr,
  getPendingPullRequestNumber,
  hasCuratedContent,
  pendingPullRequest,
  updateExistingEip,
} from './eip-record-sync.mjs';

describe('EIP sync transitions', () => {
  it('builds pending PR EIPs with explicit pending metadata', () => {
    const pendingPr = pendingPullRequest(11726);
    const eip = buildNewEipJson(
      8272,
      {
        title: 'Recent Roots for Frame Transactions',
        status: 'Draft',
        description: 'Frame transactions can declare verified recent roots',
        author: 'Example Author',
        type: 'Standards Track',
        category: 'Core',
        createdDate: '2026-05-15',
        requires: [7843, 8141],
      },
      { pendingPullRequest: pendingPr },
    );

    expect(eip.pendingPullRequest).toEqual(pendingPr);
    expect(getPendingPullRequestNumber(eip)).toBe(11726);
  });

  it('updates official metadata through one transition while preserving local fields', () => {
    const existing = {
      id: 8272,
      title: 'EIP-8272: Old title',
      status: 'Draft',
      description: 'Old description',
      author: 'Old Author',
      type: 'Standards Track',
      category: 'Core',
      createdDate: '2026-05-15',
      discussionLink: 'https://ethereum-magicians.org/t/old',
      requires: [8141],
      pendingPullRequest: pendingPullRequest(11726),
      forkRelationships: [],
      laymanDescription: 'Keep local analysis',
      tradeoffs: null,
    };

    const { updated, changed } = updateExistingEip(
      8272,
      existing,
      {
        title: 'Recent Roots for Frame Transactions',
        status: 'Draft',
        description: 'New description',
        author: 'New Author',
        type: 'Standards Track',
        createdDate: '2026-05-20',
      },
      { pendingPullRequest: pendingPullRequest(11726) },
    );

    expect(changed).toBe(true);
    expect(updated).toMatchObject({
      title: 'EIP-8272: Recent Roots for Frame Transactions',
      description: 'New description',
      author: 'New Author',
      createdDate: '2026-05-20',
      laymanDescription: 'Keep local analysis',
      pendingPullRequest: pendingPullRequest(11726),
    });
    expect(updated).not.toHaveProperty('category');
    expect(updated).not.toHaveProperty('discussionLink');
    expect(updated).not.toHaveProperty('requires');
  });

  it('promotes a pending EIP to canonical data when fetched from master', () => {
    const { updated, changed } = updateExistingEip(
      8272,
      {
        id: 8272,
        title: 'EIP-8272: Recent Roots for Frame Transactions',
        status: 'Draft',
        description: 'Description',
        author: 'Author',
        type: 'Standards Track',
        createdDate: '2026-05-15',
        pendingPullRequest: pendingPullRequest(11726),
        forkRelationships: [],
        tradeoffs: null,
      },
      {
        title: 'Recent Roots for Frame Transactions',
        status: 'Draft',
        description: 'Description',
        author: 'Author',
        type: 'Standards Track',
        createdDate: '2026-05-15',
      },
      { clearPendingPullRequest: true },
    );

    expect(changed).toBe(true);
    expect(updated).not.toHaveProperty('pendingPullRequest');
  });
});

// Regression: EIP-8367 was tracked by both its canonical PR (#12099) and a
// duplicate (#12178). Closing the duplicate deleted the file outright, taking
// hand-authored narrative fields and a Hegota fork relationship with it.
describe('pending EIP deletion guards', () => {
  const stub = buildNewEipJson(
    8367,
    {
      title: 'Balance sunset for retired BLS validators',
      status: 'Draft',
      description: 'Description',
      author: 'NC (@ensi321)',
      type: 'Standards Track',
      category: 'Core',
      createdDate: '2026-07-18',
    },
    { pendingPullRequest: pendingPullRequest(12178) },
  );

  it('treats a freshly scaffolded stub as disposable', () => {
    expect(hasCuratedContent(stub)).toBe(false);
  });

  it('protects a record once it carries a fork relationship', () => {
    const curated = {
      ...stub,
      forkRelationships: [
        {
          forkName: 'Hegota',
          statusHistory: [
            { status: 'Proposed', call: 'acdc/184', date: '2026-08-06' },
          ],
          champions: [{ name: 'NC' }],
        },
      ],
    };

    expect(hasCuratedContent(curated)).toBe(true);
  });

  it.each([
    ['layer', 'CL'],
    ['reviewer', 'bot'],
    ['laymanDescription', 'Plain language summary'],
    ['benefits', ['A benefit']],
    ['tradeoffs', ['A tradeoff']],
  ])('protects a record once %s is authored', (field, value) => {
    expect(hasCuratedContent({ ...stub, [field]: value })).toBe(true);
  });

  it('does not mistake the null tradeoffs placeholder for authored content', () => {
    expect(stub.tradeoffs).toBeNull();
    expect(hasCuratedContent(stub)).toBe(false);
  });

  it('finds the canonical PR when a duplicate submission closes', () => {
    const manifest = {
      prs: {
        12099: { eipNumbers: [8367] },
        12178: { eipNumbers: [8367] },
      },
    };

    expect(findOtherClaimingPr(manifest, 12178, 8367)).toBe(12099);
  });

  it('ignores the closing PR itself when looking for other claimants', () => {
    const manifest = { prs: { 12178: { eipNumbers: [8367] } } };

    expect(findOtherClaimingPr(manifest, 12178, 8367)).toBeNull();
  });

  it('tolerates manifest entries with no EIP numbers', () => {
    const manifest = { prs: { 12099: {}, 12151: { eipNumbers: [] } } };

    expect(findOtherClaimingPr(manifest, 12178, 8367)).toBeNull();
  });
});
