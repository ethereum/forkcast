# bal-devnet-3 spec
:::info
:mega: bal-devnet-3 targets to launch 08 April 2026.
:::


:::info
❗ EL clients: please add flags to enable/disable BAL optimizations batch/parallel io and parallel execution.
:::

:::info
❗ EL clients: **EIP-8037** will be using a hardcoded value for the **cost per state byte of 1174**. This aligns with a block gas limit of 100M, the value being set for the devnet. The cost per state byte value of 1174 will be a treated as a fork constant for this devnet and not depend on the block gas limit. For the next devnet we will use the full EIP variant where the cpsb will depend on the block gas limit.
:::

## EIP List for bal-devnet-3

| EIP | Title |Status
|--------|-----|-------|
|[EIP-7708](https://eips.ethereum.org/EIPS/eip-7708) | ETH transfers emit a log | :up:
|[EIP-7778](https://eips.ethereum.org/EIPS/eip-7778) | Block Gas Accounting without Refunds |
|[EIP-7843](https://eips.ethereum.org/EIPS/eip-7843) | SLOTNUM opcode |
|[EIP-7928](https://eips.ethereum.org/EIPS/eip-7928) | Block-Level Access Lists | :up: 
|[EIP-7954](https://eips.ethereum.org/EIPS/eip-7954) | Increase Maximum Contract Size | :new: 
|[EIP-7975](https://eips.ethereum.org/EIPS/eip-7975) | eth/70 - partial block receipt lists | :new: / optional
|[EIP-8024](https://eips.ethereum.org/EIPS/eip-8024) | Backward compatible SWAPN, DUPN, EXCHANGE | :up: 
|[EIP-8037](https://eips.ethereum.org/EIPS/eip-8037) | State Creation Gas Cost Increase - static value 1174 :exclamation: | :new:
|[EIP-8159](https://eips.ethereum.org/EIPS/eip-8159) | eth/71 - Block Access List Exchange | :new: / optional


**Key:**
- :up: EIP has updated!
- :new: New EIP added.


### Implementation tracker EL

## Execution Layer Client Support
Here you go:

| EIP |               Geth | Besu | Reth | Nethermind | Erigon | Nimbus-EL | Ethrex |
|-----|              :----:|:----:|:----:|:----------:|:------:|:---------:|:------:|
| 7708 (ETH Logs)    | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7778 (Gas Refunds) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7843 (SLOTNUM)     | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7928 (BAL)         | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7954 (MContract)   | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7975 (eth/70)      | ✅ | :hammer: | ❌ | ✅ | ❌ | ❌ | ❌ |
| 8024 (SWAPN/DUPN)  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8037 (stateIncr)   | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8159 (eth/71)      | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |



### Implementation tracker CL
| Feature/EIP | Lodestar | Lighthouse | Prysm |
| ----------- | -------- | ---------- | ----- |
| **EIP-7928** | ✅ | ✅ | bal-devnet-1 |
| **EIP-7843** | ✅ | ✅ | ❌ |


### Test Releases

**Consensus Specs:** [`v1.6.1`](https://github.com/ethereum/consensus-specs/releases/tag/v1.6.1) :heavy_check_mark:  Same as [bal-devnet-2](https://notes.ethereum.org/@ethpandaops/bal-devnet-2)

**Execution Specs:** https://github.com/ethereum/execution-spec-tests/releases/tag/bal@v5.6.0 :new:


### Spec versions required & Open PRs
**EIP udpates included**

- [Update EIP-7928: cap max items in BAL](https://github.com/ethereum/EIPs/pull/11234) Merged :heavy_check_mark:
- [Update EIP-8024: Switch to branchless normalization and extend EXCHANGE](https://github.com/ethereum/EIPs/pull/11306) - Merged :heavy_check_mark: 
- [Update EIP-7708: Add ETH burn logs and improve spec consistency](https://github.com/ethereum/EIPs/pull/11311) - Merged :heavy_check_mark: 

**Consensus Specs**

Currently, No CL spec changes required.

CLs need to implement [EIP-7843 PR #731 engine_forkchoiceUpdatedV4](https://github.com/ethereum/execution-apis/pull/731)

**Execution Specs**

Update EIP-8037: clarify regular gas must be charged before state gas[#11421](https://github.com/ethereum/EIPs/pull/11421)
Update EIP-8037: clarify reservoir mechanics[#11328](https://github.com/ethereum/EIPs/pull/11328)
Update EIP-8037: Align with EIP-7928 Gas Validation Phases[#11414](https://github.com/ethereum/EIPs/pull/11414)

**Execution APIs**

[Add EIP-7928 Block-level Access Lists JSON RPC methods](https://github.com/ethereum/execution-apis/pull/726) Merged :heavy_check_mark: 
[eth_simulateV1: fix revert err code](https://github.com/ethereum/execution-apis/pull/748) Merged :heavy_check_mark: 
[add maxUseGas field to eth_simulateV1](https://github.com/ethereum/execution-apis/pull/746) Merged :heavy_check_mark: 


**Networking**


<!-- **devp2p**
- [EIP-7928 GetBlockAccessLists, BlockAccessLists p2p](https://github.com/ethereum/devp2p/pull/264) Open :exclamation: -->

**Other**

- [bal-devnet-2 STEEL Milestone tracker](https://github.com/ethereum/execution-specs/milestone/32) :heavy_check_mark:
- [EIP-7928 Issue#1938 Test vector metadata consideration](https://github.com/ethereum/execution-specs/issues/1938) Open :exclamation:


## Client BAL features

| EL Client   | Exec Par. | Batch IO (required) | State Par. |
|-------------|:---------:|:--------:|:----------:|
| Geth        | ✅        | ✅       | ✅         |
| Nethermind  | ✅        | ✅       | ✅         |
| Erigon      | ✅        | ❓       | ❓         |
| Besu        | ✅        | ✅       | ✅         |
| Reth        | ✅        | ✅       | ✅         |

These flags allow us to enable / disable devnet-2 features. Especially BAL related features.

## Feature flags

### Besu


| Option                                         | Default | Type    | Description                                                                                                            |
|------------------------------------------------|---------|---------|------------------------------------------------------------------------------------------------------------------------|
| `--Xbal-optimization-enabled`                  | `true`  | boolean | Allows disabling BAL-based optimizations.                                                                              |
| `--Xbal-perfect-parallelization-enabled`       | `true`  | boolean | Allows disabling BAL-based perfect parallelization even when BALs are present.                                         |
| `--Xbal-lenient-on-state-root-mismatch`        | `true`  | boolean | Log an error instead of throwing when the BAL-computed state root does not match the synchronously computed root.      |
| `--Xbal-trust-state-root`                      | `false` | boolean | Trust the BAL-computed state root without verification.                                                                |
| `--Xbal-log-bals-on-mismatch`                  | `false` | boolean | Log the constructed block’s BAL when they differ.                                                                      |
| `--Xbal-api-enabled`                           | `false` | Boolean | Enable `eth_getBlockAccessListByBlockNumber` and `eth_getBlockAccessListByBlockHash` methods and BALs in simulation.   |
| `--Xbal-state-root-timeout`                    | `1000`  | long    | Timeout in ms when waiting for the BAL-computed state root.                                                            |
| `--Xbal-processing-timeout`                    | `1000`  | long    | Timeout in ms when waiting for BAL transaction processing results.                                                     |
| `--Xbal-prefetch-reading-enabled`              | `false` | boolean | Enable prefetching of state data based on BAL read operations.                                                         |
| `--Xbal-prefetch-sorting-enabled`              | `true`  | boolean | Enable sorting optimization during BAL prefetch operations.                                                            |
### Reth



```rust
/// Whether to disable BAL (Block Access List, EIP-7928) based parallel execution.
/// When disabled, falls back to transaction-based prewarming even when a BAL is available.
    disable_bal_parallel_execution: bool,
/// Whether to disable BAL-driven parallel state root computation.
/// When disabled, the BAL hashed post state is not sent to the multiproof task for
/// early parallel state root computation.
    disable_bal_parallel_state_root: bool,

/// Whether to disable BAL (Block Access List) batched IO during prewarming.
/// When disabled, falls back to individual per-slot storage reads instead of
/// batched cursor reads via `storage_range`.
    disable_bal_batch_io: bool

Flags:
      --engine.disable-bal-parallel-execution
          Disable BAL (Block Access List, EIP-7928) based parallel execution. When set, falls back to transaction-based prewarming even when a BAL is available

      --engine.disable-bal-parallel-state-root
          Disable BAL-driven parallel state root computation. When set, the BAL hashed post state is not sent to the multiproof task for early parallel state root computation

      --engine.disable-bal-batch-io
          Disable BAL (Block Access List) batched IO during prewarming. When set, falls back to individual per-slot storage reads instead of batched cursor reads

```
### Nethermind

```
--Blocks.ParallelExecution=true 
--Blocks.ParallelExecutionBatchRead=true
```

### Geth

Possible values full, sequential, nobatchio. 

`--bal.executionmode=nobatchio`

### Erigon

```
--exec.batched-io  | true      | Turn on/off batched ahead of time db reads
--exec.state-cache | true      | Turn on/off local caching of db reads
--exec.workers     | num cpu/2 | Number of workers used for exec
--exec.serial      | false     | Force workers to be 1 
--exec.no-merge.   | false.    | Turn off background merging
--exec.no-prune.   | false.    | Turn off db removal
```

> --exec.no-merge=true merging has known issues during benchmark 

IGNORE_BAL (see https://github.com/erigontech/erigon/pull/19903)

---

## Local testing

Kurtosis example:

```yaml=
participants:
- cl_type: lighthouse
  cl_image: ethpandaops/lighthouse:bal-devnet-3
  el_type: geth
  el_image: ethpandaops/geth:bal-devnet-3
  el_extra_params:
  - --history.state=0
  - --gcmode=archive
  - --syncmode=full
  count: 1
  supernode: true
- cl_type: lighthouse
  cl_image: ethpandaops/lighthouse:bal-devnet-3
  el_type: besu
  el_image: ethpandaops/besu:bal-devnet-3
  supernode: true
  el_min_mem: 4096
  el_max_mem: 8192
  count: 1
- cl_type: lighthouse
  cl_image: ethpandaops/lighthouse:bal-devnet-3
  el_type: reth
  el_image: ethpandaops/reth:bal-devnet-3
  supernode: true
  count: 1
- cl_type: lodestar
  cl_image: ethpandaops/lodestar:bal-devnet-3
  el_type: nethermind
  el_image: ethpandaops/nethermind:bal-devnet-3
  supernode: true
  count: 1
- cl_type: lodestar
  cl_image: ethpandaops/lodestar:bal-devnet-3
  el_type: ethrex
  el_image: ethpandaops/ethrex:bal-devnet-3
  count: 1
ethereum_genesis_generator_params:
  image: ethpandaops/ethereum-genesis-generator:5.3.1
global_log_level: debug
network_params:
  preset: minimal
  seconds_per_slot: 6
  genesis_delay: 30
  fulu_fork_epoch: 0
  gloas_fork_epoch: 2
snooper_enabled: true
dora_params:
  image: ethpandaops/dora:eip7928-support
spamoor_params:
spamoor_params:
  image: ethpandaops/spamoor:qu0b-fix-batcher-funding-gas-config
  spammers:
    - scenario: evm-fuzz
      config: {throughput: 50, payload_seed: "0x0200", funding_gas_limit: 200000}
    - scenario: eoatx
      config: {throughput: 50, gas_limit: 200000, funding_gas_limit: 200000}
    - scenario: deploytx
      config: {throughput: 10, bytecodes: "0x6000", gas_limit: 10000000, funding_gas_limit: 200000}
    - scenario: storagerefundtx
      config: {throughput: 20, slots_per_call: 500, funding_gas_limit: 200000}
    - scenario: setcodetx
      config: {throughput: 20, funding_gas_limit: 200000}
additional_services: [dora, spamoor]
port_publisher:
  additional_services:
    enabled: true
    public_port_start: 64400

```



## Metrics

https://notes.ethereum.org/@ethpandaops/bal-otel

Previous devnet spec sheet for reference: https://notes.ethereum.org/@ethpandaops/bal-devnet-2