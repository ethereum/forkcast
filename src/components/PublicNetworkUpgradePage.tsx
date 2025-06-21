import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import eipsData from '../data/eips.json';

interface ForkRelationship {
  forkName: string;
  status: string;
  notes?: string;
}

interface EIP {
  id: number;
  title: string;
  status: string;
  description: string;
  author: string;
  type: string;
  category: string;
  createdDate: string;
  discussionLink: string;
  testCasesAvailable: boolean;
  clientImplementations: string[];
  resources: string[];
  forkRelationships: ForkRelationship[];
}

// Public-facing explanations for EIPs
interface PublicEIPData {
  [eipId: number]: {
    laymanTitle: string;
    laymanDescription: string;
    inclusionStage: 'Proposed for Inclusion' | 'Considered for Inclusion' | 'Scheduled for Inclusion' | 'Declined for Inclusion' | 'Included';
    northStars: ('Scale L1' | 'Scale L2' | 'Improve UX')[];
    northStarAlignment: {
      scaleL1?: { impact: 'None' | 'Low' | 'Medium' | 'High', description: string };
      scaleL2?: { impact: 'None' | 'Low' | 'Medium' | 'High', description: string };
      improveUX?: { impact: 'None' | 'Low' | 'Medium' | 'High', description: string };
    };
    stakeholderImpacts: {
      endUsers: { impact: 'None' | 'Low' | 'Medium' | 'High', description: string };
      appDevs: { impact: 'None' | 'Low' | 'Medium' | 'High', description: string };
      walletDevs: { impact: 'None' | 'Low' | 'Medium' | 'High', description: string };
      toolingInfra: { impact: 'None' | 'Low' | 'Medium' | 'High', description: string };
      layer2s: { impact: 'None' | 'Low' | 'Medium' | 'High', description: string };
      stakersNodes: { impact: 'None' | 'Low' | 'Medium' | 'High', description: string };
      clClients: { impact: 'None' | 'Low' | 'Medium' | 'High', description: string };
      elClients: { impact: 'None' | 'Low' | 'Medium' | 'High', description: string };
    };
    benefits: string[];
    timeline?: string;
    isHeadliner?: boolean;
  };
}

interface PublicNetworkUpgradePageProps {
  forkName: string;
  displayName: string;
  description: string;
  activationDate?: string;
  status: string;
}

const PublicNetworkUpgradePage: React.FC<PublicNetworkUpgradePageProps> = ({
  forkName,
  displayName,
  description,
  activationDate,
  status
}) => {
  const [eips, setEips] = useState<EIP[]>([]);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const location = useLocation();

  // Sample public explanations - in a real app this would come from a CMS or API
  const publicData: PublicEIPData = {
    7594: {
      laymanTitle: "PeerDAS - Peer Data Availability Sampling",
      laymanDescription: "PeerDAS enables Ethereum nodes to specialize in storing different pieces of data while still verifying everything is available. This foundational change dramatically increases data capacity for Layer 2 networks while maintaining security.",
      inclusionStage: 'Scheduled for Inclusion',
      northStars: ['Scale L1', 'Scale L2'],
      northStarAlignment: {
        scaleL1: { impact: 'High', description: 'Essential foundation for scaling Ethereum\'s data capacity. Builds the infrastructure needed for full Danksharding, potentially increasing data throughput from ~375KB/s to several MB/s in future upgrades.' },
        scaleL2: { impact: 'High', description: 'Directly enables Layer 2 scaling by allowing nodes to efficiently handle much more data without overwhelming individual participants.' },
        improveUX: { impact: 'Low', description: 'Infrastructure improvement that indirectly benefits users through significantly cheaper Layer 2 transactions and higher throughput applications.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Medium', description: 'Benefits through much cheaper Layer 2 transactions and access to applications that need more data throughput.' },
        appDevs: { impact: 'Medium', description: 'Enables building applications with higher data requirements. Layer 2 developers benefit from reduced costs and higher capacity limits.' },
        walletDevs: { impact: 'Low', description: 'Minimal direct impact. Users benefit indirectly through better Layer 2 transaction reliability and lower costs.' },
        toolingInfra: { impact: 'High', description: 'Major updates needed for block explorers, indexers, and data availability APIs to handle the new sampling system and proof formats.' },
        layer2s: { impact: 'High', description: 'Game-changing for Layer 2 economics - dramatically reduces costs for posting transaction data and enables much higher throughput rollups.' },
        stakersNodes: { impact: 'High', description: 'Must implement the new specialized data storage and sampling system. Changes from downloading everything to participating in a coordinated verification network.' },
        clClients: { impact: 'High', description: 'Major implementation work required for the new data distribution system, sampling protocols, and coordination between nodes. This is a core infrastructure change.' },
        elClients: { impact: 'Medium', description: 'Need to update how blob transactions are handled and verified, including new proof formats and validation methods.' }
      },
      benefits: [
        "Dramatically reduces Layer 2 transaction costs",
        "Enables scaling to 128+ blobs per block over time",
        "Nodes only store a fraction of data while maintaining security",
        "Foundation for competing with high-speed blockchains",
        "Paves the way for full Danksharding"
      ],
      isHeadliner: true
    },
    7642: {
      laymanTitle: "eth/69 - History expiry and simpler receipts",
      laymanDescription: "This networking upgrade removes outdated data from node synchronization, saving approximately 530GB of bandwidth per sync. It also prepares for removing old blockchain history from new nodes starting in May 2025.",
      inclusionStage: 'Scheduled for Inclusion',
      northStars: ['Scale L1'],
      northStarAlignment: {
        scaleL1: { impact: 'Medium', description: 'Significant bandwidth reduction (530GB+ per sync) and improved networking efficiency through bloom filter removal and better historical data coordination.' },
        scaleL2: { impact: 'Low', description: 'More efficient networking foundation benefits Layer 2 operations indirectly.' },
        improveUX: { impact: 'Low', description: 'Faster node synchronization due to reduced bandwidth requirements and better peer discovery for historical data.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Low', description: 'Indirect benefits through faster node sync times and reduced bandwidth usage during initial sync.' },
        appDevs: { impact: 'None', description: 'No impact on smart contract development or execution environment.' },
        walletDevs: { impact: 'Low', description: 'Faster initial sync times when setting up new nodes, better reliability for historical data requests.' },
        toolingInfra: { impact: 'Medium', description: 'Historical data APIs and indexers need updates for new history serving windows and modified networking protocols.' },
        layer2s: { impact: 'Low', description: 'More efficient networking infrastructure provides a better foundation for Layer 2 operations.' },
        stakersNodes: { impact: 'Medium', description: 'Significant bandwidth savings during sync operations. Nodes serving historical data gain better tools for announcing their capabilities.' },
        clClients: { impact: 'Low', description: 'Minimal impact as this primarily affects execution layer networking protocols.' },
        elClients: { impact: 'High', description: 'Major implementation work required for new eth/69 protocol including history serving windows, bloom filter removal from receipts, and BlockRangeUpdate messaging.' }
      },
      benefits: [
        "Saves ~530GB of bandwidth per node sync",
        "Faster setup for new Ethereum nodes",
        "Reduces storage requirements for operators",
        "Prepares for streamlined history management"
      ]
    },
    7823: {
      laymanTitle: "Set upper bounds for MODEXP",
      laymanDescription: "This introduces a 8192-bit (1024 byte) limit on each input to the MODEXP cryptographic precompile. MODEXP has been a source of consensus bugs due to unbounded inputs. By setting practical limits that cover all real-world use cases (like RSA verification), this reduces the testing surface area and paves the way for future replacement with more efficient EVM code.",
      inclusionStage: 'Scheduled for Inclusion',
      northStars: ['Scale L1'],
      northStarAlignment: {
        scaleL1: { impact: 'Low', description: 'Improves network reliability by preventing consensus bugs and reducing testing complexity for a critical precompile.' },
        scaleL2: { impact: 'None', description: 'No direct scaling benefits for Layer 2 networks.' },
        improveUX: { impact: 'Low', description: 'More predictable execution behavior for cryptographic operations, enabling future optimizations.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'None', description: 'No impact - analysis shows no historical transactions would be affected by these limits.' },
        appDevs: { impact: 'Low', description: 'Applications using very large cryptographic operations (>8192 bits) would need to restructure, but no known use cases exist.' },
        walletDevs: { impact: 'None', description: 'No user-facing impact as limits exceed all practical cryptographic use cases.' },
        toolingInfra: { impact: 'Low', description: 'Gas estimation and fee calculation tools need updates for the new ModExp pricing formula.' },
        layer2s: { impact: 'Low', description: 'Provides more predictable gas costs for cryptographic operations in L2 smart contracts.' },
        stakersNodes: { impact: 'Low', description: 'Reduced risk of consensus bugs and more predictable resource usage for MODEXP operations.' },
        clClients: { impact: 'None', description: 'No changes required for consensus layer implementations.' },
        elClients: { impact: 'Medium', description: 'Must implement bounds checking for MODEXP inputs and handle new error conditions for oversized inputs.' }
      },
      benefits: [
        "Eliminates underpriced cryptographic operations",
        "Prevents potential DoS attacks",
        "Better compensation for computational work",
        "More consistent gas pricing"
      ]
    },
    7825: {
      laymanTitle: "Transaction Gas Limit Cap",
      laymanDescription: "This introduces a 30 million gas cap for individual transactions, preventing any single transaction from consuming most of a block. The goal is to ensure fairer access to block space and improve network stability.",
      inclusionStage: 'Scheduled for Inclusion',
      northStars: ['Scale L1', 'Improve UX'],
      northStarAlignment: {
        scaleL1: { impact: 'Medium', description: 'Improves network stability and resilience against DoS attacks by preventing individual transactions from consuming excessive block space, enabling more predictable block validation times.' },
        scaleL2: { impact: 'Low', description: 'More predictable block space availability could benefit Layer 2 settlement transactions, but may limit future L2 bundling strategies.' },
        improveUX: { impact: 'Medium', description: 'More predictable transaction inclusion and fairer access to block space, though may require some large applications to restructure their operations.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Low', description: 'Most users unaffected as typical transactions use far less than 30M gas. Edge cases with very complex operations may need to restructure.' },
        appDevs: { impact: 'High', description: 'Applications with very large transactions (complex DeFi, large contract deployments) may need to split operations or redesign architecture to stay under the cap.' },
        walletDevs: { impact: 'Low', description: 'Need to enforce the gas cap in transaction creation, but most wallet operations are well below the limit.' },
        toolingInfra: { impact: 'Medium', description: 'Gas estimation tools, transaction builders, and deployment scripts need updates to enforce the 30M gas cap.' },
        layer2s: { impact: 'Medium', description: 'Could impact future L2 bundling strategies and settlement transaction designs. May conflict with efficient batch processing approaches.' },
        stakersNodes: { impact: 'Low', description: 'More predictable block processing times and reduced risk of validation bottlenecks from extremely large transactions.' },
        clClients: { impact: 'None', description: 'No direct impact on consensus layer operations as this affects execution layer transaction validation.' },
        elClients: { impact: 'Medium', description: 'Need to implement transaction pool validation to reject transactions exceeding the gas cap and block validation to reject blocks containing invalid transactions.' }
      },
      benefits: [
        "Prevents single transactions from hogging block space",
        "Ensures fairer access for all users",
        "Reduces network instability risks",
        "Enables safer block capacity increases"
      ]
    },
    7883: {
      laymanTitle: "ModExp Gas Cost Increase",
      laymanDescription: "This increases the gas cost of the ModExp cryptographic precompile to address underpriced operations. It raises the minimum cost from 200 to 500 gas and doubles costs for large inputs over 32 bytes.",
      inclusionStage: 'Scheduled for Inclusion',
      northStars: ['Scale L1'],
      northStarAlignment: {
        scaleL1: { impact: 'Low', description: 'Improves network economic sustainability by ensuring cryptographic precompiles are properly priced, preventing potential DoS vectors from underpriced operations.' },
        scaleL2: { impact: 'None', description: 'No direct impact on Layer 2 scaling capabilities.' },
        improveUX: { impact: 'Low', description: 'More accurate pricing for cryptographic operations, though may increase costs for some RSA and modular exponentiation use cases.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Low', description: 'Most users unaffected. Applications using ModExp with large inputs (>32 bytes) will see increased gas costs.' },
        appDevs: { impact: 'Medium', description: 'Applications using RSA verification, large modular exponentiation, or cryptographic protocols with big numbers may need to optimize or budget for higher costs.' },
        walletDevs: { impact: 'None', description: 'No impact as wallets typically don\'t use ModExp precompile directly.' },
        toolingInfra: { impact: 'Low', description: 'Gas estimation and fee calculation tools need updates for the new ModExp pricing formula.' },
        layer2s: { impact: 'Low', description: 'L2s using ModExp precompile for cryptographic operations will see increased costs for large input operations.' },
        stakersNodes: { impact: 'Low', description: 'Better compensation alignment for computational work, reduced risk of DoS attacks through underpriced operations.' },
        clClients: { impact: 'None', description: 'No direct impact on consensus layer operations as this affects execution layer precompile pricing.' },
        elClients: { impact: 'Medium', description: 'Need to implement the updated ModExp pricing formula with new minimum costs and scaling factors for large inputs.' }
      },
      benefits: [
        "Fixes underpriced ModExp operations that cost less than simpler precompiles",
        "Ensures ModExp pricing reflects actual computational cost", 
        "Prevents potential DoS from cheap complex operations",
        "Aligns gas costs with performance benchmarks"
      ]
    },
    7892: {
      laymanTitle: "Blob Parameter Only Hardforks",
      laymanDescription: "This creates a new lightweight upgrade system specifically for adjusting blob storage parameters. Instead of waiting for major upgrades, Ethereum can make smaller, more frequent adjustments to blob capacity as Layer 2 demand grows.",
      inclusionStage: 'Scheduled for Inclusion',
      northStars: ['Scale L2', 'Improve UX'],
      northStarAlignment: {
        scaleL1: { impact: 'Medium', description: 'Enables more agile scaling of blob capacity as foundational data availability infrastructure, supporting continuous growth rather than large infrequent jumps.' },
        scaleL2: { impact: 'High', description: 'Directly addresses the rapid growth in L2 data availability demand by enabling more frequent, incremental blob capacity increases to prevent sustained saturation.' },
        improveUX: { impact: 'Medium', description: 'Provides predictable scaling framework that gives L2 builders confidence to commit to Ethereum over alternative DA solutions.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Low', description: 'Indirect benefits through more responsive blob capacity scaling leading to lower and more stable L2 transaction costs.' },
        appDevs: { impact: 'Medium', description: 'More predictable data availability scaling gives developers confidence to build applications requiring consistent blob capacity growth.' },
        walletDevs: { impact: 'Low', description: 'Minimal direct impact. Benefits indirectly through improved L2 scaling economics and more stable transaction costs.' },
        toolingInfra: { impact: 'High', description: 'Major updates needed for upgrade tracking, blob parameter monitoring, and tooling to handle the new BPO fork mechanism.' },
        layer2s: { impact: 'High', description: 'Critical for L2 growth strategy - enables continuous scaling of data availability capacity to match rapidly growing demand without waiting for major hard forks.' },
        stakersNodes: { impact: 'Medium', description: 'Need to handle more frequent but lighter-weight network upgrades. Simplified upgrade process reduces operational overhead compared to full hard forks.' },
        clClients: { impact: 'High', description: 'Significant changes needed for blob schedule management, modified compute_fork_digest implementation, and P2P networking updates including ENR extensions.' },
        elClients: { impact: 'High', description: 'Major implementation work required for blob schedule configuration management, activation timestamp handling, and coordination with consensus layer blob parameter changes.' }
      },
      benefits: [
        "Faster response to Layer 2 data demand growth",
        "Lighter coordination than full network upgrades",
        "Predictable scaling roadmap for builders",
        "Safer capacity increases through smaller steps"
      ]
    },
    7918: {
      laymanTitle: "Blob base fee bounded by execution cost",
      laymanDescription: "This addresses blob fee market problems by introducing a reserve price tied to execution costs. When Layer 2 execution costs dominate blob costs, this prevents the blob fee market from becoming ineffective at 1 wei.",
      inclusionStage: 'Scheduled for Inclusion',
      northStars: ['Scale L2'],
      northStarAlignment: {
        scaleL1: { impact: 'Low', description: 'Improves economic sustainability of blob operations and prevents potential inefficiencies in the fee market mechanism.' },
        scaleL2: { impact: 'High', description: 'Critical for L2 economics - ensures sustainable blob pricing that reflects true costs and maintains effective price discovery as L2 usage scales.' },
        improveUX: { impact: 'Medium', description: 'Prevents dramatic fee spikes and provides more stable, predictable blob pricing for Layer 2 users by maintaining market elasticity.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Medium', description: 'More stable and predictable Layer 2 transaction costs, avoiding dramatic fee spikes when blob market becomes inelastic.' },
        appDevs: { impact: 'Low', description: 'More predictable blob cost modeling for applications, especially those with consistent data posting patterns.' },
        walletDevs: { impact: 'Low', description: 'More predictable fee estimation for Layer 2 transactions due to improved blob pricing stability.' },
        toolingInfra: { impact: 'Medium', description: 'Blob fee estimation tools and Layer 2 cost analysis dashboards need updates for the new reserve price mechanism.' },
        layer2s: { impact: 'High', description: 'Fundamental improvement to blob economics - prevents scenarios where blob fees become insignificant relative to execution costs, ensuring healthy fee market dynamics.' },
        stakersNodes: { impact: 'Medium', description: 'Ensures fair compensation for KZG proof verification compute costs through minimum blob pricing tied to execution base fee.' },
        clClients: { impact: 'Low', description: 'Minimal impact as this primarily affects execution layer blob fee calculation mechanisms.' },
        elClients: { impact: 'Medium', description: 'Need to implement modified calc_excess_blob_gas() function with new reserve price logic and BLOB_BASE_COST parameter.' }
      },
      benefits: [
        "Prevents blob fee market collapse",
        "Maintains effective price discovery",
        "Ensures fair compensation for node work",
        "Reduces dramatic fee spikes"
      ]
    },
    7935: {
      laymanTitle: "Set default gas limit to XX0M",
      laymanDescription: "This proposes increasing the gas limit from 36M to a higher value (specific amount TBD) to scale L1 execution capacity. The change requires extensive testing to ensure network stability at higher computational loads.",
      inclusionStage: 'Scheduled for Inclusion',
      northStars: ['Scale L1', 'Improve UX'],
      northStarAlignment: {
        scaleL1: { impact: 'High', description: 'Directly increases overall network throughput by allowing more computation per block, the most straightforward way to scale L1 execution capacity.' },
        scaleL2: { impact: 'Low', description: 'More block space available for Layer 2 settlement transactions, though L2s primarily benefit from blob scaling.' },
        improveUX: { impact: 'High', description: 'Enables more complex smart contracts, reduces transaction queuing during high demand, and improves confirmation times.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Medium', description: 'Benefits from higher throughput and faster transaction processing, but potential risks if inadequately tested or if RPC infrastructure can\'t keep up.' },
        appDevs: { impact: 'High', description: 'Can build more sophisticated applications without hitting gas limits, but need to be aware that the specific limit value is still TBD.' },
        walletDevs: { impact: 'Medium', description: 'Better user experience with faster confirmations, but RPC node performance impacts could affect wallet reliability.' },
        toolingInfra: { impact: 'High', description: 'RPC providers, indexers, and monitoring tools need significant updates to handle larger blocks and higher computational loads.' },
        layer2s: { impact: 'Low', description: 'More block space available for settlement transactions, but coordination needed with EIP-7825\'s 30M transaction cap.' },
        stakersNodes: { impact: 'High', description: 'Need significantly more computational power to process larger blocks. Validator hardware requirements may increase substantially.' },
        clClients: { impact: 'Medium', description: 'Must handle larger execution payloads and ensure consensus layer can propagate larger blocks within gossip limits.' },
        elClients: { impact: 'High', description: 'Major testing and bug-fixing effort required to handle larger blocks safely. Must update default gas limit configurations and ensure stability at higher computational loads.' }
      },
      benefits: [
        "Directly increases mainnet throughput",
        "Enables more complex smart contracts",
        "Reduces transaction queuing during high demand",
        "Improves confirmation times"
      ]
    },
    5920: {
      laymanTitle: "PAY opcode",
      laymanDescription: "This introduces a new PAY opcode that transfers ETH without executing recipient code, solving critical security issues with current transfer methods. It prevents reentrancy attacks and eliminates DoS vectors from malicious recipient contracts.",
      inclusionStage: 'Declined for Inclusion',
      northStars: ['Improve UX', 'Scale L1'],
      northStarAlignment: {
        scaleL1: { impact: 'Low', description: 'Minor gas efficiency improvements for ETH transfers by avoiding unnecessary code execution and removing security overhead.' },
        scaleL2: { impact: 'Low', description: 'More efficient ETH transfers in Layer 2 smart contracts and protocols.' },
        improveUX: { impact: 'Medium', description: 'Significantly improves smart contract security by eliminating reentrancy vectors and DoS attacks from ETH transfers, enabling safer application development.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Low', description: 'Indirect benefits through safer smart contract interactions and potentially lower gas costs for ETH transfers.' },
        appDevs: { impact: 'High', description: 'Major security improvement - eliminates reentrancy attack vectors from ETH transfers and enables new safe transfer patterns, but need to understand bypass of fallback functions.' },
        walletDevs: { impact: 'Medium', description: 'Can implement more efficient withdrawal and transfer mechanisms, especially for smart contract wallets avoiding reentrancy concerns.' },
        toolingInfra: { impact: 'Medium', description: 'Transaction analysis tools, debuggers, and smart contract libraries need updates to support the new PAY opcode.' },
        layer2s: { impact: 'Low', description: 'More efficient and secure ETH handling in Layer 2 smart contracts and bridge protocols.' },
        stakersNodes: { impact: 'Low', description: 'Slightly more efficient transaction processing due to reduced code execution for simple ETH transfers.' },
        clClients: { impact: 'None', description: 'No direct impact on consensus layer operations as this affects execution layer opcodes.' },
        elClients: { impact: 'Medium', description: 'Need to implement new PAY opcode (0xfc) with proper gas accounting using EIP-2929 warm/cold access patterns and new account creation costs.' }
      },
      benefits: [
        "Eliminates reentrancy attacks from ETH transfers",
        "Prevents malicious contracts from blocking payments",
        "Reduces gas costs for simple transfers",
        "Essential safety for advanced account types"
      ]
    },
    7907: {
      laymanTitle: "Meter Contract Code Size And Increase Limit",
      laymanDescription: "This increases the contract code size limit from 24KB to 256KB and introduces gas metering for larger contracts. The change eliminates the need for complex architectural workarounds and enables more sophisticated single-contract applications.",
      inclusionStage: 'Considered for Inclusion',
      northStars: ['Improve UX', 'Scale L1'],
      northStarAlignment: {
        scaleL1: { impact: 'Low', description: 'Better resource management and gas metering for large contracts while maintaining network efficiency and preventing DoS attacks.' },
        scaleL2: { impact: 'Low', description: 'Enables deployment of more sophisticated Layer 2 infrastructure contracts without size constraints.' },
        improveUX: { impact: 'High', description: 'Major developer experience improvement - eliminates need for complex architectural patterns like Diamond Standard, reduces deployment complexity, and enables single-contract solutions.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Low', description: 'Indirect benefits through access to more sophisticated single-contract applications and potentially lower gas costs from reduced cross-contract calls.' },
        appDevs: { impact: 'High', description: 'Eliminates major architectural constraints - can build larger, more complex contracts without splitting logic across multiple contracts or using proxy patterns.' },
        walletDevs: { impact: 'Low', description: 'Can interact with more sophisticated single-contract applications, but need to handle higher gas costs for large contract interactions.' },
        toolingInfra: { impact: 'Medium', description: 'Contract verification tools, static analysis, and deployment infrastructure need updates to handle larger contracts and new gas metering.' },
        layer2s: { impact: 'Low', description: 'Can deploy larger, more sophisticated infrastructure contracts without hitting size limits.' },
        stakersNodes: { impact: 'Medium', description: 'Need updated client implementations with proper gas metering and efficient codesize indexing. Larger contracts may increase storage and processing requirements.' },
        clClients: { impact: 'None', description: 'No direct impact on consensus layer operations as this affects execution layer contract deployment and metering.' },
        elClients: { impact: 'Medium', description: 'Need to implement new gas metering for code-loading operations, warm/cold code access tracking, and efficient codesize indexing to avoid DoS attacks from large contract loads.' }
      },
      benefits: [
        "Enables much larger smart contracts (10x size increase)",
        "Eliminates complex multi-contract workarounds",
        "Reduces gas costs from cross-contract calls",
        "Makes development more accessible"
      ]
    },
    4762: {
      laymanTitle: "Statelessness gas cost changes",
      laymanDescription: "This restructures how gas costs work to prepare for stateless clients - nodes that can validate blocks without storing the entire blockchain state. The changes ensure gas costs accurately reflect the new computational model.",
      inclusionStage: 'Considered for Inclusion',
      northStars: ['Scale L1'],
      northStarAlignment: {
        scaleL1: { impact: 'High', description: 'Essential foundation for stateless clients, which enable massive improvements in node syncing speed and storage requirements. Enables nodes to validate without storing full state.' },
        scaleL2: { impact: 'None', description: 'No direct impact on Layer 2 scaling capabilities.' },
        improveUX: { impact: 'Medium', description: 'Enables much faster node syncing and reduces hardware requirements for running Ethereum nodes, improving decentralization.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Low', description: 'Indirect benefits through improved network decentralization and faster node syncing, but gas cost changes may affect some transaction patterns.' },
        appDevs: { impact: 'Medium', description: 'Some operations may have different gas costs, requiring optimization of smart contracts for the new stateless execution model.' },
        walletDevs: { impact: 'Low', description: 'Need to update gas estimation for transactions affected by the new cost model, but most operations remain similar.' },
        toolingInfra: { impact: 'High', description: 'Major updates needed for gas estimation, transaction simulation, and stateless proof generation. Block explorers need stateless verification capabilities.' },
        layer2s: { impact: 'Medium', description: 'May need to adjust for new gas costs in settlement transactions and state access patterns.' },
        stakersNodes: { impact: 'High', description: 'Can run much lighter nodes using stateless validation, dramatically reducing storage and syncing requirements while maintaining security.' },
        clClients: { impact: 'Low', description: 'Minimal impact as this primarily affects execution layer gas metering and state access patterns.' },
        elClients: { impact: 'High', description: 'Major implementation work required for new gas metering model, stateless execution environment, and witness data handling.' }
      },
      benefits: [
        "Enables stateless client operation with dramatically faster sync",
        "Reduces storage requirements for node operators",
        "Improves network decentralization through lower barriers",
        "Foundation for Verkle tree state transition"
      ]
    },
    6800: {
      laymanTitle: "Ethereum state using a unified verkle tree",
      laymanDescription: "This proposes transitioning Ethereum's entire state system from Merkle Patricia tries to Verkle trees. This foundational change would enable stateless clients, dramatically faster syncing, and better scalability while maintaining security. However, it's competing with other major proposals for Glamsterdam.",
      inclusionStage: 'Considered for Inclusion',
      northStars: ['Scale L1', 'Improve UX'],
      northStarAlignment: {
        scaleL1: { impact: 'High', description: 'Revolutionary improvement to state management enabling stateless clients, faster state access, and much more efficient proof sizes. This is foundational infrastructure for long-term scaling.' },
        scaleL2: { impact: 'Medium', description: 'More efficient state proofs benefit Layer 2 state commitments and cross-chain verification mechanisms.' },
        improveUX: { impact: 'High', description: 'Enables instant node syncing through stateless operation, dramatically reducing barriers to running Ethereum infrastructure and improving decentralization.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'High', description: 'Revolutionary improvement in node syncing speed (from hours/days to minutes), better network decentralization, and more reliable access to Ethereum services.' },
        appDevs: { impact: 'Medium', description: 'More efficient state access patterns and improved proof verification, though most smart contract logic remains unchanged.' },
        walletDevs: { impact: 'Medium', description: 'Can implement much faster light clients and improve wallet syncing speed through stateless verification capabilities.' },
        toolingInfra: { impact: 'High', description: 'Complete overhaul needed for state management, proof generation, indexing systems, and block explorers to handle Verkle tree proofs.' },
        layer2s: { impact: 'Medium', description: 'More efficient state root verification and improved cross-chain proof mechanisms using Verkle tree cryptography.' },
        stakersNodes: { impact: 'High', description: 'Can operate with dramatically reduced storage requirements and near-instant syncing through stateless validation, lowering barriers to participation.' },
        clClients: { impact: 'Low', description: 'Minimal direct impact as this primarily affects execution layer state management and proof structures.' },
        elClients: { impact: 'High', description: 'Complete state system rewrite required including Verkle tree implementation, state migration logic, and new proof generation/verification systems.' }
      },
      benefits: [
        "Enables instant node syncing through stateless operation",
        "Dramatically reduces storage requirements for validators",
        "Improves network decentralization through lower barriers",
        "More efficient cryptographic proofs (smaller size)",
        "Foundation for future scalability improvements"
      ],
      isHeadliner: false
    },
    6873: {
      laymanTitle: "Preimage retention",
      laymanDescription: "This ensures that the data needed to reconstruct Verkle tree proofs is properly preserved during the transition. It's a crucial technical requirement that maintains data availability while migrating to the new tree structure.",
      inclusionStage: 'Considered for Inclusion',
      northStars: ['Scale L1'],
      northStarAlignment: {
        scaleL1: { impact: 'Medium', description: 'Essential infrastructure component for Verkle tree transition, ensuring data integrity and availability during the state system migration.' },
        scaleL2: { impact: 'None', description: 'No direct impact on Layer 2 scaling capabilities.' },
        improveUX: { impact: 'Low', description: 'Invisible infrastructure improvement that ensures reliable access to historical state data during transition.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'None', description: 'No direct user-facing impact - this is purely infrastructure maintenance during the Verkle transition.' },
        appDevs: { impact: 'None', description: 'No impact on smart contract development as this handles backend state management during migration.' },
        walletDevs: { impact: 'None', description: 'No impact on wallet development as preimage retention is handled transparently by the protocol.' },
        toolingInfra: { impact: 'Medium', description: 'Infrastructure providers need to understand preimage retention requirements for proper state reconstruction and proof generation.' },
        layer2s: { impact: 'None', description: 'No direct impact on Layer 2 operations as this manages execution layer state transition details.' },
        stakersNodes: { impact: 'Medium', description: 'Need to properly handle preimage data during the Verkle tree migration to maintain state verification capabilities.' },
        clClients: { impact: 'None', description: 'No direct impact on consensus layer operations as this affects execution layer state management.' },
        elClients: { impact: 'High', description: 'Must implement proper preimage retention mechanisms during state tree migration to ensure continuity of state verification.' }
      },
      benefits: [
        "Ensures data integrity during Verkle tree transition",
        "Maintains historical state accessibility",
        "Prevents data loss during migration",
        "Supports smooth transition to stateless model"
      ]
    },
    7545: {
      laymanTitle: "Verkle proof verification precompile",
      laymanDescription: "This adds efficient built-in verification for Verkle tree cryptographic proofs. Instead of expensive smart contract computations, this precompile enables fast and cheap verification of the new proof system.",
      inclusionStage: 'Considered for Inclusion',
      northStars: ['Scale L1', 'Improve UX'],
      northStarAlignment: {
        scaleL1: { impact: 'High', description: 'Essential for efficient Verkle tree proof verification within smart contracts, enabling advanced stateless applications and cross-chain verification.' },
        scaleL2: { impact: 'Medium', description: 'Enables efficient verification of L1 state proofs in Layer 2 systems and improved cross-chain bridge security.' },
        improveUX: { impact: 'Medium', description: 'Enables new applications requiring state proof verification at much lower gas costs than pure smart contract implementations.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Low', description: 'Benefits through cheaper applications that need to verify state proofs, enabling new use cases like efficient cross-chain bridges.' },
        appDevs: { impact: 'High', description: 'Enables building applications that efficiently verify Verkle proofs, opening up new possibilities for cross-chain protocols and state-dependent applications.' },
        walletDevs: { impact: 'Medium', description: 'Can implement more efficient state verification in light clients and improve cross-chain transaction validation.' },
        toolingInfra: { impact: 'Medium', description: 'Infrastructure services can leverage efficient proof verification for state-dependent queries and cross-chain data verification.' },
        layer2s: { impact: 'High', description: 'Critical for Layer 2 systems that need to verify L1 state efficiently, enabling better bridge security and state synchronization.' },
        stakersNodes: { impact: 'Low', description: 'Indirect benefits through more efficient proof verification reducing overall network computational load.' },
        clClients: { impact: 'None', description: 'No direct impact on consensus layer operations as this affects execution layer precompile functionality.' },
        elClients: { impact: 'High', description: 'Must implement the Verkle proof verification precompile with proper gas accounting and cryptographic verification algorithms.' }
      },
      benefits: [
        "Enables cheap verification of Verkle proofs in smart contracts",
        "Unlocks new cross-chain application possibilities", 
        "Reduces gas costs for state proof verification",
        "Essential infrastructure for stateless applications"
      ]
    },
    7667: {
      laymanTitle: "Raise gas costs of hash functions",
      laymanDescription: "This increases gas costs for hash operations to better reflect their computational cost in the Verkle tree environment. The adjustment ensures fair pricing as the protocol transitions to new cryptographic primitives.",
      inclusionStage: 'Considered for Inclusion',
      northStars: ['Scale L1'],
      northStarAlignment: {
        scaleL1: { impact: 'Low', description: 'Ensures sustainable economics for hash operations in the Verkle tree environment and prevents potential DoS vectors from underpriced operations.' },
        scaleL2: { impact: 'None', description: 'No direct impact on Layer 2 scaling capabilities.' },
        improveUX: { impact: 'Low', description: 'More accurate pricing for cryptographic operations, though may increase costs for some hash-intensive applications.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Low', description: 'Most users unaffected, but hash-intensive applications may see slightly increased transaction costs.' },
        appDevs: { impact: 'Medium', description: 'Applications using extensive hash operations (like Merkle tree verification) may need to optimize or budget for higher gas costs.' },
        walletDevs: { impact: 'None', description: 'Minimal impact as wallets typically don\'t perform extensive hash operations directly.' },
        toolingInfra: { impact: 'Low', description: 'Gas estimation tools need updates for the new hash function pricing, but changes are straightforward.' },
        layer2s: { impact: 'Low', description: 'Layer 2 systems using hash-intensive operations may see increased costs for certain proof verification patterns.' },
        stakersNodes: { impact: 'Low', description: 'Better compensation alignment for computational work performed during hash operations in the new environment.' },
        clClients: { impact: 'None', description: 'No direct impact on consensus layer operations as this affects execution layer gas pricing.' },
        elClients: { impact: 'Medium', description: 'Need to implement updated gas costs for hash functions with proper metering for the Verkle tree computational model.' }
      },
      benefits: [
        "Ensures fair pricing for hash operations",
        "Prevents DoS attacks through underpriced computation",
        "Aligns gas costs with Verkle tree computational model",
        "Maintains network economic sustainability"
      ]
    },
    7793: {
      laymanTitle: "Conditional Transactions",
      laymanDescription: "This introduces smart transactions that only execute when specific conditions are met on-chain. Instead of failed transactions wasting gas, these transactions wait for the right conditions or don't execute at all.",
      inclusionStage: 'Proposed for Inclusion',
      northStars: ['Improve UX', 'Scale L1'],
      northStarAlignment: {
        scaleL1: { impact: 'Medium', description: 'Reduces wasted computation from failed transactions and enables more efficient transaction patterns that only execute when conditions are optimal.' },
        scaleL2: { impact: 'Low', description: 'More efficient transaction patterns could benefit Layer 2 systems with conditional execution logic.' },
        improveUX: { impact: 'High', description: 'Dramatically improves user experience by eliminating failed transactions that waste gas, enabling more sophisticated automation and better transaction success rates.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'High', description: 'Major improvement - no more paying gas for failed transactions. Enables setting up automated transactions that wait for optimal conditions.' },
        appDevs: { impact: 'High', description: 'Enables building much more sophisticated automated applications with conditional logic, reducing complexity in smart contracts and improving reliability.' },
        walletDevs: { impact: 'High', description: 'Can implement smart transaction features like "execute when price reaches X" or "submit when gas is low" improving user experience significantly.' },
        toolingInfra: { impact: 'High', description: 'Transaction monitoring, mempool analysis, and automation tools need major updates to handle conditional transaction logic and execution patterns.' },
        layer2s: { impact: 'Medium', description: 'Can implement more efficient settlement patterns and conditional execution logic in Layer 2 protocols.' },
        stakersNodes: { impact: 'Medium', description: 'Reduced computational waste from failed transactions, though need to handle conditional transaction evaluation and storage.' },
        clClients: { impact: 'None', description: 'No direct impact on consensus layer operations as this affects execution layer transaction processing.' },
        elClients: { impact: 'High', description: 'Major implementation work required for conditional transaction evaluation, mempool management, and new transaction types with condition checking.' }
      },
      benefits: [
        "Eliminates wasted gas from failed transactions",
        "Enables sophisticated transaction automation",
        "Improves transaction success rates",
        "Reduces user frustration with failed transactions"
      ]
    },
    7843: {
      laymanTitle: "SLOTNUM opcode",
      laymanDescription: "This adds a simple but powerful new opcode that lets smart contracts know the current slot number (Ethereum's 12-second time unit). This enables precise time-based logic without relying on block timestamps.",
      inclusionStage: 'Proposed for Inclusion',
      northStars: ['Improve UX'],
      northStarAlignment: {
        scaleL1: { impact: 'None', description: 'No direct scaling benefits, though more precise timing could enable more efficient protocol designs.' },
        scaleL2: { impact: 'None', description: 'No direct impact on Layer 2 scaling capabilities.' },
        improveUX: { impact: 'Medium', description: 'Enables more reliable time-based smart contracts and better coordination between consensus and execution layers.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Low', description: 'Indirect benefits through more reliable time-based applications like vesting contracts, auctions, and time-locked features.' },
        appDevs: { impact: 'High', description: 'Provides precise, reliable timing mechanism for smart contracts, enabling better auction systems, vesting schedules, and time-dependent logic.' },
        walletDevs: { impact: 'Low', description: 'Can implement more accurate time-based features and better estimation of when time-locked transactions will execute.' },
        toolingInfra: { impact: 'Low', description: 'Development tools and debuggers need to support the new SLOTNUM opcode for smart contract development and testing.' },
        layer2s: { impact: 'Low', description: 'Layer 2 systems can use more precise timing coordination with L1 consensus through slot number access.' },
        stakersNodes: { impact: 'None', description: 'No impact on node operation as this is a simple opcode addition that returns existing consensus layer information.' },
        clClients: { impact: 'Low', description: 'May need to expose slot number information to execution layer, but this is minimal coordination work.' },
        elClients: { impact: 'Low', description: 'Simple implementation - just need to add the SLOTNUM opcode that returns the current consensus layer slot number.' }
      },
      benefits: [
        "Enables precise time-based smart contract logic",
        "Better coordination between consensus and execution layers",
        "More reliable auction and vesting mechanisms",
        "Simpler implementation than timestamp-based alternatives"
      ]
    },
    7732: {
      laymanTitle: "execution Payload-Block Separation (ePBS)",
      laymanDescription: "It proposes a minimal set of changes to maximally decouple execution and consensus layer validation. This feature enables L1 scaling by changing the time required to execute a block from the current ~2 seconds to 8 seconds. And it changes the time required to broadcast blobs in the network from the current ~2 seconds to ~9 seconds.",
      inclusionStage: 'Proposed for Inclusion',
      northStars: ['Scale L1', 'Improve UX'],
      northStarAlignment: {
        scaleL1: { impact: 'High', description: 'Enables more sophisticated block production mechanisms and reduces validator infrastructure requirements, improving overall network efficiency and censorship resistance.' },
        scaleL2: { impact: 'Medium', description: 'More predictable L1 block production benefits Layer 2 settlement and reduces MEV impact on cross-layer transactions.' },
        improveUX: { impact: 'High', description: 'Reduces transaction censorship, provides more predictable inclusion times, and makes block production more democratic and accessible.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'High', description: 'Dramatically reduced transaction censorship, more predictable transaction inclusion, and protection from MEV extraction that currently inflates transaction costs.' },
        appDevs: { impact: 'Medium', description: 'More predictable transaction ordering and reduced MEV impact on application logic, enabling more reliable automated trading and DeFi strategies.' },
        walletDevs: { impact: 'Medium', description: 'Can provide better transaction inclusion predictions and reduced exposure to MEV-driven front-running attacks.' },
        toolingInfra: { impact: 'High', description: 'Major updates needed for block production monitoring, MEV analysis tools, and validator infrastructure to handle the new proposer-builder separation model.' },
        layer2s: { impact: 'Medium', description: 'More predictable L1 settlement environment and reduced MEV impact on Layer 2 to Layer 1 transactions.' },
        stakersNodes: { impact: 'High', description: 'Fundamentally changes validator responsibilities - proposers focus on consensus while builders handle transaction ordering, reducing hardware and expertise requirements.' },
        clClients: { impact: 'High', description: 'Major implementation work required for the new proposer-builder coordination mechanisms and consensus layer protocol changes.' },
        elClients: { impact: 'High', description: 'Significant changes needed for block construction separation, new transaction ordering mechanisms, and coordination with consensus layer proposer selection.' }
      },
      benefits: [
        "Reduces transaction censorship and MEV extraction",
        "Democratizes block production by lowering barriers",
        "Improves transaction inclusion predictability", 
        "Makes Ethereum more resistant to centralization pressures"
      ],
      isHeadliner: true
    },
    7782: {
      laymanTitle: "Reduce Block Latency",
      laymanDescription: "This reduces Ethereum's slot time from 12 seconds to 6 seconds, making Ethereum a better confirmation engine for apps and rollups. Everyone benefits: users get faster confirmations with better censorship resistance, DeFi gets more efficient trading with lower fees, stakers get lower reward variability, and nodes get better resource utilization with smoother bandwidth usage.",
      inclusionStage: 'Proposed for Inclusion',
      northStars: ['Improve UX', 'Scale L1'],
      northStarAlignment: {
        scaleL1: { impact: 'High', description: 'Makes Ethereum a superior confirmation engine by doubling proposer frequency while maintaining throughput. Improves censorship resistance through 2x more proposers per unit time.' },
        scaleL2: { impact: 'High', description: 'Layer 2 rollups receive L1 finality quicker with faster safe confirmations and block inclusion. Based rollups clock moves twice as fast, directly improving their performance.' },
        improveUX: { impact: 'High', description: 'Wallets display fresher data with 6-second confirmations. DeFi exchanges become more efficient with frequent price updates, reducing arbitrage losses and attracting more liquidity.' }
      },
              stakeholderImpacts: {
          endUsers: { impact: 'High', description: 'Transaction confirmations in 6 seconds instead of 12, with better censorship resistance from 2x more proposers per second. DeFi users enjoy lower trading fees and reduced slippage from more efficient exchanges with frequent price updates.' },
          appDevs: { impact: 'High', description: 'Can build more responsive applications with frequent data triggers reducing staleness. DeFi protocols benefit from tighter spreads, reduced arbitrage losses, and flywheel effects attracting more liquidity and traders.' },
          walletDevs: { impact: 'High', description: 'Can display fresher chain data following transaction inclusion with 6-second head updates. Need to update timing assumptions but deliver significantly improved user responsiveness.' },
          toolingInfra: { impact: 'High', description: 'Block explorers and infrastructure need conditional logic for slot times to handle historical 12s blocks and new 6s blocks. Must implement millisecond-precision timing instead of seconds.' },
          layer2s: { impact: 'High', description: 'Receive L1 finality, safe confirmations, and block inclusion all twice as fast. Based rollups see their sequencing clock move twice as fast. Interoperability protocols get quicker actionable signals.' },
          stakersNodes: { impact: 'High', description: 'Lower reward variability from smaller, more frequent rewards reducing pooling incentives. Better resource utilization with smoother bandwidth usage, but must handle doubled message frequency and new subslot timing (3s/1.5s/1.5s).' },
          clClients: { impact: 'High', description: 'Major implementation for conditional slot timing logic, new subslot schedules (3s block proposal, 1.5s attestations, 1.5s aggregation), and doubled consensus message processing while maintaining validator participation.' },
          elClients: { impact: 'Medium', description: 'Gas limit votes halved to maintain "gas per 12 seconds" throughput semantics. Blob targets and limits halved. May need investigation of contracts assuming fixed 12-second slot times.' }
        },
              benefits: [
          "Halves transaction confirmation time from 12s to 6s with better censorship resistance",
          "Makes DeFi exchanges more efficient with frequent price updates and reduced arbitrage losses",
          "Creates healthier block construction markets with more frequent, smaller auction opportunities",
          "Improves interoperability with faster L1 finality for rollups and bridges",
          "Reduces staking reward variability, benefiting solo stakers and home operators",
          "Smooths bandwidth usage with better resource utilization for node operators",
          "Enables flywheel effects attracting more liquidity and traders to Ethereum",
          "Maintains current throughput while doubling proposer frequency per unit time"
        ],
      isHeadliner: true
    },
    7937: {
      laymanTitle: "EVM64 Suite - 64-bit EVM Operations",
      laymanDescription: "This is the core EIP of the EVM64 collection, introducing 64-bit arithmetic operations to the EVM. The full EVM64 suite includes multiple EIPs enabling much more efficient mathematical computations by adding 64-bit operations alongside existing 256-bit ones.",
      inclusionStage: 'Proposed for Inclusion',
      northStars: ['Scale L1', 'Improve UX'],
      northStarAlignment: {
        scaleL1: { impact: 'Medium', description: 'Significantly improves computational efficiency for mathematical operations, reducing gas costs and enabling more complex on-chain calculations.' },
        scaleL2: { impact: 'Low', description: 'More efficient computations benefit Layer 2 proving systems and rollup verification mechanisms.' },
        improveUX: { impact: 'Medium', description: 'Cheaper and faster mathematical operations enable more sophisticated on-chain applications and reduce gas costs for computation-heavy smart contracts.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'Medium', description: 'Lower gas costs for applications requiring mathematical computations like DeFi protocols, gaming, and scientific applications.' },
        appDevs: { impact: 'High', description: 'Can build much more efficient mathematical applications, implement better algorithms on-chain, and reduce gas costs for computation-intensive smart contracts.' },
        walletDevs: { impact: 'Low', description: 'Indirect benefits through lower gas costs for mathematical operations in wallet-related smart contracts.' },
        toolingInfra: { impact: 'Medium', description: 'Development tools, debuggers, and gas estimation systems need updates to support 64-bit operations and their gas costs.' },
        layer2s: { impact: 'Medium', description: 'More efficient mathematical operations benefit Layer 2 proof generation and verification systems.' },
        stakersNodes: { impact: 'Low', description: 'More efficient computation reduces overall network computational load for mathematical operations.' },
        clClients: { impact: 'None', description: 'No direct impact on consensus layer operations as this affects execution layer computational capabilities.' },
        elClients: { impact: 'High', description: 'Major implementation work required for new 64-bit opcodes, proper gas accounting, and ensuring compatibility with existing 256-bit operations.' }
      },
      benefits: [
        "Dramatically reduces gas costs for mathematical operations",
        "Enables more sophisticated on-chain calculations",
        "Improves performance for DeFi and gaming applications",
        "Makes the EVM more competitive with other smart contract platforms"
      ],
      isHeadliner: true
    },
    7919: {
      laymanTitle: "Pureth - Provable RPC responses",
      laymanDescription: "This enables Ethereum nodes to provide cryptographic proofs with their responses, eliminating the need to trust RPC providers. Users can verify that data from any source is authentic without running their own full node.",
      inclusionStage: 'Proposed for Inclusion',
      northStars: ['Improve UX', 'Scale L1'],
      northStarAlignment: {
        scaleL1: { impact: 'Medium', description: 'Improves network decentralization by reducing reliance on trusted RPC providers and enabling more efficient light client verification.' },
        scaleL2: { impact: 'Low', description: 'More trustless data access benefits Layer 2 light clients and cross-chain verification mechanisms.' },
        improveUX: { impact: 'High', description: 'Eliminates trust requirements for data access, enables secure light clients, and dramatically improves decentralization of the application ecosystem.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'High', description: 'Can use any RPC provider securely without trust, access verified blockchain data from lightweight applications, and reduced dependence on centralized services.' },
        appDevs: { impact: 'High', description: 'Can build truly decentralized applications without requiring users to run full nodes, implement secure light clients, and verify data from any source.' },
        walletDevs: { impact: 'High', description: 'Can implement secure light wallets that verify all data cryptographically, reducing infrastructure costs while maintaining security guarantees.' },
        toolingInfra: { impact: 'High', description: 'RPC providers need major updates to support proof generation, block explorers can provide verifiable data, and new verification tooling needs development.' },
        layer2s: { impact: 'Medium', description: 'Can implement more secure light clients for Layer 2 networks and improve cross-chain data verification mechanisms.' },
        stakersNodes: { impact: 'Medium', description: 'Need to generate cryptographic proofs for data responses, though this enables lighter infrastructure for many use cases.' },
        clClients: { impact: 'Low', description: 'May need some coordination for proof generation, but this primarily affects execution layer data structures.' },
        elClients: { impact: 'High', description: 'Major implementation work required for proof generation systems, new data structures, and RPC response verification mechanisms.' }
      },
      benefits: [
        "Eliminates need to trust RPC providers",
        "Enables secure light clients for wallets and dApps",
        "Dramatically improves application decentralization",
        "Reduces infrastructure requirements for verified data access"
      ],
      isHeadliner: true
    },
    7942: {
      laymanTitle: "Available Attestation - Reorg-Resilient Ethereum",
      laymanDescription: "This is a comprehensive solution to eliminate all known reorganization attacks on Ethereum. Instead of fixing attacks one-by-one, Available Attestation redesigns how consensus works to make reorg attacks fundamentally impossible.",
      inclusionStage: 'Proposed for Inclusion',
      northStars: ['Scale L1', 'Improve UX'],
      northStarAlignment: {
        scaleL1: { impact: 'High', description: 'Eliminates all known reorg attacks, dramatically improving network security and enabling more aggressive scaling optimizations without security trade-offs.' },
        scaleL2: { impact: 'Medium', description: 'More secure and predictable L1 settlement eliminates reorg risks for Layer 2 bridge security and settlement finality.' },
        improveUX: { impact: 'High', description: 'Eliminates transaction reordering attacks, provides guaranteed inclusion properties, and dramatically improves user confidence in transaction finality.' }
      },
      stakeholderImpacts: {
        endUsers: { impact: 'High', description: 'Eliminates the possibility of transaction censorship and reorg attacks, providing guaranteed transaction inclusion and much stronger finality guarantees.' },
        appDevs: { impact: 'High', description: 'Can build applications with stronger security assumptions, eliminate MEV-related edge cases, and provide users with guaranteed transaction execution properties.' },
        walletDevs: { impact: 'Medium', description: 'Can provide stronger transaction finality guarantees and eliminate concerns about transaction reordering after inclusion.' },
        toolingInfra: { impact: 'High', description: 'Major updates needed for consensus monitoring, reorg detection systems, and fork choice analysis tools to handle the new attestation mechanisms.' },
        layer2s: { impact: 'High', description: 'Dramatically improves bridge security by eliminating L1 reorg risks and enables more aggressive optimization of settlement mechanisms.' },
        stakersNodes: { impact: 'High', description: 'Fundamental changes to attestation behavior and fork choice logic, but eliminates complex reorg-related edge cases in validator operations.' },
        clClients: { impact: 'High', description: 'Major implementation work required for new attestation mechanisms, modified fork choice logic, and consensus layer protocol changes.' },
        elClients: { impact: 'Medium', description: 'Need to coordinate with new consensus mechanisms but most changes are in the consensus layer attestation logic.' }
      },
      benefits: [
        "Eliminates all known reorganization attacks permanently",
        "Provides formal security guarantees with mathematical proofs",
        "Strengthens transaction inclusion and finality properties",
        "Enables more aggressive scaling without security trade-offs"
      ],
      isHeadliner: true
    },
     7886: {
       laymanTitle: "Delayed Execution",
       laymanDescription: "This introduces a delay between when transactions are committed and when they're executed, reducing MEV extraction and front-running while improving transaction ordering fairness.",
       inclusionStage: 'Proposed for Inclusion',
       northStars: ['Improve UX', 'Scale L1'],
       northStarAlignment: {
         scaleL1: { impact: 'Medium', description: 'Improves transaction ordering efficiency and reduces MEV-driven congestion, enabling more predictable block space utilization.' },
         scaleL2: { impact: 'Low', description: 'More predictable L1 transaction ordering benefits Layer 2 settlement patterns and bridge operations.' },
         improveUX: { impact: 'High', description: 'Dramatically reduces front-running and MEV extraction, providing fairer transaction ordering and more predictable execution for users.' }
       },
       stakeholderImpacts: {
         endUsers: { impact: 'High', description: 'Protection from front-running attacks, more fair transaction ordering, and reduced MEV tax on transactions leading to better execution prices.' },
         appDevs: { impact: 'High', description: 'Can build applications with stronger ordering guarantees, reduced MEV concerns, and more predictable execution environments.' },
         walletDevs: { impact: 'Medium', description: 'Need to handle delayed execution in transaction flow but can provide better protection from front-running for users.' },
         toolingInfra: { impact: 'High', description: 'MEV analysis tools, transaction simulation, and ordering analysis systems need major updates to handle delayed execution patterns.' },
         layer2s: { impact: 'Medium', description: 'More predictable L1 execution environment benefits Layer 2 settlement and reduces MEV impact on cross-layer transactions.' },
         stakersNodes: { impact: 'Medium', description: 'Need to handle the new delayed execution model in block production and transaction ordering mechanisms.' },
         clClients: { impact: 'Low', description: 'Minimal impact as this primarily affects execution layer transaction processing and ordering.' },
         elClients: { impact: 'High', description: 'Major implementation work required for delayed execution mechanisms, new transaction lifecycle management, and ordering protocols.' }
       },
       benefits: [
         "Reduces front-running and MEV extraction significantly",
         "Provides fairer transaction ordering for all users",
         "Enables more predictable execution environments",
         "Improves overall transaction execution quality"
       ],
       isHeadliner: true
     },
     7928: {
       laymanTitle: "Block-level Access Lists",
       laymanDescription: "This introduces access lists at the block level rather than individual transactions, dramatically reducing gas costs for applications that access similar state and enabling new optimization patterns.",
       inclusionStage: 'Proposed for Inclusion',
       northStars: ['Scale L1', 'Improve UX'],
       northStarAlignment: {
         scaleL1: { impact: 'Medium', description: 'Significantly reduces gas costs for state access through block-level optimization, improving overall network efficiency and throughput.' },
         scaleL2: { impact: 'Low', description: 'More efficient state access patterns benefit Layer 2 settlement transactions and bridge operations.' },
         improveUX: { impact: 'Medium', description: 'Lower gas costs for complex applications and improved predictability for applications with similar state access patterns.' }
       },
       stakeholderImpacts: {
         endUsers: { impact: 'Medium', description: 'Lower gas costs for complex applications, especially DeFi protocols and applications that access similar state across multiple transactions.' },
         appDevs: { impact: 'High', description: 'Can optimize applications for block-level access patterns, significantly reduce gas costs for state-heavy applications, and enable new design patterns.' },
         walletDevs: { impact: 'Low', description: 'Indirect benefits through lower gas costs for applications, but minimal direct impact on wallet development.' },
         toolingInfra: { impact: 'Medium', description: 'Gas estimation tools, transaction simulation, and optimization analysis need updates to handle block-level access list patterns.' },
         layer2s: { impact: 'Low', description: 'More efficient state access in Layer 2 settlement transactions and optimized bridge operations.' },
         stakersNodes: { impact: 'Low', description: 'More efficient block processing due to optimized state access patterns, reducing computational overhead.' },
         clClients: { impact: 'None', description: 'No direct impact on consensus layer operations as this affects execution layer state access optimization.' },
         elClients: { impact: 'High', description: 'Significant implementation work required for block-level access list management, state access optimization, and gas accounting updates.' }
       },
       benefits: [
         "Dramatically reduces gas costs for state-heavy applications",
         "Enables new optimization patterns for developers",
         "Improves block processing efficiency",
         "Provides more predictable gas costs for complex applications"
       ],
       isHeadliner: true
     },
     7805: {
       laymanTitle: "Fork-Choice Inclusion Lists (FOCIL)",
       laymanDescription: "This enforces transaction inclusion at the fork choice level, making censorship much more difficult by requiring validators to include specific transactions or face consensus penalties.",
       inclusionStage: 'Proposed for Inclusion',
       northStars: ['Improve UX', 'Scale L1'],
       northStarAlignment: {
         scaleL1: { impact: 'Medium', description: 'Improves network censorship resistance and ensures more democratic transaction inclusion, strengthening Ethereum\'s credible neutrality.' },
         scaleL2: { impact: 'Low', description: 'More censorship-resistant L1 provides better foundation for Layer 2 operations and settlement guarantees.' },
         improveUX: { impact: 'High', description: 'Provides strong guarantees against transaction censorship and ensures fair access to block space for all users regardless of transaction content.' }
       },
       stakeholderImpacts: {
         endUsers: { impact: 'High', description: 'Strong protection against transaction censorship, guaranteed inclusion for valid transactions, and improved confidence in transaction processing.' },
         appDevs: { impact: 'Medium', description: 'Can build applications with stronger inclusion guarantees and reduced concerns about application-specific censorship.' },
         walletDevs: { impact: 'Medium', description: 'Can provide users with stronger transaction inclusion guarantees and better protection against selective censorship.' },
         toolingInfra: { impact: 'High', description: 'Censorship monitoring tools, inclusion list analysis, and validator behavior tracking systems need major updates for FOCIL mechanisms.' },
         layer2s: { impact: 'Medium', description: 'More censorship-resistant L1 settlement provides stronger guarantees for Layer 2 transaction processing and bridge operations.' },
         stakersNodes: { impact: 'High', description: 'Validators must comply with inclusion list requirements or face consensus penalties, fundamentally changing block production responsibilities.' },
         clClients: { impact: 'High', description: 'Major implementation work required for inclusion list enforcement, fork choice modifications, and consensus layer penalty mechanisms.' },
         elClients: { impact: 'Medium', description: 'Need to coordinate with consensus layer inclusion list requirements and implement transaction inclusion validation mechanisms.' }
       },
       benefits: [
         "Provides strong censorship resistance guarantees",
         "Ensures fair access to block space for all users",
         "Strengthens Ethereum's credible neutrality",
         "Reduces validator centralization pressures"
       ],
       isHeadliner: true
     },
     7692: {
       laymanTitle: "EVM Object Format (EOFv1) - Mega EOF",
       laymanDescription: "This introduces a new container format for EVM bytecode that enables code versioning, removes complex jump analysis, and paves the way for new execution environments like RISC-V and EVM64 within the same contract. Originally declined from Fusaka due to controversy, it's being reproposed with multiple variants to address community concerns.",
       inclusionStage: 'Proposed for Inclusion',
       northStars: ['Scale L1', 'Improve UX'],
       northStarAlignment: {
         scaleL1: { impact: 'High', description: 'Enables incremental deployment of more efficient execution environments like RISC-V and EVM64 for computationally intensive tasks while maintaining EVM compatibility. Removes JUMPDEST analysis overhead.' },
         scaleL2: { impact: 'Medium', description: 'Better code analysis and performance improvements benefit Layer 2 execution and proof generation systems. Enables more efficient rollup implementations.' },
         improveUX: { impact: 'Medium', description: 'Provides better developer tools through improved code analysis, versioning capabilities, and performance improvements for computationally intensive applications.' }
       },
       stakeholderImpacts: {
         endUsers: { impact: 'Medium', description: 'Indirect benefits from improved contract performance and reduced gas costs for computationally intensive operations. Better reliability from enhanced code validation.' },
         appDevs: { impact: 'High', description: 'Can use multiple execution environments within same contract - write normal logic in EVM and intensive computations in EVM64/RISC-V. Better code analysis tools and function support improve development experience.' },
         walletDevs: { impact: 'Low', description: 'Minimal direct impact on wallet development, though improved contract reliability and performance benefit user experience indirectly.' },
         toolingInfra: { impact: 'High', description: 'Major updates needed for debuggers, analyzers, and development tools to support EOF containers, multiple execution environments, and new bytecode format. Better analysis capabilities once implemented.' },
         layer2s: { impact: 'Medium', description: 'Can leverage more efficient execution environments for proof generation and validation. Better code analysis aids in rollup optimization and security verification.' },
         stakersNodes: { impact: 'Medium', description: 'Reduced computational overhead from eliminating JUMPDEST analysis. Potential increased complexity from supporting multiple execution environments within contracts.' },
         clClients: { impact: 'Low', description: 'Minimal direct impact on consensus layer operations as this primarily affects execution layer bytecode processing and validation.' },
         elClients: { impact: 'High', description: 'Major implementation work for new bytecode container format, multiple execution environments, enhanced validation, and maintaining backwards compatibility with legacy bytecode.' }
       },
       benefits: [
         "Enables incremental adoption of RISC-V and EVM64 within existing contracts",
         "Removes complex JUMPDEST analysis improving execution efficiency",
         "Provides code versioning for backward-incompatible protocol changes",
         "Enables better code analysis and development tooling",
         "Introduces first-class function support improving analysis opportunities",
         "Addresses multiple EVM pain points through container format",
         "Paves the way for maintaining existing toolchain while adding new capabilities",
         "Enables 'both EVM and RISC-V' rather than 'either EVM or RISC-V' approach"
       ],
       isHeadliner: true
     }
  };

  useEffect(() => {
    // Filter EIPs that have relationships with this fork
    const filteredEips = eipsData.filter(eip => 
      eip.forkRelationships.some(fork => 
        fork.forkName.toLowerCase() === forkName.toLowerCase()
      )
    );
    setEips(filteredEips);
  }, [forkName]);

  // Handle URL hash on component mount and location changes
  useEffect(() => {
    const hash = location.hash.substring(1); // Remove the # symbol
    if (hash) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveSection(hash);
        }
      }, 100);
    }
  }, [location.hash, eips]);

  // Intersection Observer for TOC
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { 
        threshold: 0.3,
        rootMargin: '0px'
      }
    );

    // Observe all section elements
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, [eips]);

  const getImpactColor = (impact: 'None' | 'Low' | 'Medium' | 'High') => {
    switch (impact) {
      case 'None':
        return 'bg-slate-100 text-slate-600';
      case 'Low':
        return 'bg-blue-100 text-blue-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getInclusionStageColor = (stage: string) => {
    switch (stage) {
      case 'Proposed for Inclusion':
        return 'bg-slate-100 text-slate-700';
      case 'Considered for Inclusion':
        return 'bg-slate-200 text-slate-700';
      case 'Scheduled for Inclusion':
        return 'bg-yellow-50 text-yellow-700';
      case 'Declined for Inclusion':
        return 'bg-red-50 text-red-700';
      case 'Included':
        return 'bg-emerald-50 text-emerald-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getUpgradeStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-100 text-emerald-800';
      case 'Upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'Planning':
        return 'bg-purple-100 text-purple-800';
      case 'Research':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  };

  // Generate TOC items
  const tocItems = [
    { id: 'overview', label: 'Overview', type: 'section' as const, count: null as number | null },
    ...['Scheduled for Inclusion', 'Considered for Inclusion', 'Proposed for Inclusion', 'Declined for Inclusion']
      .flatMap(stage => {
        const stageEips = eips.filter(eip => publicData[eip.id]?.inclusionStage === stage);
        if (stageEips.length === 0) return [];
        
        // Sort EIPs: headliners first, then by EIP number
        const sortedEips = stageEips.sort((a, b) => {
          const aIsHeadliner = publicData[a.id]?.isHeadliner || false;
          const bIsHeadliner = publicData[b.id]?.isHeadliner || false;
          
          // If one is headliner and other isn't, headliner comes first
          if (aIsHeadliner && !bIsHeadliner) return -1;
          if (!aIsHeadliner && bIsHeadliner) return 1;
          
          // If both are same type (both headliner or both not), sort by EIP number
          return a.id - b.id;
        });
        
        const stageItem = {
          id: stage.toLowerCase().replace(/\s+/g, '-'),
          label: stage,
          type: 'section' as const,
          count: stageEips.length
        };
        
        const eipItems = sortedEips.map(eip => {
          const publicInfo = publicData[eip.id];
          const isHeadliner = publicInfo?.isHeadliner || false;
          const starSymbol = forkName.toLowerCase() === 'glamsterdam' ? '☆' : '★';
          
          return {
            id: `eip-${eip.id}`,
            label: `${isHeadliner ? `${starSymbol} ` : ''}EIP-${eip.id}: ${publicInfo?.laymanTitle || eip.title}`,
            type: 'eip' as const,
            count: null as number | null
          };
        });
        
        return [stageItem, ...eipItems];
      })
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL hash
      window.history.pushState(null, '', `#${sectionId}`);
      setActiveSection(sectionId);
    }
  };

  const copyLinkToClipboard = (sectionId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSection(sectionId);
      // Clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedSection(null);
      }, 2000);
    }).catch(() => {
      // Fallback for browsers that don't support clipboard API
      console.log('Failed to copy link');
    });
  };

  const Tooltip: React.FC<{ children: React.ReactNode; text: string; className?: string }> = ({ 
    children, 
    text, 
    className = '' 
  }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    return (
      <div 
        className={`relative ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        {isVisible && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 animate-in fade-in duration-150">
            {text}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-900"></div>
          </div>
        )}
      </div>
    );
  };

  const CopyLinkButton: React.FC<{ sectionId: string; title: string; size?: 'sm' | 'md' }> = ({ 
    sectionId, 
    title, 
    size = 'md' 
  }) => {
    const isCopied = copiedSection === sectionId;
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
    
    return (
      <div className="relative">
        <Tooltip text={isCopied ? "Copied!" : title}>
          <button
            onClick={() => copyLinkToClipboard(sectionId)}
            className={`transition-colors cursor-pointer ${
              isCopied 
                ? 'text-emerald-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {isCopied ? (
              <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </button>
        </Tooltip>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-6">
            <Link to="/" className="text-3xl font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight">
              Forkcast
            </Link>
          </div>
          <Link to="/" className="text-slate-600 hover:text-slate-800 mb-6 inline-block text-sm font-medium">
            ← All Network Upgrades
          </Link>
          
          <div className="border-b border-slate-200 pb-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-light text-slate-900 tracking-tight">{displayName}</h1>
                  <CopyLinkButton 
                    sectionId="upgrade" 
                    title="Copy link to this upgrade"
                  />
                </div>
                <p className="text-base text-slate-600 mb-4 leading-relaxed max-w-2xl">{description}</p>
                {activationDate && (
                  <p className="text-sm text-slate-500">
                    <span className="font-medium">Expected Activation:</span> {activationDate}
                  </p>
                )}
              </div>
              <div className="mt-6 lg:mt-0">
                <span className={`px-3 py-1 text-xs font-medium rounded ${getUpgradeStatusColor(status)}`}>
                  {status}
                </span>
              </div>
            </div>
            
            {/* Discrete experiment notice */}
            <div className="mt-6">
              <p className="text-xs text-slate-400 italic">
                An experiment by the Protocol & Application Support team · Have feedback? Contact{' '}
                <a 
                  href="https://x.com/wolovim" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-700 underline decoration-1 underline-offset-2"
                >
                  @wolovim
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Main Content with TOC */}
        <div className="flex gap-8">
          {/* Table of Contents */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Contents</h3>
              <nav className="space-y-1">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full text-left rounded transition-colors ${
                      item.type === 'section' 
                        ? `px-3 py-2 text-sm ${
                            activeSection === item.id
                              ? 'bg-purple-100 text-purple-800 font-medium'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`
                        : `px-6 py-1.5 text-xs ${
                            activeSection === item.id
                              ? 'bg-purple-50 text-purple-700 font-medium'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={item.type === 'eip' ? 'truncate' : ''}>{item.label}</span>
                      {item.count && (
                        <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{item.count}</span>
                      )}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* EIPs */}
            <div className="space-y-8">
              {/* Overview Section */}
              <div className="bg-white border border-slate-200 rounded p-6" id="overview" data-section>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Upgrade Overview</h2>
                  <CopyLinkButton 
                    sectionId="overview" 
                    title="Copy link to overview"
                    size="sm"
                  />
                </div>
                {/* Special note for Glamsterdam's competitive headliner process */}
                {forkName.toLowerCase() === 'glamsterdam' && (
                  <>
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="font-medium text-amber-900 text-sm mb-1">Headliner Selection in Progress</h4>
                          <p className="text-amber-800 text-xs leading-relaxed">
                            Glamsterdam is currently in the headliner proposal phase. Multiple major features are competing for inclusion, including 
                             ePBS, EVM64, Pureth, Delayed Execution, Block-level Access Lists, and FOCIL. The community is actively deciding which direction to prioritize. 
                            <a 
                              href="https://ethereum-magicians.org/t/eip-7773-glamsterdam-network-upgrade-meta-thread/21195" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-amber-700 hover:text-amber-900 underline decoration-1 underline-offset-2 ml-1"
                            >
                              Follow the discussion →
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Headliner Options Overview */}
                    <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded">
                      <h4 className="font-medium text-purple-900 text-sm mb-4 flex items-center gap-2">
                        <span className="text-purple-600">★</span>
                        Competing Headliner Options
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {eips
                          .filter(eip => publicData[eip.id]?.isHeadliner)
                          .sort((a, b) => a.id - b.id)
                          .map(eip => {
                            const publicInfo = publicData[eip.id];
                            if (!publicInfo) return null;
                            
                            return (
                              <button
                                key={eip.id}
                                onClick={() => scrollToSection(`eip-${eip.id}`)}
                                className="text-left p-3 bg-white border border-purple-200 rounded hover:border-purple-300 hover:shadow-sm transition-all duration-200 group"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-purple-900 text-sm group-hover:text-purple-700 transition-colors">
                                    EIP-{eip.id}: {publicInfo.laymanTitle}
                                  </h5>
                                  <svg className="w-4 h-4 text-purple-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                                  {publicInfo.laymanDescription.length > 120 
                                    ? `${publicInfo.laymanDescription.substring(0, 120)}...`
                                    : publicInfo.laymanDescription
                                  }
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {publicInfo.northStars.map(star => (
                                    <span key={star} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                      {star}
                                    </span>
                                  ))}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                      <p className="text-xs text-purple-700 mt-4 italic">
                        Click any option above to jump to its detailed analysis below.
                      </p>
                    </div>
                  </>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[
                    { stage: 'Proposed for Inclusion', count: eips.filter(eip => publicData[eip.id]?.inclusionStage === 'Proposed for Inclusion').length, color: 'bg-slate-100 text-slate-700' },
                    { stage: 'Considered for Inclusion', count: eips.filter(eip => publicData[eip.id]?.inclusionStage === 'Considered for Inclusion').length, color: 'bg-slate-200 text-slate-700' },
                    { stage: 'Scheduled for Inclusion', count: eips.filter(eip => publicData[eip.id]?.inclusionStage === 'Scheduled for Inclusion').length, color: 'bg-yellow-50 text-yellow-700' },
                    { stage: 'Declined for Inclusion', count: eips.filter(eip => publicData[eip.id]?.inclusionStage === 'Declined for Inclusion').length, color: 'bg-red-50 text-red-800' }
                  ].map(({ stage, count, color }) => (
                    <div key={stage} className="text-center p-4 bg-slate-50 rounded">
                      <div className="text-2xl font-light text-slate-900 mb-1">{count}</div>
                      <div className="text-xs text-slate-500 mb-1">EIP{count !== 1 ? 's' : ''}</div>
                      <div className={`text-xs font-medium px-2 py-1 rounded inline-block ${color}`}>
                        {stage}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Strategic Focus Areas */}
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2 uppercase tracking-wide">North Star Impact</h3>
                  <p className="text-xs text-slate-500 mb-4 italic">Note: Metrics exclude EIPs declined for inclusion</p>
                  <div className="space-y-6">
                    {[
                      {
                        name: 'Scale L1',
                        description: 'Enhance mainnet capacity and efficiency',
                        borderColor: 'border-purple-200',
                        textColor: 'text-purple-800',
                        gradientBg: 'bg-gradient-to-r from-white to-purple-100/50'
                      },
                      {
                        name: 'Scale L2',
                        description: 'Enable high-throughput Layer 2 solutions',
                        borderColor: 'border-purple-300',
                        textColor: 'text-purple-800',
                        gradientBg: 'bg-gradient-to-r from-white to-purple-200/60'
                      },
                      {
                        name: 'Improve UX',
                        description: 'Enhance user and developer experience',
                        borderColor: 'border-purple-400',
                        textColor: 'text-purple-800',
                        gradientBg: 'bg-gradient-to-r from-white to-purple-300/70'
                      }
                    ].map(({ name, description, borderColor, textColor, gradientBg }) => {
                      const relevantEips = eips.filter(eip => 
                        publicData[eip.id]?.northStars.includes(name as any) && 
                        publicData[eip.id]?.inclusionStage !== 'Declined for Inclusion'
                      );
                      
                      // Calculate impact level breakdown for details
                      const impactBreakdown = relevantEips.reduce((acc, eip) => {
                        const alignment = publicData[eip.id]?.northStarAlignment;
                        const impact = name === 'Scale L1' ? alignment?.scaleL1?.impact :
                                     name === 'Scale L2' ? alignment?.scaleL2?.impact :
                                     alignment?.improveUX?.impact;
                        if (impact) {
                          acc[impact] = (acc[impact] || 0) + 1;
                        }
                        return acc;
                      }, {} as Record<string, number>);

                      return (
                        <div key={name} className={`${borderColor} ${gradientBg} border-l-2 pl-4 py-4 rounded-r`}>
                          <div className="mb-3">
                            <h4 className={`${textColor} font-medium text-sm leading-tight`}>{name}</h4>
                            <p className="text-slate-700 text-sm leading-relaxed">{description}</p>
                          </div>
                          
                          {/* EIP count and impact breakdown */}
                          {relevantEips.length > 0 ? (
                            <div className="ml-3 bg-white/60 rounded px-3 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`${textColor} text-base font-light`}>{relevantEips.length}</span>
                                <span className="text-xs text-slate-500">
                                  EIP{relevantEips.length !== 1 ? 's' : ''} contributing to this goal
                                </span>
                              </div>
                              
                              {/* Impact levels breakdown */}
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-500">Impact distribution:</span>
                                {['High', 'Medium', 'Low'].map(level => {
                                  const levelCount = impactBreakdown[level] || 0;
                                  if (levelCount === 0) return null;
                                  return (
                                    <span key={level} className={`px-1.5 py-0.5 rounded ${
                                      level === 'High' ? 'bg-orange-100 text-orange-700' :
                                      level === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {levelCount} {level}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="ml-3 text-xs text-slate-500 italic">
                              No EIPs directly targeting this goal in this upgrade
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* EIPs Grouped by Stage */}
              {[
                { stage: 'Scheduled for Inclusion', description: 'EIPs that client teams have agreed to implement in the next upgrade devnet. These are very likely to be included in the final upgrade.' },
                { stage: 'Considered for Inclusion', description: 'EIPs that client teams are positive towards. Implementation may begin, but inclusion is not yet guaranteed.' },
                { stage: 'Proposed for Inclusion', description: 'EIPs that have been proposed for this upgrade but are still under initial review by client teams.' },
                { stage: 'Declined for Inclusion', description: 'EIPs that client teams have decided not to include in this upgrade. They may be reconsidered for future upgrades.' }
              ].map(({ stage, description }) => {
                const stageEips = eips.filter(eip => publicData[eip.id]?.inclusionStage === stage);
                
                if (stageEips.length === 0) return null;

                // Sort EIPs: headliners first, then by EIP number
                const sortedStageEips = stageEips.sort((a, b) => {
                  const aIsHeadliner = publicData[a.id]?.isHeadliner || false;
                  const bIsHeadliner = publicData[b.id]?.isHeadliner || false;
                  
                  // If one is headliner and other isn't, headliner comes first
                  if (aIsHeadliner && !bIsHeadliner) return -1;
                  if (!aIsHeadliner && bIsHeadliner) return 1;
                  
                  // If both are same type (both headliner or both not), sort by EIP number
                  return a.id - b.id;
                });

                const stageId = stage.toLowerCase().replace(/\s+/g, '-');

                return (
                  <div key={stage} className="space-y-6" id={stageId} data-section>
                    <div className="border-b border-slate-200 pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-medium text-slate-900">{stage}</h2>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getInclusionStageColor(stage)}`}>
                          {stageEips.length} EIP{stageEips.length !== 1 ? 's' : ''}
                        </span>
                        <CopyLinkButton 
                          sectionId={stageId} 
                          title={`Copy link to ${stage}`}
                          size="sm"
                        />
                      </div>
                      <p className="text-sm text-slate-600 max-w-3xl">{description}</p>
                    </div>

                    <div className="space-y-6">
                      {sortedStageEips.map(eip => {
                        const publicInfo = publicData[eip.id];
                        
                        if (!publicInfo) return null;

                        const eipId = `eip-${eip.id}`;

                        return (
                          <article key={eip.id} className={`bg-white border rounded p-8 ${
                            publicInfo.isHeadliner 
                              ? 'border-purple-200 shadow-sm ring-1 ring-purple-100' 
                              : 'border-slate-200'
                          }`} id={eipId} data-section>
                            {/* Header */}
                            <header className="border-b border-slate-100 pb-6 mb-6">
                              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-medium text-slate-900 leading-tight">
                                      {publicInfo.isHeadliner && (
                                        <Tooltip 
                                          text={forkName.toLowerCase() === 'glamsterdam' 
                                            ? "Competing headliner proposal for this network upgrade" 
                                            : "Headliner feature of this network upgrade"
                                          } 
                                          className="inline-block cursor-pointer"
                                        >
                                          <span 
                                            className="text-purple-400 hover:text-purple-600 mr-2 transition-colors cursor-help" 
                                          >
                                            {forkName.toLowerCase() === 'glamsterdam' ? '☆' : '★'}
                                          </span>
                                        </Tooltip>
                                      )}
                                      <span className="text-slate-400 text-sm font-mono mr-2 relative -top-px">EIP-{eip.id}</span>
                                      <span>{publicInfo.laymanTitle}</span>
                                    </h3>
                                    <div className="flex items-center gap-2 relative top-0.5">
                                      <Tooltip text={`View EIP-${eip.id} specification`}>
                                        <a 
                                          href={`https://eips.ethereum.org/EIPS/eip-${eip.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                        </a>
                                      </Tooltip>
                                      <CopyLinkButton 
                                        sectionId={eipId} 
                                        title={`Copy link to this section`}
                                        size="sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </header>

                            {/* Description */}
                            <div className="mb-8">
                              <p className="text-slate-700 text-sm leading-relaxed">
                                {publicInfo.laymanDescription}
                              </p>
                            </div>

                            {/* North Star Goal Alignment */}
                            <div className="mb-8">
                              <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">North Star Goal Alignment</h4>
                              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                                <div className="space-y-4">
                                  {publicInfo.northStarAlignment.scaleL1 && (
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h5 className="text-sm font-medium text-slate-900 mb-1">1. Scale L1</h5>
                                        <p className="text-xs text-slate-600">{publicInfo.northStarAlignment.scaleL1.description}</p>
                                      </div>
                                      <span className={`px-2 py-1 text-xs font-medium rounded ml-4 ${getImpactColor(publicInfo.northStarAlignment.scaleL1.impact)}`}>
                                        Impact: {publicInfo.northStarAlignment.scaleL1.impact}
                                      </span>
                                    </div>
                                  )}
                                  {publicInfo.northStarAlignment.scaleL2 && (
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h5 className="text-sm font-medium text-slate-900 mb-1">2. Scale L2 via Blobs</h5>
                                        <p className="text-xs text-slate-600">{publicInfo.northStarAlignment.scaleL2.description}</p>
                                      </div>
                                      <span className={`px-2 py-1 text-xs font-medium rounded ml-4 ${getImpactColor(publicInfo.northStarAlignment.scaleL2.impact)}`}>
                                        Impact: {publicInfo.northStarAlignment.scaleL2.impact}
                                      </span>
                                    </div>
                                  )}
                                  {publicInfo.northStarAlignment.improveUX && (
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h5 className="text-sm font-medium text-slate-900 mb-1">3. Improve UX (incl. L2 interop, app layer)</h5>
                                        <p className="text-xs text-slate-600">{publicInfo.northStarAlignment.improveUX.description}</p>
                                      </div>
                                      <span className={`px-2 py-1 text-xs font-medium rounded ml-4 ${getImpactColor(publicInfo.northStarAlignment.improveUX.impact)}`}>
                                        Impact: {publicInfo.northStarAlignment.improveUX.impact}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Stakeholder Impact */}
                            <div className="mb-8">
                              <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Stakeholder Impact</h4>
                              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  {Object.entries(publicInfo.stakeholderImpacts).map(([stakeholder, impact]) => {
                                    const stakeholderNames = {
                                      endUsers: 'End Users',
                                      appDevs: 'Application Developers',
                                      walletDevs: 'Wallet Developers',
                                      toolingInfra: 'Tooling / Infrastructure Developers',
                                      layer2s: 'Layer 2s',
                                      stakersNodes: 'Stakers & Node Operators',
                                      clClients: 'Client Developers (Consensus Layer)',
                                      elClients: 'Client Developers (Execution Layer)'
                                    };
                                    
                                    return (
                                      <div key={stakeholder} className="bg-white border border-slate-200 rounded p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <h5 className="font-medium text-slate-900 text-xs">
                                            {stakeholderNames[stakeholder as keyof typeof stakeholderNames]}
                                          </h5>
                                          <span className={`px-2 py-1 text-xs font-medium rounded flex-shrink-0 ${getImpactColor(impact.impact)}`}>
                                            {impact.impact}
                                          </span>
                                        </div>
                                        <p className="text-slate-600 text-xs leading-relaxed">{impact.description}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Benefits */}
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Key Benefits</h4>
                              <ul className="space-y-2">
                                {publicInfo.benefits.map((benefit, index) => (
                                  <li key={index} className="flex items-start text-sm">
                                    <span className="text-emerald-600 mr-3 mt-0.5 text-xs">●</span>
                                    <span className="text-slate-700">{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {eips.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-500 text-sm">No improvements found for this network upgrade.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicNetworkUpgradePage; 