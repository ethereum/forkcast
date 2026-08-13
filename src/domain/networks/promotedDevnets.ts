/**
 * Devnets that are actually being run as public testnets. Cartographoor has no
 * signal for this — glamsterdam-devnet-8 is an ordinary series entry there — and
 * the scraped spec title is regenerated on every re-scrape, so the public name
 * lives here.
 */
export interface PromotedDevnet {
  /** Public-facing name announced on ACD calls. */
  name: string;
  /** One-line descriptor for the index card. */
  label: string;
  /** Extra search terms — the ASCII spelling clients use for `--network`. */
  searchAliases: string[];
}

export const PROMOTED_DEVNETS: Record<string, PromotedDevnet> = {
  'glamsterdam-devnet-8': {
    name: 'Platåberget',
    label: 'Glamsterdam public testnet',
    searchAliases: ['plataberget'],
  },
};

export function getPromotedDevnet(id: string): PromotedDevnet | null {
  return PROMOTED_DEVNETS[id] ?? null;
}
