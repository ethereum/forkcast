// Forks with a public headliner tier maker at `/rank/{fork}`. Adding one here
// gives it a tier-maker page and an upgrade-page header link automatically; keep
// it in sync with the forks that have headliner candidates in the EIP data.
// `deadline`: optional submission deadline shown in the tier maker's info panel.
interface TierMakerConfig {
  deadline?: string;
}

const TIER_MAKER_FORKS: Record<string, TierMakerConfig> = {
  hegota: { deadline: 'February 4th, 2025' },
  glamsterdam: {},
};

/** Whether a fork (by upgrade id, case-insensitive) has a tier maker. */
export const forkHasTierMaker = (forkName: string): boolean =>
  forkName.toLowerCase() in TIER_MAKER_FORKS;

/** Lowercase upgrade ids of every fork that has a tier maker. */
export const getTierMakerForkIds = (): string[] => Object.keys(TIER_MAKER_FORKS);

/** Tier-maker config for a fork, or undefined when it has none. */
export const getTierMakerConfig = (forkName: string): TierMakerConfig | undefined =>
  TIER_MAKER_FORKS[forkName.toLowerCase()];
