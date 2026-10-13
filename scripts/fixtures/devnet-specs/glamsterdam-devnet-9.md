# glamsterdam-devnet-9 spec

:::info
:mega: **Genesis 2026-09-01 15:00:00 UTC** (`MIN_GENESIS_TIME` 1788274800). **Gloas fork at epoch 225 — 2026-09-02 15:00:00 UTC**, 24 h after genesis.
:::

:::warning
:rotating_light: **Client teams - please get your trunk branches ready.** devnet-9 runs **trunk images**
(`:master` / `:main` / `:unstable` / `:develop`)
:::

:::info
:checkered_flag: **Scope. No new EIPs.** Two goals, in order:

1. **A clean Gloas fork transition** from a large pre-fork state that exists at genesis rather than being grown over days of block production. This is what the L2 teams asked for after Plataberget.
2. **Non-finality testing** — drive the network below the 2/3 participation threshold, hold it in the inactivity leak, observe recovery.
:::

## EIP List for glamsterdam-devnet-9

Unchanged from devnet-8 except where marked.

| EIP | Title | Status |
|-----|-------|:------:|
|[EIP-2780](https://eips.ethereum.org/EIPS/eip-2780) | Reduce intrinsic transaction gas | |
|[EIP-7610](https://eips.ethereum.org/EIPS/eip-7610) | Revert creation in case of non-empty storage | :x: |
|[EIP-7688](https://eips.ethereum.org/EIPS/eip-7688) | Forward compatible consensus data structures | |
|[EIP-7708](https://eips.ethereum.org/EIPS/eip-7708) | ETH transfers emit a log | |
|[EIP-7732](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7732.md) | Enshrined Proposer-Builder Separation | |
|[EIP-7778](https://eips.ethereum.org/EIPS/eip-7778) | Block Gas Accounting without Refunds | |
|[EIP-7843](https://eips.ethereum.org/EIPS/eip-7843) | SLOTNUM opcode | |
|[EIP-7904](https://eips.ethereum.org/EIPS/eip-7904) | Compute Gas Cost Analysis (informational only) | ℹ️ |
|[EIP-7928](https://eips.ethereum.org/EIPS/eip-7928) | Block-Level Access Lists | |
|[EIP-7954](https://eips.ethereum.org/EIPS/eip-7954) | Increase Maximum Contract Size (→ 64 KiB) | |
|[EIP-7975](https://eips.ethereum.org/EIPS/eip-7975) | eth/70 - partial block receipt lists | |
|[EIP-7976](https://eips.ethereum.org/EIPS/eip-7976) | Increase Calldata Floor Cost (64/64) | |
|[EIP-7981](https://eips.ethereum.org/EIPS/eip-7981) | Increase Access List Cost | |
|[EIP-7997](https://eips.ethereum.org/EIPS/eip-7997) | Deterministic Factory Predeploy | |
|[EIP-8024](https://eips.ethereum.org/EIPS/eip-8024) | Backward compatible SWAPN, DUPN, EXCHANGE | |
|[EIP-8037](https://eips.ethereum.org/EIPS/eip-8037) | State Creation Gas | :warning: |
|[EIP-8038](https://eips.ethereum.org/EIPS/eip-8038) | State-access gas cost update | |
|[EIP-8045](https://eips.ethereum.org/EIPS/eip-8045) | Exclude slashed validators from proposing | |
|[EIP-8061](https://eips.ethereum.org/EIPS/eip-8061) | Increase exit and consolidation churn | |
|[EIP-8070](https://eips.ethereum.org/EIPS/eip-8070) | eth/72 - Sparse Blobpool | |
|[EIP-8136](https://eips.ethereum.org/EIPS/eip-8136) | Cell-Level Deltas for Data Column Broadcast | |
|[EIP-8159](https://eips.ethereum.org/EIPS/eip-8159) | eth/71 - Block Access List Exchange | |
|[EIP-8189](https://eips.ethereum.org/EIPS/eip-8189) | snap/2 - BAL-Based State Healing | |
|[EIP-8246](https://eips.ethereum.org/EIPS/eip-8246) | Remove SELFDESTRUCT Burn | |
|[EIP-8261](https://eips.ethereum.org/EIPS/eip-8261) | Gas Limit Schedule (optional) | ℹ️ |
|[EIP-8282](https://github.com/ethereum/EIPs/pull/11760) | Add builder execution requests | |

**Key:** :up: updated · :new: added · :x: removed for devnet-9 · :warning: changes under review · ℹ️ informational / optional


- **EIP-7610 — removed from Glamsterdam** 2026-08-20 (EIPs commit `f9976e68`); EELS
  [#3417](https://github.com/ethereum/execution-specs/pull/3417) deleted the tests. 


## Execution Layer Client Support

| Item | Geth | Besu | Reth | Nethermind | Erigon | Nimbus-EL | Ethrex |
|-----|:----:|:----:|:----:|:----------:|:------:|:---------:|:------:|
| Trunk image | ✅ `:master` | ✅ `:main` | ❌ pinned | ✅ `:master` | ✅ `:main` | ❌ pinned | :hammer: `:main` |
| Frozen 8038/2780 in the **published image** | ✅ | ✅ | ✅ | ✅ | ✅ `main-bbf97b6` | ✅ | :hammer: |
| eth/72 (EIP-8070) on trunk | ✅ | ✅ | ❌ not on `main` | ✅ | ✅ | ✅ | :hammer: |
| EIP-7610 removal | :hammer: | :hammer: | :hammer: | :hammer: | :hammer: | :hammer: | :hammer: |
| Undecodable BAL → `INVALID` ([#869](https://github.com/ethereum/execution-apis/pull/869)) | ❌ | ✅ | ❌ | :grey_question: | ❌ | :grey_question: | ❌ |

### Implementation tracker CL

| Item | Lodestar | Lighthouse | Prysm | Teku | Nimbus | Grandine |
|------|:--------:|:----------:|:-----:|:----:|:------:|:--------:|
| Trunk image | ✅ `:unstable` | ✅ `:unstable` | :grey_question: `:develop` | ✅ `:master` | ✅ `:unstable` | :grey_question: `:develop` |
| `v1.7.0-alpha.14` | ✅ | ✅ | ❌ alpha.12 | ✅ | ✅ | ✅ |
| `get_parent_payload_status` for a pre-Gloas parent ([#5096](https://github.com/ethereum/consensus-specs/issues/5096)) | `FULL` | `PENDING` | :grey_question: | :grey_question: | :grey_question: | :grey_question: |
| EIP-8261 gas-limit schedule | :grey_question: | ❌ | :grey_question: | ✅ | ❌ | ❌ |

### Test Releases

**Consensus Specs:** [v1.7.0-alpha.14](https://github.com/ethereum/consensus-specs/releases/tag/v1.7.0-alpha.14) (2026-08-19, `0718095c4d54`) :heavy_check_mark:

**Execution Specs (EELS):** [tests-glamsterdam-devnet@v8.1.3](https://github.com/ethereum/execution-specs/releases/tag/tests-glamsterdam-devnet@v8.1.3) (2026-08-31) — branch [`devnets/glamsterdam/8`](https://github.com/ethereum/execution-specs/tree/devnets/glamsterdam/8)

### Spec versions required & Open PRs

**EIPs**
- [PR-12249 - Update EIP-8037: refill state-gas for a SELFDESTRUCTed account](https://github.com/ethereum/EIPs/pull/12249) Open :exclamation:
- [PR-12256 - Update EIP-8037: restore a frame's state-gas on rollback](https://github.com/ethereum/EIPs/pull/12256) Open :exclamation:
- [PR-12265 - Update EIP-8037: return state-gas to gas_left when a child merges](https://github.com/ethereum/EIPs/pull/12265) Open :exclamation:

**Consensus Specs**
- [ISSUE-5096 - Gloas: `on_block` is ill-defined at fork boundary](https://github.com/ethereum/consensus-specs/issues/5096) Closed :x:
- [PR-5125 - Guard `get_parent_payload_status` at fork boundary](https://github.com/ethereum/consensus-specs/pull/5125) Open :exclamation:
- [PR-5545 - Initialize anchor PTC vote arrays in `get_forkchoice_store`](https://github.com/ethereum/consensus-specs/pull/5545) Merged :heavy_check_mark:
- [PR-5554 - Use slot from header instead of bid](https://github.com/ethereum/consensus-specs/pull/5554) Merged :heavy_check_mark:
- [PR-5559 - Ignore proposer preferences for pre-Gloas slots](https://github.com/ethereum/consensus-specs/pull/5559) Merged :heavy_check_mark:
- [PR-5563 - Load gossip validation state from the store](https://github.com/ethereum/consensus-specs/pull/5563) Merged :heavy_check_mark:
- [PR-5580 - Reject bids from builders exited by the parent's payload](https://github.com/ethereum/consensus-specs/pull/5580) Merged :heavy_check_mark:

All five merged PRs post-date the `v1.7.0-alpha.14` tag. #5580 is **not consensus-breaking** — p2p bid validation only.

**Execution APIs**
- [PR-856 - engine: specify bit ordering for the 16-byte custody and cell bitarrays](https://github.com/ethereum/execution-apis/pull/856) Open :exclamation:
- [PR-869 - engine: return INVALID for undecodable blockAccessList](https://github.com/ethereum/execution-apis/pull/869) Merged :heavy_check_mark:

**Networking**
- [PR-281 - caps/eth: define the pooled transaction encoding and fix the txsize definition](https://github.com/ethereum/devp2p/pull/281) Open :exclamation:

**Execution Specs**
- [PR-3417 - chore(tests): remove EIP-7610 create collision tests](https://github.com/ethereum/execution-specs/pull/3417) Merged :heavy_check_mark:
- [PR-3475 - feat(tests): EIP-7928 - storage reads of a recreated destroyed account](https://github.com/ethereum/execution-specs/pull/3475) Merged :heavy_check_mark:

**Other**
- [PR-854 - Add gas limit schedule config](https://github.com/grandinetech/grandine/pull/854) Open :exclamation:
- [PR-9878 - Add gas limit schedule](https://github.com/sigp/lighthouse/pull/9878) Open :exclamation:
- [PR-11203 - fix: announce the pooled representation of a locally submitted blob transaction](https://github.com/besu-eth/besu/pull/11203) Open :exclamation:
- [PR-17354 - Glamsterdam devnet 8](https://github.com/OffchainLabs/prysm/pull/17354) Open :exclamation:
- [PR-17380 - Explicitly set bid fields when upgrading to Gloas](https://github.com/OffchainLabs/prysm/pull/17380) Open :exclamation:
- [PR-17383 - Bump consensus spec to v1.7.0-alpha.14](https://github.com/OffchainLabs/prysm/pull/17383) Open :exclamation:

## EIP-8037 changes under review

Three PRs from Paweł's partial review. **None are in devnet-9** — it ships EIP-8037 as specified in EELS `devnets/glamsterdam/8`. **EL decides by Thursday 2026-09-03.** If either open PR lands, EELS needs a spec update and a new fixture release.

| # | Change | EIPs PR | Status |
|---|--------|---------|--------|
| 1 | Refill state-gas for an account created and `SELFDESTRUCT`ed in the same transaction, keyed on final state at transaction finalization. Adds `requires: 8246`. | [#12249](https://github.com/ethereum/EIPs/pull/12249) | :x: **not coming** — 3 clients against at ACDT #94; ACDE #244 deferred it to Hegotá |
| 2 | Add frame-local `state_gas_baseline`; replace "refill in LIFO order" with an explicit restore-to-baseline block on revert/halt. | [#12256](https://github.com/ethereum/EIPs/pull/12256) | :warning: open — **underspecification fix**. Rollback refills the state-gas "charged within the frame", but no counter holds that quantity (`L0` is never defined), so two frames can revert with every defined counter equal and still owe different amounts. No fixture can catch it. |
| 3 | Add a merge step returning state-gas from the reservoir to `gas_left`, capped by the frame's outstanding `state_gas_from_gas_left`. | [#12265](https://github.com/ethereum/EIPs/pull/12265) | :warning: open — **behaviour change**. `state_gas_from_gas_left` is frame-local but a slot's original value is its value at transaction start, so a refill can land in a different frame than the charge. Two sibling calls (an ERC-4337 bundle) strand 97,920 gas the caller cannot spend on execution. Also makes `gas_left` able to increase across a call. |

## Genesis / network parameters

| Parameter | devnet-8 | devnet-9 |
|-----------|----------|----------|
| Validator nodes | 84 | **1,000** (mainnet-weighted) + 4 bootnodes + 4 buildoors |
| `NUMBER_OF_VALIDATORS` | 84,000 | **1,000,000** (1,000 per node) |
| `ADDITIONAL_VALIDATOR_MNEMONICS` | *(none)* | **3,000,000 exited** (`start: 1100000`, `wd_prefix: 0x00`, `status: 2`) |
| Registry size | 84,000 | **≈4,000,000** |
| `genesis.ssz` | 14.4 MB | **≈560 MB** |
| Total stake | 2.7M ETH | **32M ETH** |
| `GLOAS_FORK_EPOCH` | 1536 (~6.8 d) | **225** (24 h) |
| `GENESIS_GASLIMIT` | 60,000,000 | 60,000,000 |
| `WITHDRAWAL_TYPE` | `0x02` | `0x02` |
| Genesis generator | 6.2.0 | **6.2.0** |
| EL discovery | discv5-only | discv5-only |

## Open items

- [ ] **prysm + grandine trunk confirmation.**
- [ ] **EIP-8037**: EL decision on [#12256](https://github.com/ethereum/EIPs/pull/12256) / [#12265](https://github.com/ethereum/EIPs/pull/12265) by Thursday 2026-09-03.
- [ ] **EIP-7610 removal reconciled** across all seven ELs (currently 4–3).
- [ ] [consensus-specs#5096](https://github.com/ethereum/consensus-specs/issues/5096) — `get_parent_payload_status` is undefined for a pre-Gloas parent; **Lighthouse returns PENDING, Lodestar returns FULL**. Closed NOT_PLANNED 08-31; fix PR [#5125](https://github.com/ethereum/consensus-specs/pull/5125) open. Please confirm what your client returns.
- [ ] [devp2p#281](https://github.com/ethereum/devp2p/pull/281) — eth/72 `txsize` is ambiguous for type-3 (EIP-4844 defines a separate pooled encoding); causing live cross-client peer downscoring on devnet-8. Client fix example: [besu#11203](https://github.com/besu-eth/besu/pull/11203).
- [ ] [execution-apis#856](https://github.com/ethereum/execution-apis/pull/856) — `custodyColumns` bit→byte ordering unspecified; a reversed ordering still decodes to a well-formed 128-bit set, so **failure is silent**.
- [ ] [execution-apis#869](https://github.com/ethereum/execution-apis/pull/869) — undecodable `blockAccessList` must yield `{status: INVALID}`, not a JSON-RPC error. Merged 08-28, after the current images were built.


## Local testing

```yaml
participants_matrix:
  el:
    - el_type: geth
      el_image: ethpandaops/geth:master
    - el_type: nethermind
      el_image: ethpandaops/nethermind:master
    - el_type: besu
      el_image: ethpandaops/besu:main
  cl:
    - cl_type: lighthouse
      cl_image: ethpandaops/lighthouse:unstable
    - cl_type: lodestar
      cl_image: ethpandaops/lodestar:unstable
    - cl_type: teku
      cl_image: ethpandaops/teku:master

network_params:
  preset: minimal
  gloas_fork_epoch: 1

additional_services:
  - assertoor
  - spamoor
  - dora

assertoor_params:
  run_stability_check: false
  run_block_proposal_check: false
  tests:
    - { file: "https://raw.githubusercontent.com/ethpandaops/assertoor/refs/heads/master/playbooks/gloas-dev/builder-lifecycle.yaml" }
    - { file: "https://raw.githubusercontent.com/ethpandaops/assertoor/refs/heads/master/playbooks/gloas-dev/builder-deposit.yaml" }

dora_params:
  image: ethpandaops/dora:master-latest

port_publisher:
  additional_services:
    enabled: true

global_log_level: debug
```

---

## Metrics

https://notes.ethereum.org/@ethpandaops/bal-otel

Previous devnet spec sheet: https://notes.ethereum.org/@ethpandaops/glamsterdam-devnet-8
