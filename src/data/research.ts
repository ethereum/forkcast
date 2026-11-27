/**
 * Research areas being explored for upgrades past the one currently being
 * scoped. Broad strokes on purpose: each entry folds together several
 * individual proposals, and a number of them are left out entirely.
 *
 * Mostly drawn from the strawmap (https://strawmap.org), which is EF Protocol's
 * opinionated draft of where L1 should go, not a roadmap the ecosystem has
 * signed off on. Agreement across teams is much stronger on *what* the open
 * problems are than on which to do first.
 *
 * Deliberately carries no dates and no fork assignments. Which upgrade any of
 * this lands in is genuinely unsettled and keeps moving, so an entry here says
 * what the work is and why, never when.
 *
 * This module must not import the EIP dataset: `eipId` stays a bare number and
 * renders as a `/eips/{id}` link, so the page doesn't pull the ~630 KB `eips`
 * chunk in just to resolve a title.
 */


/** The five long-range goals the strawmap organizes everything under. */
export interface NorthStar {
  id: NorthStarId;
  /** The strawmap's own name for it. */
  label: string;
  /** The strawmap's own one-line target. */
  target: string;
  /** What that target means for someone who doesn't follow core development. */
  description: string;
}

export type NorthStarId =
  | 'fast-l1'
  | 'gigagas-l1'
  | 'teragas-l2'
  | 'post-quantum-l1'
  | 'private-l1';

export const northStars: NorthStar[] = [
  {
    id: 'fast-l1',
    label: 'fast L1',
    target: 'Inclusion and finality in seconds',
    description:
      'A transaction waits ~12 seconds to land and ~13 minutes to become irreversible. Compress both to a few seconds.',
  },
  {
    id: 'gigagas-l1',
    label: 'gigagas L1',
    target: '1 gigagas/sec (~10K TPS) on L1',
    description:
      'Roughly 500× current L1 throughput, reachable by proving blocks rather than asking every node to re-execute them.',
  },
  {
    id: 'teragas-l2',
    label: 'teragas L2',
    target: '1 gigabyte/sec (~10M TPS) across L2s',
    description:
      'Rollups inherit their security from Ethereum by posting data to it, so L1 bandwidth is the ceiling on everything built above.',
  },
  {
    id: 'post-quantum-l1',
    label: 'post quantum L1',
    target: 'Centuries-long cryptographic security',
    description:
      'Move every signature on the critical path onto hash-based cryptography, which quantum computers do not weaken.',
  },
  {
    id: 'private-l1',
    label: 'private L1',
    target: 'Shielded transfers as a built-in',
    description:
      'Privacy that comes with the protocol rather than a contract you have to know to go find.',
  },
];

/**
 * Which client layer(s) an area's work sits in. Carried for `/api/research.json`;
 * the page itself doesn't render it, because CL/DL/EL is jargon for the reader
 * this page is written for and the description says it in words anyway.
 */
export type ResearchLayer = 'CL' | 'DL' | 'EL';

/**
 * What kind of document a link points at. Shown beside every link, because a
 * bare list of titles gives a reader no way to tell a formal spec from someone
 * thinking out loud on a forum.
 */
export type ResearchLinkKind = 'research' | 'spec' | 'notes' | 'site';

export interface ResearchLink {
  label: string;
  /** An outside resource. Exactly one of `url` / `eipId` is set. */
  url?: string;
  /** An EIP Forkcast tracks, rendered as an internal link. */
  eipId?: number;
  /** Required on a `url` link; an `eipId` link is an EIP by construction. */
  kind?: ResearchLinkKind;
}

/** One strawmap headliner, and the entry in an area's `links` that specifies it. */
export interface Headliner {
  /** The strawmap's own name for the box. */
  name: string;
  /** The EIP that specifies it, when one exists. */
  eipId?: number;
  /** The write-up that is the headliner, when there is no EIP yet. */
  url?: string;
}

export interface ResearchArea {
  id: string;
  name: string;
  /** Expansion of an acronym or alias, shown beside the name. */
  alsoKnownAs?: string;
  /** The problem, in one sentence a non-specialist finishes without re-reading. */
  summary: string;
  /** Two to four sentences: what is actually being explored, and why. */
  description: string;
  northStars: NorthStarId[];
  layers: ResearchLayer[];
  /**
   * Strawmap headliners this area carries. A headliner is a proposal prominent
   * enough to anchor a whole upgrade, and the ACD process allows one consensus
   * and one execution headliner per fork — so this marks what could define a
   * fork, not what matters most.
   *
   * It is one specific proposal, never the whole area: Real-Time Proving carries
   * `native rollups`, but EIP-8025 (optional proofs) sits in the same area and is
   * not a headliner. `eipId` / `url` point at the entry in `links` that *is* the
   * headliner, so the page can mark that one row rather than leaving a reader to
   * guess. Both are absent when nothing here links to it: `mandatory 1-of-1 proofs`
   * has neither on the map, and `leanPCS frames` is marked there as having an EIP
   * whose number has not been tracked down. The page names those without claiming
   * anything about whether a write-up exists.
   *
   * Already-shipped headliners (ePBS and BALs in Glamsterdam, FOCIL and frame
   * transactions in Hegotá) are not listed — those forks have scopes, and this
   * page is about what comes after them.
   */
  headliners?: Headliner[];
  links: ResearchLink[];
}

/**
 * Alphabetical by `name`, and a test holds it there. Any other order would be
 * read as a ranking — these are not ordered by priority, likelihood, or how far
 * along they are, because no such ordering exists to report.
 */
export const researchAreas: ResearchArea[] = [
  {
    id: 'data-availability-scaling',
    name: 'Data Availability Scaling',
    summary:
      'Rollups are limited by how much data Ethereum can carry, and the ceiling is far below the teragas target.',
    description:
      'PeerDAS shipped in Fusaka and lets each node verify blob data by sampling a slice of it rather than downloading the whole thing. The research past it is about raising the ceiling further: reconstructing missing blob data across rows as well as columns, broadcasting only what changed between cells instead of whole columns, streaming blobs continuously rather than in per-slot bursts, and eventually retiring blob transactions in favour of a dedicated path. A cheap proof of custody would let the network confirm that nodes really are storing the data they claim to.',
    northStars: ['teragas-l2'],
    layers: ['DL'],
    links: [
      { label: 'RowDAS: Distributed Blob Reconstruction', eipId: 8371 },
      { label: 'Cell-Level Deltas for Data Column Broadcast', eipId: 8136 },
      { label: 'Blob streaming', url: 'https://hackmd.io/@gMH0wL_0Sr69C7I7inO8MQ/B125sCUtZx', kind: 'notes' },
      {
        label: 'Removing blob transactions',
        url: 'https://notes.ethereum.org/@lDtCOFhYRDmCCkD-5cNZyQ/remove-blob-transactions',
        kind: 'notes',
      },
      { label: 'A 0.001 bit proof of custody', url: 'https://ethresear.ch/t/a-0-001-bit-proof-of-custody/7409', kind: 'research' },
    ],
  },
  {
    id: 'decoupled-consensus',
    name: 'Decoupled Consensus',
    summary:
      'Finality is bolted to the slot clock, so faster blocks and faster finality are the same hard problem.',
    description:
      'Proposing a block, attesting to it, and finalizing the chain all happen on one shared rhythm today, which means the 12-second slot sets a floor under every one of them. Decoupled consensus separates the two jobs: blocks keep arriving on their own cadence while the finality vote runs underneath as its own process. That separation is the throughline to one-round finality and to shortening slots without destabilizing anything, and it is the main thing standing between Ethereum and finality measured in seconds.',
    northStars: ['fast-l1'],
    layers: ['CL'],
    headliners: [
      {
        name: 'decoupled consensus',
        url: 'https://ethresear.ch/t/unblocking-faster-finality-with-decoupled-consensus/24527/1',
      },
    ],
    links: [
      {
        label: 'Unblocking faster finality with decoupled consensus',
        url: 'https://ethresear.ch/t/unblocking-faster-finality-with-decoupled-consensus/24527/1',
        kind: 'research',
      },
      {
        label: 'All you need to know about one-round finality',
        url: 'https://notes.ethereum.org/@yannvon/S1wIxIDqbe',
        kind: 'notes',
      },
      { label: 'Fast Confirmation Rule', url: 'https://fastconfirm.it', kind: 'site' },
      { label: 'Quick Slots', eipId: 8198 },
    ],
  },
  {
    id: 'fee-markets',
    name: 'Fee Markets and Pricing',
    summary:
      'Gas is one number standing in for several unrelated resources, so some operations cost far more or less than they burden a node.',
    description:
      'Compute, state access, bandwidth and storage all get billed through a single gas price, which means the gas limit has to be set for whichever resource is tightest and everything else is left on the table. Multidimensional pricing gives each resource its own market so they can be raised independently. Alongside it sit the repricing rounds that correct the worst-mispriced opcodes before the limit rises further, a schedule for raising the gas limit on a predictable curve rather than by negotiation, and in-protocol gas futures that would let users buy execution capacity ahead of time.',
    northStars: ['gigagas-l1'],
    layers: ['EL'],
    links: [
      { label: 'Unified multidimensional fee market', eipId: 7999 },
      { label: 'Exponential Gas Limit Increase', eipId: 7938 },
      { label: 'On in-protocol gas futures', url: 'https://ethresear.ch/t/on-in-protocol-gas-futures/23698', kind: 'research' },
      { label: 'Hegotá repricings analysis', url: 'https://misilva73.github.io/hegota-repricings/', kind: 'site' },
    ],
  },
  {
    id: 'networking',
    name: 'Networking',
    summary:
      'Moving blocks and transactions between nodes limits throughput more than executing them does.',
    description:
      'As blocks grow, the time to propagate one across the network starts eating the slot, and there is no point raising the gas limit past what the network can actually deliver on time. The work here covers getting payloads to peers faster, replacing the patchwork of per-client networking behaviour with one specification every client is held to, sharding the transaction pool so no node has to hold all of it, and aggregating signatures in the mempool before they ever reach a block.',
    northStars: ['gigagas-l1', 'teragas-l2'],
    layers: ['EL', 'DL'],
    links: [
      { label: 'Fast Execution Payload Broadcast', eipId: 8411 },
      { label: 'Ethereum networking specs', url: 'https://netspecs.ethp2p.dev', kind: 'spec' },
      { label: 'In-mempool signature and proof aggregation', eipId: 8288 },
    ],
  },
  {
    id: 'partitioned-binary-tree',
    name: 'Partitioned Binary Tree',
    alsoKnownAs: 'PBT',
    summary:
      'Proving one account exists in Ethereum state takes an awkwardly large proof, blocking both stateless clients and cheap zk proving.',
    description:
      "State lives in a hexary Merkle-Patricia trie, a structure chosen long before anyone needed to prove things about it efficiently. A partitioned binary tree restructures it into a binary layout whose proofs are small and fast to verify. It is the successor to the Verkle tree line of work: Verkle's proofs were smaller still, but rested on elliptic-curve vector commitments that a quantum computer would break, where a binary hash tree stays safe.",
    northStars: ['gigagas-l1', 'post-quantum-l1'],
    layers: ['EL'],
    headliners: [{ name: 'partitioned binary tree', eipId: 8297 }],
    links: [{ label: 'Partitioned Binary Tree', eipId: 8297 }],
  },
  {
    id: 'post-quantum-cryptography',
    name: 'Post-Quantum Cryptography',
    alsoKnownAs: 'the "lean" cryptography work',
    summary:
      'Every signature securing Ethereum would eventually fall to a large enough quantum computer, and replacing them all takes years.',
    description:
      'The replacement is hash-based cryptography, which rests on assumptions quantum computers do not weaken. But hash-based signatures are bigger and slower, so each place a signature appears needs its own design rather than a drop-in swap. The work is proceeding piece by piece under the "lean" umbrella: leanXMSS for validator attestations, leanSPHINCS for transaction signatures, leanDA for data sampling, and leanVM as the proof system they lean on. Post-quantum key registration, already proposed for Hegotá, lets validators publish a quantum-safe key years early so the eventual switch does not need a flag day.',
    northStars: ['post-quantum-l1'],
    layers: ['CL', 'DL', 'EL'],
    headliners: [
      {
        name: 'leanXMSS PQ attestations',
        url: 'https://github.com/leanEthereum/leanSpec/tree/main/src/lean_spec/spec/crypto/xmss',
      },
      { name: 'leanDA PQ sampling', url: 'https://ethresear.ch/t/leanda-design-and-benchmark/25642' },
    ],
    links: [
      { label: 'leanSpec', url: 'https://github.com/leanEthereum/leanSpec', kind: 'spec' },
      {
        label: 'leanXMSS specification',
        url: 'https://github.com/leanEthereum/leanSpec/tree/main/src/lean_spec/spec/crypto/xmss',
        kind: 'spec',
      },
      { label: 'leanVM', url: 'https://github.com/leanEthereum/leanVM', kind: 'spec' },
      { label: 'leanDA: design and benchmark', url: 'https://ethresear.ch/t/leanda-design-and-benchmark/25642', kind: 'research' },
      {
        label: 'Design space for a post-quantum validator key registry',
        url: 'https://ethresear.ch/t/exploring-the-design-space-for-a-post-quantum-public-key-registry-for-ethereum-validators/25040',
        kind: 'research',
      },
    ],
  },
  {
    id: 'privacy',
    name: 'Privacy',
    summary:
      'Every balance and transfer is public to anyone who looks, and today\'s fixes all live outside the protocol.',
    description:
      'The aim is privacy that ships with Ethereum rather than privacy you have to know to go and find. The pieces being explored are an encrypted mempool so a transaction is not readable before it is included, zero-knowledge "wormholes" that let value be burned in one place and reminted in another without a visible link between them, the proof machinery to make such transfers cheap enough to use, and eventually a shielded pool enshrined at the consensus layer rather than deployed as a contract.',
    northStars: ['private-l1'],
    layers: ['EL', 'CL'],
    headliners: [{ name: 'leanPCS frames' }],
    links: [
      { label: 'Zero-Knowledge Wormholes', eipId: 7503 },
      { label: 'LUCID encrypted mempool', eipId: 8184 },
      {
        label: 'The extremely lean chain, phase 2: privacy',
        url: 'https://ethresear.ch/t/the-extremely-lean-chain/25369#p-61091-phase-2-privacy-7',
        kind: 'research',
      },
      {
        label: 'Ephemeral Keys Protocol',
        url: 'https://github.com/RivaLabs-Core/Ephemeral-Keys-Protocol/tree/spec/align-with-implementation',
        kind: 'spec',
      },
    ],
  },
  {
    id: 'proposer-roles',
    name: 'Proposer Roles and Block Building',
    summary:
      'One validator decides what goes in a block, concentrating MEV and censorship power in a single rotating seat.',
    description:
      'ePBS in Glamsterdam and FOCIL in Hegotá begin splitting that seat apart, separating who proposes a block from who builds it and giving a committee the power to force transactions in. The research past them keeps pulling the roles further apart: moving inclusion duty onto attesters, building blocks across a set of parties so none of them sees the whole thing, and keeping the identity of the next proposer secret so there is nobody to bribe or attack in advance.',
    northStars: ['fast-l1'],
    layers: ['CL'],
    links: [
      { label: 'Towards attester-includer separation', url: 'https://ethresear.ch/t/towards-attester-includer-separation/21306/1', kind: 'research' },
      { label: 'Minimal VDF randomness beacon', url: 'https://ethresear.ch/t/minimal-vdf-randomness-beacon/3566', kind: 'research' },
      { label: 'Enshrined Proposer-Builder Separation', eipId: 7732 },
      { label: 'Fork-choice enforced Inclusion Lists (FOCIL)', eipId: 7805 },
    ],
  },
  {
    id: 'real-time-proving',
    name: 'Real-Time Proving',
    alsoKnownAs: 'zkEVM, native rollups',
    summary:
      'If every block arrived with a proof it executed correctly, verifying Ethereum would cost almost nothing regardless of the work in it.',
    description:
      'This is the mechanism the gigagas target depends on: proving is expensive and specialized, verification is cheap and universal, so the two get separated. The path runs from pinning down a canonical assembly target for the EVM, through proofs that clients may optionally attach and check, to proofs every block must carry. Native rollups fall out the other end: L2s that reuse L1\'s own proven EVM instead of maintaining a separate implementation. The same technique applies to the consensus layer, where real-time proofs would make light clients genuinely light.',
    northStars: ['gigagas-l1'],
    layers: ['EL', 'CL'],
    headliners: [{ name: 'mandatory 1-of-1 proofs' }, { name: 'native rollups', eipId: 8079 }],
    links: [
      { label: 'Optional Execution Proofs', eipId: 8025 },
      { label: 'Native rollups', eipId: 8079 },
      { label: 'evm-asm (Verified zkEVM)', url: 'https://github.com/Verified-zkEVM/evm-asm', kind: 'spec' },
      { label: 'cl-asm light client proofs', url: 'https://notes.ethereum.org/A47R_en0TVqAiE_5c_r4bA?view', kind: 'notes' },
    ],
  },
  {
    id: 'state-growth',
    name: 'State Growth and Statelessness',
    summary:
      'Every node stores the entire state and it only grows, so the cost of running one rises even when the chain does not get busier.',
    description:
      'The direction of travel is to stop requiring any single node to hold everything. Validity-only partial statelessness lets a node verify blocks while holding just a slice of state. Decentralized state goes further and spreads the full set across the network the way data availability sampling spreads blobs. What the final arrangement looks like, the "endgame state", is still an open question rather than a design anyone is building towards.',
    northStars: ['gigagas-l1'],
    layers: ['EL'],
    links: [
      {
        label: 'A pragmatic path towards validity-only partial statelessness',
        url: 'https://ethresear.ch/t/a-pragmatic-path-towards-validity-only-partial-statelessness-vops/22236',
        kind: 'research',
      },
      {
        label: 'Hyper-scaling state by creating new forms of state',
        url: 'https://ethresear.ch/t/hyper-scaling-state-by-creating-new-forms-of-state/24052',
        kind: 'research',
      },
      { label: 'state-asm', url: 'https://notes.ethereum.org/@jszADHO8R565o4crlTTXhg/Hki4gr0Dfl', kind: 'notes' },
    ],
  },
];

export const STRAWMAP_URL = 'https://strawmap.org';
