import { describe, expect, it } from 'vitest';
import { parseMetaEip, reconcileMetaEip } from './meta-eip.mjs';

// Upcoming forks (EIP-7773, EIP-8081) put every EIP directly under a status
// heading, so a flat parse works.
const UPCOMING_LAYOUT = `
## Specification

### EIPs Scheduled for Inclusion

* [EIP-7732](./eip-7732.md): ePBS

### Considered for Inclusion

* [EIP-7805](./eip-7805.md): FOCIL

### Other EIPs

#### Networking EIPs

* [EIP-8189](./eip-8189.md): snap/2

#### Informational EIP

* [EIP-8261](./eip-8261.md): Gas Limit Schedule

### Declined for Inclusion

* [EIP-7919](./eip-7919.md): Pureth Meta

### Activation

* [EIP-9999](./eip-9999.md): not a status section
`;

// Shipped forks (EIP-7600, EIP-7607) nest everything under one "Included EIPs"
// heading, split into "Core EIPs" / "Other EIPs" subsections.
const SHIPPED_LAYOUT = `
## Specification

### Included EIPs

#### Core EIPs

* [EIP-7594](./eip-7594.md): PeerDAS

#### Other EIPs

* [EIP-7892](./eip-7892.md): BPO Hardforks

### Full Specifications

#### Execution Layer

* [EIP-1234](./eip-1234.md): a spec link, not an inclusion
`;

describe('parseMetaEip', () => {
  it('reads each status section of an upcoming fork', () => {
    expect(Object.fromEntries(parseMetaEip(UPCOMING_LAYOUT))).toEqual({
      7732: 'Scheduled',
      7805: 'Considered',
      8189: 'Networking',
      8261: 'Informational',
      7919: 'Declined',
    });
  });

  // Regression: subsection headings used to reset the active status, so shipped
  // forks parsed to zero entries and the audit reported a clean run.
  it('keeps the status across subsections of a shipped fork', () => {
    expect(Object.fromEntries(parseMetaEip(SHIPPED_LAYOUT))).toEqual({
      7594: 'Included',
      7892: 'Included',
    });
  });

  it('ignores EIPs listed outside any status section', () => {
    expect(parseMetaEip(UPCOMING_LAYOUT).has(9999)).toBe(false);
    expect(parseMetaEip(SHIPPED_LAYOUT).has(1234)).toBe(false);
  });
});

describe('reconcileMetaEip', () => {
  const eip = (id, status) => ({
    id,
    forkRelationships: [{ forkName: 'Hegota', statusHistory: [{ status }] }],
  });

  it('stays quiet when Forkcast is ahead of the meta EIP', () => {
    const meta = new Map([[7732, 'Proposed']]);
    expect(reconcileMetaEip(meta, [eip(7732, 'Scheduled')], 'Hegota')).toEqual([]);
  });

  it('reports when the meta EIP is ahead of Forkcast', () => {
    const meta = new Map([[7732, 'Scheduled']]);
    const [issue] = reconcileMetaEip(meta, [eip(7732, 'Proposed')], 'Hegota');
    expect(issue).toMatchObject({ id: 7732, metaStatus: 'Scheduled', localStatus: 'Proposed' });
  });

  it('reports terminal statuses that disagree in either direction', () => {
    const meta = new Map([[7919, 'Declined']]);
    const [issue] = reconcileMetaEip(meta, [eip(7919, 'Withdrawn')], 'Hegota');
    expect(issue).toMatchObject({ id: 7919, metaStatus: 'Declined', localStatus: 'Withdrawn' });
  });

  it('reports EIPs Forkcast has no file or fork relationship for', () => {
    const meta = new Map([[8367, 'Proposed'], [8365, 'Proposed']]);
    const issues = reconcileMetaEip(meta, [eip(8365, 'Proposed')], 'Glamsterdam');
    expect(issues.map((i) => [i.id, i.reason])).toEqual([
      [8365, 'no "Glamsterdam" fork relationship'],
      [8367, 'no EIP data file'],
    ]);
  });
});
