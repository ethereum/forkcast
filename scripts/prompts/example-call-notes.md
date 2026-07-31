## ACDT, 20 July 2026

### Glamsterdam Devnet 7 Status

- Dust settled, network performing well
- Erigon onboarding in progress (last client before full house)
  - Fewer validators until more deposits come in; may propose less
- Death Star added to devnet 7 for increased chaos
- Prysm/Erigon combo missing attestations on Dora; likely still syncing
- Malicious Prysm node updated, pending Aussie team review
  - Will introduce more degrees of freedom than Death Star this week

### Devnet 8 Planning

- Target: next week or week after, no rush given holidays and pending changes
- Benchmarking still needs time before devnet 8 is ready
- Goal: smooth fork transition with all clients on devnet 8
- Devnet 9 envisioned as a non-finality focused network, ideally within the month
- Discv5 only for EL on devnet 8: no objections, small code test to confirm first
- QUIC confirmed enabled on devnet 7; carry forward to devnet 8

### Fork Transition Bugs and Performance

- Main EL issues: gas accounting inconsistencies, nothing out of the ordinary
- CL surprise: SSZ containers at fork transition due to large validator set size (many exiting validators)
- Lodestar bug: spread operator blowing the stack on large Merkle trees (hundreds of thousands of nodes)
  - Not caught in small-tree testing; surfaced at devnet scale
- Stable containers performance impact: 10-20% slower across clients
  - Grandine, Teku, and others confirmed; optimization round needed before mainnet

### EIP Staging and Spec Updates

- All devnet 7 EIPs appear to satisfy SFI criteria per EIP-7723
  - Testing team and EL teams both comfortable with SFI move, but decision can only happen at ADC-E/C
  - Official SFI ratification to happen at next ACDC/ACD call Thursday
- EIP-7773 (meta EIP for Glamsterdam upgrade): proposed move to Review status
  - Authors to add PRs to EIP editing office hours tomorrow for merge before Thursday

### EL Breakout: JSON RPC Alignment and EIP-7997

- JSON RPC responses diverge across clients (error codes, empty lists, access list format)
  - HackMD summary of divergence points shared; clients asked to review
  - PR raised against execution-APIs to clarify; target alignment by devnet 8
  - Chase working on JSON RPC test suite; worth coordinating to add access list tests
- Sub-call traces: gas reservoir and spilled gas fields still unclear; to be discussed async
- EIP-7997 (contracts factory): PR adds factory to irregular state transition
  - Context: checking contract existence adds to execution witness, causing client divergence at fork boundary
  - Consensus: no need to specify irregular state transition since factory is already deployed on all chains
  - PR to be closed; no critical impact