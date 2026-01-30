# EIP-7807 Context

Generated: 2026-01-30

## Raw EIP Content
Source: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7807.md
```
---
eip: 7807
title: SSZ execution blocks
description: Migration of execution blocks to SSZ
author: Etan Kissling (@etan-status), Gajinder Singh (@g11tech)
discussions-to: https://ethereum-magicians.org/t/eip-7807-ssz-execution-blocks/21580
status: Draft
type: Standards Track
category: Core
created: 2024-10-28
requires: 6404, 6465, 6466, 7495, 7706, 7799
---

## Abstract

This EIP defines a migration process of execution blocks to [Simple Serialize (SSZ)](https://github.com/ethereum/consensus-specs/blob/b5c3b619887c7850a8c1d3540b471092be73ad84/ssz/simple-serialize.md).

## Motivation

With [EIP-6404](./eip-6404.md) SSZ transactions, [EIP-6466](./eip-6466.md) SSZ receipts, and [EIP-6465](./eip-6465.md) SSZ withdrawals, all Merkle-Patricia Tries (MPT) besides the state trie are converted to SSZ. This enables the surrounding data structure, the execution block itself, to also convert to SSZ, achieving a unified block representation across both Consensus Layer and Execution Layer.

1. **Normalized block hash:** The Consensus Layer can compute the block hash autonomously, enabling it to process all consistency checks that currently require asynchronous communication with the Execution Layer ([`verify_and_notify_new_payload`](https://github.com/ethereum/consensus-specs/blob/b5c3b619887c7850a8c1d3540b471092be73ad84/specs/electra/beacon-chain.md#modified-verify_and_notify_new_payload)). This allows early rejection of inconsistent blocks and dropping the requirement to wait for engine API interactions while syncing.

2. **Optimized engine API:** With all exchanged data supporting SSZ, the engine API can be changed from the textual JSON encoding to binary SSZ encoding, reducing exchanged data size by ~50% and significantly improving encoding/parsing efficiency.

3. **Proving support:** With SSZ, individual fields of the execution block header become provable without requiring full block headers to be present. With [EIP-7495](./eip-7495.md) SSZ `ProgressiveContainer`, proofs are forward compatible as long as underlying semantics of individual fields are unchanged, reducing maintenance requirements for smart contracts and verifying client applications.

4. **Cleanup opportunity:** The conversion to SSZ allows dropping historical fields from the PoW era and the inefficient logs bloom mechanism.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Gas amounts

The different kinds of gas amounts are combined into a single structure, mirroring the [EIP-6404 gas fees](./eip-6404.md#gas-fees).

| Name | SSZ equivalent |
| - | - |
| [`GasAmount`](./eip-6404.md#normalized-transactions) | `uint64` |

```python
class GasAmounts(ProgressiveContainer(active_fields=[1, 1])):
    regular: GasAmount
    blob: GasAmount
```

### Requests hash computation

`requests_hash` is changed to `ExecutionRequests.hash_tree_root()` using the same structure as in the Consensus Layer `BeaconBlockBody`.

### Execution block headers

New execution block headers use a normalized SSZ representation.

```python
class ExecutionBlockHeader(
    ProgressiveContainer(active_fields=[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
):
    parent_hash: Root
    miner: ExecutionAddress
    state_root: Bytes32
    transactions_root: Root  # EIP-6404 transactions.hash_tree_root()
    receipts_root: Root  # EIP-6466 receipts.hash_tree_root()
    number: uint64
    gas_limits: GasAmounts
    gas_used: GasAmounts
    timestamp: uint64
    extra_data: ByteList[MAX_EXTRA_DATA_BYTES]
    mix_hash: Bytes32
    base_fees_per_gas: BlobFeesPerGas
    withdrawals_root: Root  # EIP-6465 withdrawals.hash_tree_root()
    excess_gas: GasAmounts
    parent_beacon_block_root: Root
    requests_hash: Bytes32  # EIP-6110 execution_requests.hash_tree_root()
    system_logs_root: Root  # EIP-7799 system_logs.hash_tree_root()
```

### Execution block hash computation

For new blocks, the execution block hash is changed to be based on `hash_tree_root` in all contexts, including (1) the `BLOCKHASH` opcode, (2) JSON-RPC API interactions (`blockHash` field), (3) devp2p networking.

### Consensus `ExecutionPayload` changes

Usages of `ExecutionPayloadHeader` are replaced with `ExecutionBlockHeader`.

Usages of `ExecutionPayload` are updated to share `hash_tree_root` with `ExecutionBlockHeader`. `transactions_root`, `withdrawals_root` and `requests_hash` are expanded to their full list contents.

```python
class ExecutionPayload(
    ProgressiveContainer(active_fields=[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
):
    parent_hash: Root
    miner: ExecutionAddress
    state_root: Bytes32
    transactions: ProgressiveList[Transaction]
    receipts_root: Root
    number: uint64
    gas_limits: GasAmounts
    gas_used: GasAmounts
    timestamp: uint64
    extra_data: ByteList[MAX_EXTRA_DATA_BYTES]
    mix_hash: Bytes32
    base_fees_per_gas: BlobFeesPerGas
    withdrawals: ProgressiveList[Withdrawal]
    excess_gas: GasAmounts
    parent_beacon_block_root: Root
    requests: ExecutionRequests
    system_logs_root: Root
```

## Rationale

This completes the transition to SSZ for everything except the execution state trie.

### Future

- With SSZ `Log`, the withdrawals mechanism and validator requests could be redefined to be based on logs (similar to deposits, originally, but without the delay), possibly removing the need for `withdrawals_root` and `requests_hash`.
  - The CL would insert the extra logs for minting ([EIP-7799](./eip-7799.md)) and could fetch the ones relevant for withdrawing (deposits, requests, consolidations). That mechanism would be more generic than [EIP-7685](./eip-7685.md) and would drop requiring the EL to special case requests, including `compute_requests_hash`.
  - For client applications and smart contracts, it would streamline transaction history verification based on [EIP-7792](./eip-7792.md).

- The Engine API should be updated with (1) possible withdrawals/requests refactoring as above, (2) dropping the `block_hash` field so that `ExecutionPayload` is replaced with `ExecutionBlockHeader`, (3) binary encoding based on `ForkDigest`-context (through HTTP header or interleaved, similar to beacon-API). This reduces encoding overhead and also simplifies sharing data structures in combined CL/EL in-process implementations.

## Backwards Compatibility

This breaks compatibility of smart contracts that depend on the previous block header binary format, including for "generic" implementations that assume a common prefix and run the entire data through a linear keccak256 hash.

## Security Considerations

The SSZ block hash is based on SHA256 and shares the namespace with existing keccak256 based block hashes. As these hash algorithms are fundamentally different, no significant collision risk is expected.

## Copyright

Copyright and related rights waived via [CC0](../LICENSE.md).
```

## Commit History
Source: https://github.com/ethereum/EIPs/commits/master/EIPS/eip-7807.md
```
{"sha":"267ea31","date":"2025-10-06","message":"Update EIP-7807: Fix ProgressiveContainer syntax in GasAmounts"}
{"sha":"41f2d94","date":"2025-09-29","message":"Update EIP-7807: align ExecutionPayload text to use requests_hash instead of requests_root"}
{"sha":"679f6ee","date":"2025-09-01","message":"Update EIP-7807: fix/correct style issues"}
{"sha":"51d6e0f","date":"2025-08-20","message":"Update EIP-7807: correct grammar in Engine API section"}
{"sha":"c8ce3f7","date":"2025-08-18","message":"Update EIP-7807: fix typo"}
{"sha":"de33cd5","date":"2025-08-04","message":"Update EIP-6404: Use correct Python syntax for active_fields"}
{"sha":"9d3f1b1","date":"2025-07-03","message":"Update EIP-7807: Adopt `ProgressiveContainer`"}
{"sha":"22c2a07","date":"2025-07-02","message":"Update EIP-6404: Use SSZ `ProgressiveContainer` / `Union`"}
{"sha":"5d156b0","date":"2025-03-25","message":"Update EIP-6404: fix typos"}
{"sha":"5ed0648","date":"2025-03-04","message":"Update EIP-7807: release notes with latest changes"}
{"sha":"167b4b5","date":"2025-02-10","message":"Update EIP-6404: Bump links to tagged beta spec version"}
{"sha":"385ce07","date":"2024-11-13","message":"Add EIP: SSZ execution blocks"}
```

## Original PR Discussion
Source: https://github.com/ethereum/EIPs/pull/9017

### PR Body
(Empty body)

### Issue Comments
- **eth-bot** (2024-11-04): All reviewers have approved.
- **github-actions** (2024-11-04): The commit 096adc4313c31c700e57971546ccd7bad9e96311 (as a parent of b539e59b4d6c92c764d24406190ea61ad8ec7a87) contains errors. Please inspect the Run Summary for details.

### Review Comments
- **abcoathup** (2024-11-05): Assigning next sequential EIP/ERC/RIP number.. Please also update the filename.
- **abcoathup** (2024-11-05): Added EIP number to Eth Magicians topic title
- **abcoathup** (2024-11-05): Does the E in execution need to be capitalized?

### Reviews
- **g11tech**: APPROVED
- **eth-bot**: APPROVED - All Reviewers Have Approved; Performing Automatic Merge...

## Eth Magicians Discussion Thread
Source: https://ethereum-magicians.org/t/eip-7807-ssz-execution-blocks/21580

### Posts

**etan-status** (2024-11-04):
Discussion topic for EIP-7807 https://eips.ethereum.org/EIPS/eip-7807

#### Update Log
*2024-11-04: initial draft https://github.com/ethereum/EIPs/pull/9017

#### External Reviews
None as of 2024-11-04.

#### Outstanding Issues
- 2024-11-04: Deposits / Withdrawals refactoring, https://github.com/ethereum/EIPs/pull/9017/files
- 2024-11-04: Engine API proposal, https://github.com/ethereum/EIPs/pull/9017/files
- 2024-11-04: Networking proposal, https://github.com/ethereum/EIPs/pull/9017/files

#### Update Log
- 2025-07-03: Adopt `ProgressiveContainer` (https://github.com/ethereum/EIPs/pull/9976)

**etan-status** (2025-07-03):
Update EIP-7807: Adopt `ProgressiveContainer`
- Use EIP-7495 ProgressiveContainer for latest forward compatibility changes
- Replicate changes to ExecutionPayload / Header to avoid separate `block_hash` field / use hash_tree_root everywhere

## Headliner Proposal
Source: https://ethereum-magicians.org/t/hegota-headliner-proposal-ssz-execution-blocks/27619

### Posts

**etan-status** (2026-01-29):
EIP-7807: SSZ execution blocks proposes to change most of Ethereum's EL data structures to be based on Simple Serialize (SSZ).

#### Summary
- Add SSZ library to EL: Basic impl, with progressive type extensions EIP-7916, EIP-7495, EIP-8016
- Hash transactions, receipts, withdrawals, and block hash with SSZ instead of RLP when building blocks
- Binary engine API to access EL data via SSZ
- EIP-6493 Native SSZ transactions as a platform to build new transaction / signature types on (only as headliner)
- Out of scope: Log revamps, EL state trie.

#### Primary benefits
- **Typed signatures:** Signature types can evolve independently of transaction types, providing a straight-forward avenue towards PQ signatures.
- **Tree-based hashes:** Replacing flat hashes with binary Merkle trees enables proofs of partial data, e.g., for just the first chunk of calldata that contains the function signature.
- **Binary API:** Switching to SSZ allows reuse of a canonical binary REST API inspired by beacon-APIs. This also reduces latency for data format conversion on the engine API.

#### Secondary benefits
- **Forward compatibility:** Common transaction / receipt fields share the same relative location in the Merkle tree across all transaction types. Smart contracts consuming them need less maintenance.
- **Metadata verifiability:** Sender address, deployed contract address, and per-transaction gas used, are hashed into the receipt, reducing round trips to obtain common data, and simplifying RPC server design.
- **Simpler sync:** CL no longer needs RLP / MPT support for optimistically syncing without an EL during maintenance. ELs no longer need to verify blob KZG commitments and block hashes on behalf of the CL. EL no longer needs a separate SSZ library for syncing beacon block headers (light client protocol).

#### Why now?
- **Dependent EIPs:** EIPs that add new transaction / signature types benefit from having SSZ from the getgo. Further, this is another step towards the verifiable log filter (EIP-7745) proposal.
- **Future plans:** Doing this EIP now is in line with proposals that enshrine a specific transaction serialization (e.g., native rollups, FOCIL), needs efficient and verifiable data structures (e.g., lean Ethereum), or benefits from simpler reasoning (e.g., max block size discussions).
- **Scaling needs:** The JSON based engine API starts to become a relevant bottleneck as the number of blobs increases and block data grows bigger (e.g., BALs)

#### Alternative solutions
- This headliner would combine well with a transaction type headliner based on the native SSZ transactions platform (EIP-6493). The new transaction type would be built on top of the new platform and provide immediate validation of the design.
- The scope could be reduced to non-headliner by doing just the hashing changes (i.e., transactions_root, receipts_root, withdrawals_root, and block_hash). Potentially complex updates to database, network, and internal logic no longer has to be synced across implementations. However, EIP-6493 may have to be deferred as it adds new functionality instead of just revamping an existing hash.

#### Stakeholder impact
- **Positive:** Verifying applications and smart contracts, transaction EIP authors
- **Negative:** Daunting database / network protocol changes

#### Technical readiness
Prototypes in EthereumJS and NimbusEL (epf). devnet 0 sketch.
EIP overall structure ready, details subject to change.

**etan-status** (2026-01-29):
(Image attachment)

## Call Transcript
Source: acde/229 - public/artifacts/acde/2026-01-29_229/transcript_corrected.vtt

### Relevant Excerpts

**01:26:42** - Ansgar Dietrichs: Ethan wanted to talk about SSZ execution blocks. Ethan, you only have a few minutes. Of course, you can take... you can go a little bit over, but some people might have to drop off. If you felt comfortable with that time, we could, of course, also push by 2 weeks, but feel free to go ahead now if you're comfortable with that time.

**01:26:57** - Etan (Nimbus): It's okay, it's okay, I can make it really quick. Essentially, like, can you see my screen?

**01:27:06** - Etan (Nimbus): So, this is just, like, a follow-up on the Pureth that was discussed for the headliner for Glamsterdam. Back then, it was way too big. Like, this was, like, the scope. But what happened is, like, that the individual pieces got proposed independently, and now we got, like, the ETH transfer logs on the EL and the progressive SSZ types on the CL as, like, a partial, scope.

**01:27:30** - Etan (Nimbus): And at the same time, we also have this breakout call from Schulte every second Tuesday about the log index and so on. The goal is still the same, to be able to build a wallet without relying on trusted third parties. So now, the idea is to reduce the scope,

**01:27:50** - Etan (Nimbus): essentially focusing on what's urgent right now, like, it's mostly the engine API that needs... rethink, because we are starting to get latency issues there because of the data format conversion, like converting from SSZ to JSON to RLP, especially at higher blob counts, and also, like.

**01:28:11** - Etan (Nimbus): We have the problem with the hashes for the transactions and receipts. As a reminder, these are linear hashes today.

**01:28:18** - Etan (Nimbus): And transaction data includes call data, and the receipt contains the log data, and it's all just a single linear hash. That's a problem for payload chunking, if we want to move the payload into the blobs, for example.

**01:28:35** - Etan (Nimbus): So, getting this... this in here, just fits naturally. So, the question now is how big do we want to make it?

**01:28:46** - Etan (Nimbus): So, the bare minimum would be, like, just the binary engine API, the transactions try, the receipts try, and the SSZ block hash for the block payload. That would allow, like, the EL to pretend that it's full SSZ to the CL. The CL could, just get all these benefits, but also at the same time, we have these new transaction types, both of these proposals, and I think it makes sense to just combine, combine it in a way so that whatever we add now, like, if it's the framed transactions. Or the encrypted transactions just builds on top of SSZ, so that we get these binary trees, so that we can fetch partial transaction data, so that we have... on-chain commitments to the contract address, to the sender address, and so on.

**01:29:38** - Etan (Nimbus): So yeah, that's the idea, like, how big do we want to make it? Right now, I propose it as a headliner, just because of the synergies with the new transaction type, but, yeah, if it, doesn't... like, if we want to stay with RLP MPTs and, like, convert, to avoid, database networking revamps, then we can also reduce it again for this fork.

**01:30:14** - Ansgar Dietrichs: Sounds good, thank you very much.

**01:30:29** - Etan (Nimbus): I'm all for Binary Engine API and Binary ELRPC.

**01:30:39** - Etan (Nimbus): We have synergy with the transaction EIPs, so... like, the only thing is, if we want to do it, then we should probably start to put those transaction EIPs on top of SSZ rather than RLP. Should be a rather small change.

**01:31:02** - Ansgar Dietrichs: Sounds good. Any... any more questions or comments?

**01:31:14** - Ansgar Dietrichs: Okay, well then, we just managed to finish the scope of the call, perfect.

## Eth R&D Discord Context
Source: Eth R&D Discord (user-provided)
None provided.

## Related EIPs
- EIP-6404: SSZ transactions
- EIP-6465: SSZ withdrawals
- EIP-6466: SSZ receipts
- EIP-7495: SSZ ProgressiveContainer
- EIP-7706: Separate gas type for calldata
- EIP-7799: System logs
