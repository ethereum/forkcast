/**
 * Cartographoor keys a network as `{series}-{kind}-{version}`. Most are devnets,
 * but a series also spins up shadow forks: a copy of a live network replayed
 * against the new fork, named for the network it shadows (`glamsterdam-msf-2` is
 * the second Glamsterdam mainnet shadow fork).
 *
 * A shadow fork belongs to its series but is not a devnet in the series' count —
 * `glamsterdam-msf-2` must never read as Glamsterdam devnet 2 — so every consumer
 * parses keys through here rather than matching a version off the end.
 */

export type NetworkKind = 'devnet' | 'msf' | 'sepsf' | 'holsf' | 'gsf';

export type ShadowForkKind = Exclude<NetworkKind, 'devnet'>;

const SHADOW_FORK_LABELS: Record<ShadowForkKind, string> = {
  msf: 'Mainnet shadow fork',
  sepsf: 'Sepolia shadow fork',
  holsf: 'Holešky shadow fork',
  gsf: 'Goerli shadow fork',
};

const NETWORK_KEY_PATTERN = new RegExp(
  `^(.+)-(devnet|${Object.keys(SHADOW_FORK_LABELS).join('|')})-(\\d+)$`,
);

export interface ParsedNetworkKey {
  /** The series this network belongs to, e.g. "glamsterdam". */
  categoryKey: string;
  kind: NetworkKind;
  version: number;
}

/**
 * Split a network key into its series, kind and version, or null for a key that
 * follows no known shape — a public network ("mainnet"), or a one-off like
 * "dencun-devnet-p". Those belong to no series and are left to their own routes.
 */
export function parseNetworkKey(key: string): ParsedNetworkKey | null {
  const match = key.match(NETWORK_KEY_PATTERN);
  if (!match) return null;
  return {
    categoryKey: match[1],
    kind: match[2] as NetworkKind,
    version: parseInt(match[3], 10),
  };
}

/** Whether a key belongs to the given series, whatever kind of network it is. */
export function isSeriesMember(key: string, categoryKey: string): boolean {
  return parseNetworkKey(key)?.categoryKey === categoryKey;
}

/** Human label for a shadow fork ("Mainnet shadow fork"), or null for a devnet. */
export function shadowForkLabel(key: string): string | null {
  const parsed = parseNetworkKey(key);
  if (!parsed || parsed.kind === 'devnet') return null;
  return SHADOW_FORK_LABELS[parsed.kind];
}
