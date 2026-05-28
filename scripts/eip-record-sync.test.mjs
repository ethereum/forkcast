import { describe, expect, it } from 'vitest';
import {
  buildNewEipJson,
  getPendingPullRequestNumber,
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
