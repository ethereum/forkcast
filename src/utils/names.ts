/**
 * "Felix Lange" → "Felix L.", so a column of champions stays one name per line.
 *
 * Only the last word is shortened: the particles in "Jérôme de Tychey" are part of how the
 * surname is written, and dropping them would leave a name nobody uses. A handle with no
 * surname ("lightclient") has nothing to shorten, and neither has a name whose last word is
 * already an initial.
 */
export function abbreviateLastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;

  // Codepoints rather than UTF-16 units, so an initial is never half a character.
  const lastName = Array.from(parts[parts.length - 1].replace(/\.$/, ''));
  if (lastName.length < 2) return name;

  return [...parts.slice(0, -1), `${lastName[0]}.`].join(' ');
}
