/**
 * The eight `stakeholderImpacts` keys, in the order they are authored and
 * rendered. Shared by the EIP Analysis tab, the /champions guide, and the
 * champion data builder so the set can never drift between them.
 */
export type StakeholderKey =
  | 'endUsers'
  | 'appDevs'
  | 'walletDevs'
  | 'toolingInfra'
  | 'layer2s'
  | 'stakersNodes'
  | 'clClients'
  | 'elClients';

export interface Stakeholder {
  key: StakeholderKey;
  /** Heading shown wherever an impact is rendered. */
  label: string;
  /** Who the key refers to, for authoring guidance. */
  audience: string;
}

export const stakeholders: Stakeholder[] = [
  { key: 'endUsers', label: 'End Users', audience: 'People transacting on Ethereum' },
  { key: 'appDevs', label: 'Application Developers', audience: 'Smart contract and dapp developers' },
  { key: 'walletDevs', label: 'Wallet Developers', audience: 'Wallet software maintainers' },
  {
    key: 'toolingInfra',
    label: 'Tooling / Infrastructure',
    audience: 'Indexers, explorers, RPC providers, analytics',
  },
  { key: 'layer2s', label: 'Layer 2s', audience: 'Rollups and L2 teams' },
  { key: 'stakersNodes', label: 'Stakers & Node Operators', audience: 'Validators and node operators' },
  { key: 'clClients', label: 'CL Client Developers', audience: 'Consensus layer client teams' },
  { key: 'elClients', label: 'EL Client Developers', audience: 'Execution layer client teams' },
];

export const stakeholderKeys = stakeholders.map((s) => s.key);

export const stakeholderLabels: Record<string, string> = Object.fromEntries(
  stakeholders.map((s) => [s.key, s.label]),
);
