# glamsterdam-devnet-4 spec
:::info
:mega: glamsterdam-devnet-4 targets to launch in late May 2026.
:::

:::info
:checkered_flag: **First `glamsterdam-` prefixed CL+EL devnet** combining `consensus-specs` **v1.7.0-alpha.8** with the **bal-devnet-7** EL feature set, plus the new `targetGasLimit` engine API field ([execution-apis#796](https://github.com/ethereum/execution-apis/pull/796) ↔ [consensus-specs#5235](https://github.com/ethereum/consensus-specs/pull/5235)).
:::

:::info
❗ **`targetGasLimit` on `PayloadAttributesV4`** — CL now passes the per-validator target gas limit to the EL on `engine_forkchoiceUpdatedV4`, replacing the static EL-side flag. CL also enforces `target_gas_limit` consistency with the block's `gas_limit` (CL PR-5236).
:::

:::info
❗ **EIP-8037 final shape:** `cost_per_state_byte` **1174 → 1530** (fixed), `STATE_BYTES_PER_NEW_ACCOUNT` 112 → 120, `STATE_BYTES_PER_STORAGE_SET` 32 → 64. `SYSTEM_CALL_GAS_LIMIT` raised so system calls can't OOG on state-gas alone. Reference block gas limit raised 96M → **150M**.
:::

:::info
❗ **eth/70 (EIP-7975) and eth/71 (EIP-8159) are now mandatory** — every EL must implement both (promoted from optional in bal-devnet-7).
:::

## EIP List for glamsterdam-devnet-4

| EIP | Title |Status
|--------|-----|-------|
|[EIP-7708](https://eips.ethereum.org/EIPS/eip-7708) | ETH transfers emit a log |
|[EIP-7732](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7732.md) | Enshrined Proposer-Builder Separation | :up:
|[EIP-7778](https://eips.ethereum.org/EIPS/eip-7778) | Block Gas Accounting without Refunds |
|[EIP-7843](https://eips.ethereum.org/EIPS/eip-7843) | SLOTNUM opcode |
|[EIP-7928](https://eips.ethereum.org/EIPS/eip-7928) | Block-Level Access Lists | :up:
|[EIP-7954](https://eips.ethereum.org/EIPS/eip-7954) | Increase Maximum Contract Size |
|[EIP-7975](https://eips.ethereum.org/EIPS/eip-7975) | eth/70 - partial block receipt lists | :exclamation: **required**
|[EIP-7976](https://eips.ethereum.org/EIPS/eip-7976) | Increase Calldata Floor Cost (64/64) |
|[EIP-7981](https://eips.ethereum.org/EIPS/eip-7981) | Increase Access List Cost |
|[EIP-8024](https://eips.ethereum.org/EIPS/eip-8024) | Backward compatible SWAPN, DUPN, EXCHANGE
|[EIP-8037](https://eips.ethereum.org/EIPS/eip-8037) | State Creation Gas — **CPSB=1530**, system-call gas bump, halt/revert + SELFDESTRUCT refunds | :up:
|[EIP-8061](https://eips.ethereum.org/EIPS/eip-8061) | Increase exit and consolidation churn |
|[EIP-8159](https://eips.ethereum.org/EIPS/eip-8159) | eth/71 - Block Access List Exchange | :exclamation: **required**



**Key:**
- :up: EIP has updated!
- :new: New EIP added.
- :exclamation: scope changed (now required)


### Implementation tracker EL

## Execution Layer Client Support

| EIP |               Geth | Besu | Reth | Nethermind | Erigon | Nimbus-EL | Ethrex |
|-----|              :----:|:----:|:----:|:----------:|:------:|:---------:|:------:|
| 7708 / 7778 / 7843 / 7928 / 7954 / 7976 / 7981 / 8024 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7975 (eth/70 — **required**)   | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8037 (CPSB=1530 + #11611)      | :hammer: | :hammer: | :hammer: | :hammer: | :hammer: | :hammer: | :hammer: |
| 8159 (eth/71 — **required**)   | :hammer: | ✅ | :hammer: | ✅ | ✅ | ✅ | :hammer: |
| 7732 ePBS                       | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| engine: `targetGasLimit` (#796) | :hammer: | :hammer: | :hammer: | :hammer: | :hammer: | :hammer: | :hammer: |


### Implementation tracker CL
| Feature/EIP | Lodestar | Lighthouse | Prysm |
| ----------- | -------- | ---------- | ----- |
| **EIP-7928** | ✅ | ✅ | glamsterdam-devnet-0 |
| **alpha.8 rebase** | :hammer: | :hammer: | :hammer: |
| **`target_gas_limit` (#5235)** | :hammer: | :hammer: | :hammer: |


### Test Releases

**Consensus Specs:** [v1.7.0-alpha.8](https://github.com/ethereum/consensus-specs/releases/tag/v1.7.0-alpha.8)  :heavy_check_mark: 


**Execution Specs (EELS):** [tests-bal@v7.2.0](https://github.com/ethereum/execution-specs/releases/tag/tests-bal@v7.2.0) — branch [`devnets/bal/7`](https://github.com/ethereum/execution-specs/tree/devnets/bal/7) :heavy_check_mark:


### Spec versions required & Open PRs

**EIPs** (new since bal-devnet-7)

_None — all EIP updates were already incorporated into bal-devnet-7. See [bal-devnet-7](https://notes.ethereum.org/@ethpandaops/bal-devnet-7) for the historical EIP PR list._

**Builder Specs**
- [PR-138 - Staked Builder API for Glamsterdam](https://github.com/ethereum/builder-specs/pull/138) Open :exclamation:

**Consensus Specs** (consensus-breaking PRs between `v1.7.0-alpha.7` and `v1.7.0-alpha.8`)
- [PR-5181 - Add `beacon_blocks_by_head` ReqResp](https://github.com/ethereum/consensus-specs/pull/5181) Merged :heavy_check_mark:
- [PR-5186 - Force the proposer to reorg unavailable blocks](https://github.com/ethereum/consensus-specs/pull/5186) Merged :heavy_check_mark:
- [PR-5197 - Modify `notify_forkchoice_updated`](https://github.com/ethereum/consensus-specs/pull/5197) Merged :heavy_check_mark:
- [PR-5208 - Use `list` instead of `Vector` in the `Store` class](https://github.com/ethereum/consensus-specs/pull/5208) Merged :heavy_check_mark:
- [PR-5212 - Introduce separate payload availability deadline](https://github.com/ethereum/consensus-specs/pull/5212) Merged :heavy_check_mark:
- [PR-5215 - Use `MIN_SEED_LOOKAHEAD` in proposer preferences](https://github.com/ethereum/consensus-specs/pull/5215) Merged :heavy_check_mark:
- [PR-5222 - Count PTC votes from duplicated validators](https://github.com/ethereum/consensus-specs/pull/5222) Merged :heavy_check_mark:
- [PR-5223 - Raise `MIN_BUILDER_WITHDRAWABILITY_DELAY` to 8192 epochs](https://github.com/ethereum/consensus-specs/pull/5223) Merged :heavy_check_mark:
- [PR-5226 - Split out partial columns feature](https://github.com/ethereum/consensus-specs/pull/5226) Merged :heavy_check_mark:
- [PR-5227 - Add note about validating deposit signatures before the fork](https://github.com/ethereum/consensus-specs/pull/5227) Merged :heavy_check_mark:
- [PR-5235 - Add `target_gas_limit` to `PayloadAttributes`](https://github.com/ethereum/consensus-specs/pull/5235) Merged :heavy_check_mark:
- [PR-5236 - Check gas limit consistency with the target](https://github.com/ethereum/consensus-specs/pull/5236) Merged :heavy_check_mark:
- [PR-5254 - Optimize strategy for onboarding builders at the fork](https://github.com/ethereum/consensus-specs/pull/5254) Merged :heavy_check_mark:


**Execution APIs**
- [PR-778 - engine: move PayloadAttributesV4 into Amsterdam structures](https://github.com/ethereum/execution-apis/pull/778) Merged :heavy_check_mark:
- [PR-786 - engine: Restrict no-reorg to the prefix of known finalized](https://github.com/ethereum/execution-apis/pull/786) Merged :heavy_check_mark:
- [PR-794 - all: align EIP-7928 spec with latest EIP (uint32 BlockAccessIndex, header hash, debug getter)](https://github.com/ethereum/execution-apis/pull/794) Merged :heavy_check_mark: **required**
- [PR-796 - engine: add `targetGasLimit` to `PayloadAttributesV4`](https://github.com/ethereum/execution-apis/pull/796) Merged :heavy_check_mark: **required**
- [PR-798 - engine: Deduplicate PayloadAttributesV4](https://github.com/ethereum/execution-apis/pull/798) Merged :heavy_check_mark:

**Networking**
- [EIP-7928 GetBlockAccessLists, BlockAccessLists p2p](https://github.com/ethereum/devp2p/pull/264) Open :exclamation:

**Execution Specs**
- [tests-bal@v7.1.1](https://github.com/ethereum/execution-specs/releases/tag/tests-bal@v7.1.1) — EIP-8037 final shape, halt/revert refund bugfixes, EELS branch `devnets/bal/7`

**Other**

---

## EIP-8037 spec changes carried in via bal-devnet-7

Per the [`tests-bal@v7.0.0` release notes](https://github.com/ethereum/execution-specs/releases/tag/tests-bal@v7.0.0). EELS branch: `devnets/bal/7`.

| # | Change | EIPs PR | EELS PR / commit |
|---|--------|---------|------------------|
| 1 | Parameters: `CPSB 1174 → 1530`, `NEW_ACCOUNT 112 → 120`, `STORAGE_SET 32 → 64` | [#11616](https://github.com/ethereum/EIPs/pull/11616) | [specs#2827](https://github.com/ethereum/execution-specs/pull/2827) |
| 2 | `SYSTEM_CALL_GAS_LIMIT = 30M + STATE_BYTES_PER_STORAGE_SET × CPSB × SYSTEM_MAX_SSTORES_PER_CALL` (16 slots). Extra goes to `state_gas_reservoir` so system calls can't OOG on state-gas alone. | — | commit [`7b3e8016`](https://github.com/ethereum/execution-specs/commit/7b3e8016b1) |
| 3 | Top-level exceptional halt: refund full `state_gas_used` back to the reservoir | [#11611](https://github.com/ethereum/EIPs/pull/11611) | [specs#2815](https://github.com/ethereum/execution-specs/pull/2815) |
| 4 | EIP-7702 authorization state-gas refund included in `block.state_gas_used` | [#11611](https://github.com/ethereum/EIPs/pull/11611) | [specs#2816](https://github.com/ethereum/execution-specs/pull/2816) |
| 5 | Tx-level CREATE halt/revert: refund intrinsic `NEW_ACCOUNT × CPSB` to reservoir | [#11611](https://github.com/ethereum/EIPs/pull/11611) | [specs#2823](https://github.com/ethereum/execution-specs/pull/2823) |
| 6 | Isolated `0 → x → 0` SSTORE refund: same-frame revert returns the charge to the reservoir | [#11611](https://github.com/ethereum/EIPs/pull/11611) | [specs#2823](https://github.com/ethereum/execution-specs/pull/2823) |
| 7 | CREATE address-collision: regular gas burned is now counted in block regular gas | [#11611](https://github.com/ethereum/EIPs/pull/11611) | [specs#2823](https://github.com/ethereum/execution-specs/pull/2823) |
| 8 | Tx-level CREATE + same-tx `SELFDESTRUCT`: refund intrinsic `NEW_ACCOUNT × CPSB` | [#11606](https://github.com/ethereum/EIPs/pull/11606) | [specs#2828](https://github.com/ethereum/execution-specs/pull/2828) |

### Other bal-devnet-7 carry-overs

| Area | bal-devnet-6 | bal-devnet-7 / glamsterdam-devnet-4 |
|------|--------------|--------------|
| Reference block gas limit (for CPSB derivation) | 96M | **150M** — devnet `gas_limit` raised to match |
| Target state growth | 100 GiB/yr | **120 GiB/yr** |
| eth/70 (EIP-7975) | optional | **mandatory** |
| eth/71 (EIP-8159) | optional | **mandatory** |
| `STATE_BYTES_PER_AUTH_BASE` | 23 | 23 (unchanged) |

---

## Local testing

Kurtosis example:
```yaml title="kurtosis.yaml"
participants_matrix:
  el:
    - el_type: ethrex
      el_image: ethpandaops/ethrex:glamsterdam-devnet-4
    - el_type: nethermind
      el_image: ethpandaops/nethermind:glamsterdam-devnet-4
  cl:
    - cl_type: prysm
      cl_image: ethpandaops/prysm-beacon-chain:glamsterdam-devnet-4
    - cl_type: lodestar
      cl_image: ethpandaops/lodestar:glamsterdam-devnet-4
    - cl_type: lighthouse
      cl_image: ethpandaops/lighthouse:glamsterdam-devnet-4

network_params:
  gloas_fork_epoch: 1
  withdrawal_type: "0x01"
  validator_balance: 40000
  genesis_gaslimit: 150000000
  gas_limit: 150000000

additional_services:
  - dora
  - assertoor
  - spamoor
  - checkpointz
spamoor_params:
  image: ethpandaops/spamoor:master

assertoor_params:
  run_stability_check: false
  run_block_proposal_check: false
  tests:
    - { file: "https://raw.githubusercontent.com/ethpandaops/assertoor/refs/heads/master/playbooks/gloas-dev/builder-lifecycle.yaml" }

snooper_enabled: false
global_log_level: debug

port_publisher:
  additional_services:
    enabled: true

checkpointz_params:
  image: ethpandaops/checkpointz:gloas-latest

```

---


## Client BAL features

| EL Client   | Exec Par. | Batch IO (required) | State Par. |
|-------------|:---------:|:--------:|:----------:|
| Geth        | ✅        | ✅       | ✅         |
| Nethermind  | ✅        | ✅       | ✅         |
| Erigon      | ✅        | ❓       | ❓         |
| Besu        | ✅        | ✅       | ✅         |
| Reth        | ✅        | ✅       | ✅         |

Per-client BAL flag tables are unchanged from bal-devnet-6: https://notes.ethereum.org/@ethpandaops/bal-devnet-6#Feature-flags.

---

## Metrics

https://notes.ethereum.org/@ethpandaops/bal-otel

Previous devnet spec sheets for reference:
- CL: https://notes.ethereum.org/@ethpandaops/glamsterdam-devnet-2
- EL: https://notes.ethereum.org/@ethpandaops/bal-devnet-7
