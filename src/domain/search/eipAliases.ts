/**
 * Community acronyms that don't appear in an EIP's own prose.
 *
 * "ePBS" is how everyone refers to EIP-7732, but the string occurs nowhere in
 * its title, description or summary — only in its ethereum-magicians URL. Same
 * for "BAL" (7928) and "BPO" (7892). Without this map those searches either
 * return nothing or return every EIP that happens to contain "bal" inside
 * "balance".
 *
 * Aliases are matched whole-term, never as substrings. Only add an acronym here
 * when the EIP can't already be found by it.
 */
export const EIP_ALIASES: Record<number, string[]> = {
  7732: ['epbs'],
  7892: ['bpo'],
  7928: ['bal', 'bals'],
};

export function matchesAlias(eipId: number, queryTerms: string[]): boolean {
  const aliases = EIP_ALIASES[eipId];
  if (!aliases) return false;
  return queryTerms.some((term) => aliases.includes(term));
}
