export const ALL_CLIENT_TEAMS = [
  // Execution Layer teams (alphabetized)
  { name: "Besu", type: "EL" as const },
  { name: "Geth", type: "EL" as const },
  { name: "Nethermind", type: "EL" as const },
  { name: "Reth", type: "EL" as const },
  // Both EL & CL teams
  { name: "Erigon", type: "Both" as const },
  // Consensus Layer teams (alphabetized)
  { name: "Grandine", type: "CL" as const },
  { name: "Lighthouse", type: "CL" as const },
  { name: "Lodestar", type: "CL" as const },
  { name: "Nimbus", type: "CL" as const },
  { name: "Prysm", type: "CL" as const },
  { name: "Teku", type: "CL" as const },
];
