/**
 * Resolves a call reference like "acdt/66" (as stored in EIP status/presentation
 * history) to the canonical `/calls/{series}/{number}` link the static build emits.
 *
 * Call numbers in EIP data are unpadded, but emitted call pages use a zero-padded
 * number (e.g. acdt/066), so the number is normalized here. This is the single
 * source of truth for these links — keeping every call site in step with the
 * emitted route set (an unpadded link like /calls/acdt/66 would 404).
 */
export interface CallReference {
  /** Human-readable label, e.g. "ACDT #66". */
  display: string;
  /** Root-relative link to the emitted call page, optionally with a timestamp hash. */
  link: string;
}

export function formatCallReference(call: string, timestamp?: number): CallReference {
  const [prefix, number] = call.split('/');
  const paddedNumber = number.padStart(3, '0');
  const baseLink = `/calls/${prefix}/${paddedNumber}`;
  return {
    display: `${prefix.toUpperCase()} #${number}`,
    link: timestamp ? `${baseLink}#t=${timestamp}` : baseLink,
  };
}
