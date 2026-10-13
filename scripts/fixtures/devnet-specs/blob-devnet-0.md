# blob-devnet-0

:::info
:mega: blob-devnet-0 launched on 21st of Jan 2026.
:::

:::success
:mega: Weekly [discussion](https://hackmd.io/BcJbP0D2TYue15rho9bvfA)
:::

## EIP List for blob-devnet-0

[EIP-8136 - Gossipsub’s Partial Messages Extension and Cell Level dissemination](https://eips.ethereum.org/EIPS/eip-8136) :new:

**Key:**
- :up:, EIP has updated!
- :new:, new EIP added.

### Implementation tracker CL
| Client     | Branch/PR    | Status |
|------------|--------------|--------|
| Lighthouse | [ethpandaops/lighthouse:dknopik-partial-columns](https://github.com/sigp/lighthouse/pull/8314) | :hammer: |
| Prysm      | [ethpandaops/prysm-beacon-chain:prysm-partial-cells-current](https://github.com/OffchainLabs/prysm/commits/prysm/partial-cells-current/) | :hammer: |
| Teku       | :question: |:question: |
| Grandine   | :question: |:question: |
| Nimbus     | :question: |:question: |
| Lodestar   | :question: |:question: |

### Implementation tracker EL
On the execution layer side the only feature is needed is the support of engineGetBlobv3

| Client    | Branch/PR | Status |
|-----------|-----------|--------|
| Geth      | [ethpandaops/geth:master](https://github.com/ethereum/go-ethereum/pull/33404) | :heavy_check_mark: |
| Nethermind| [ethpandaops/nethermind:master](https://github.com/NethermindEth/nethermind/pull/9942) | :heavy_check_mark: |
| Erigon    | [ethpandaops/erigon:main](https://github.com/erigontech/erigon/pull/18512) | :heavy_check_mark: |
| Besu      | [ethpandaops/besu:main](https://github.com/hyperledger/besu/pull/9582) | :heavy_check_mark: |
| Reth      | [ethpandaops/reth:main](https://github.com/paradigmxyz/reth/pull/20451) | :heavy_check_mark: |
| NimbusEl  | [ethpandaops/nimbus-eth1:master](https://github.com/status-im/nimbus-eth1/pull/3893) | :heavy_check_mark: |
| Ethrex    | [ethpandaops/ethrex:main](https://github.com/lambdaclass/ethrex/pull/5648) | :heavy_check_mark: |



### Test Releases

**Consensus Specs:** [`v1.7.0-alpha.1`](https://github.com/ethereum/consensus-specs/releases/tag/v1.7.0-alpha.1) :heavy_check_mark:

**Execution Specs:** N/A


### Spec changes

**Beacon metrics**:
[PR-21 - Add metrics useful for Partial Data Columns](https://github.com/ethereum/beacon-metrics/pull/21) Merged :heavy_check_mark: 

**Consensus Spec**:
[PR-4558 - Add Cell Dissemination via Partial Message Specification](https://github.com/ethereum/consensus-specs/pull/4558) Open :exclamation: 

**Execution specs**:
[PR-2085 - feat(src): add getBlobsV3 support and test case for it](https://github.com/ethereum/execution-specs/pull/2085) Merged :heavy_check_mark: 

**Engine API Spec**:
[PR-719 - add engine_getBlobsV3 method](https://github.com/ethereum/execution-apis/pull/719) Merged :heavy_check_mark: 

**LibP2P Spec**:
[PR-662 - partialmsgs: Add explicit eager push method](https://github.com/libp2p/go-libp2p-pubsub/pull/662) Merged :heavy_check_mark: 
[PR-663 - partialmsgs: Implement Partial Message gossip](https://github.com/libp2p/go-libp2p-pubsub/pull/663) Merged :heavy_check_mark: 
[PR-685 - Gossipsub: Partial Message Extension ](https://github.com/libp2p/specs/pull/685) Merged :heavy_check_mark: 



## Kurtosis config:
```yaml
participants_matrix:
  el:
    - el_type: geth
      el_image: ethpandaops/geth:master
    - el_type: nethermind
      el_image: ethpandaops/nethermind:master
    - el_type: reth
      el_image: ethpandaops/reth:main
    - el_type: erigon
      el_image: ethpandaops/erigon:main


  cl:
    - cl_type: lighthouse
      cl_image: ethpandaops/lighthouse:dknopik-partial-columns
      validator_count: 16
      cl_extra_params:
      - --enable-partial-columns
    - cl_type: prysm
      cl_image: ethpandaops/prysm-beacon-chain:prysm-partial-cells-current
      validator_count: 16
      cl_extra_params:
      - --partial-data-columns
    - cl_type: teku
      cl_image: ethpandaops/teku:master

network_params:
  prefunded_accounts: '{"0xb9e79d19f651a941757b35830232e7efc77e1c79": {"balance": "100000ETH"}}'
snooper_enabled: false
additional_services:
  - dora
  - spamoor
global_log_level: debug
spamoor_params:
  spammers:
    - scenario: blob-combined
      name: blob spammer for mev builder
      config:
        throughput: 6
        sidecars: 1
        client_group: "mevbuilder"
    - scenario: blob-combined
      name: blob spammer
      config:
        throughput: 6
        sidecars: 1
mev_type: flashbots
mev_params:
  mev_builder_subsidy: 1
  mev_builder_cl_image: ethpandaops/lighthouse:dknopik-partial-columns
```