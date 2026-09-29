/**
 * Deterministic half of the per-call EIP mention index.
 *
 * `extractEipCandidates` finds every EIP number the transcript and chat actually
 * contain; `validateMentions` checks the model's grouped output against them.
 * Both are pure so they can be tested without an API key.
 */

// One pass, so a prefixed number can never also be counted as a bare one: regex
// matches don't overlap, and "EIP-8061" is consumed whole.
const MENTION_RE = /\b(?:(EIP|ERC|RIP)[\s-]?)?(\d{1,5})\b/gi;

export const WEIGHTS = new Set(['discussed', 'mentioned']);

const TIMESTAMP_RE = /^\d{2}:\d{2}:\d{2}$/;

/**
 * Drop WebVTT scaffolding. Cue index lines are bare integers and timecode lines
 * are nothing but digits, so scanning them yields candidates that were never
 * spoken.
 */
function stripVttScaffolding(text) {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed === 'WEBVTT' || trimmed === '') return false;
      if (/^\d+$/.test(trimmed)) return false;
      if (trimmed.includes('-->')) return false;
      return true;
    })
    .join('\n');
}

export function timestampToSeconds(timestamp) {
  const parts = String(timestamp).split(':');
  if (parts.length !== 3) return 0;
  const [hours, minutes, seconds] = parts.map((p) => parseFloat(p));
  return hours * 3600 + minutes * 60 + seconds;
}

/** Latest cue end time in a VTT file, in seconds. Null when there are no cues. */
export function lastCueSeconds(vtt) {
  let last = null;
  for (const match of vtt.matchAll(/-->\s*(\d{2}:\d{2}:\d{2})(?:\.\d+)?/g)) {
    const seconds = timestampToSeconds(match[1]);
    if (last === null || seconds > last) last = seconds;
  }
  return last;
}

/**
 * True for a bare number that reads as a quantity rather than an EIP id, even
 * though the corpus happens to carry that id.
 *
 * Only years remain: a bare "2026" occurs in 62 of the transcripts against
 * EIP-2026, a dead state-rent draft. Round sub-1000 numbers used to be handled
 * here too, but the four-digit floor above now rejects them outright. Genuine
 * bare mentions like 1559, 4788, 4844 and 2780 are untouched.
 */
function readsAsQuantity(id) {
  return id >= 2015 && id <= 2035; // a spoken year
}

/**
 * True when the match sits inside a URL-ish token. PR, issue and forum-thread
 * numbers are nearly always pasted as links, so this separates "someone linked
 * github.com/.../pull/12299" from "someone said 12299 out loud" — a mechanical
 * signal the model cannot talk itself out of.
 */
function isInsideUrl(body, index, length) {
  let start = index;
  let end = index + length;
  while (start > 0 && !/\s/.test(body[start - 1])) start--;
  while (end < body.length && !/\s/.test(body[end])) end++;
  return /https?:\/\/|github\.com|ethresear\.ch|magicians\.org|\/pull\/|\/issues\//.test(
    body.slice(start, end),
  );
}

/** True when the digits sit inside a comma-grouped or decimal number. */
function isGroupedNumberFragment(body, index, length) {
  const before = body[index - 1];
  const after = body[index + length];
  if (before === ',' || before === '.') return true;
  if ((after === ',' || after === '.') && /\d/.test(body[index + length + 1] ?? '')) return true;
  return false;
}

/**
 * Every EIP number with a textual anchor in `text`, in two tiers.
 *
 * Strong: an `EIP-`/`ERC-`/`RIP-` prefixed number, or a bare number that is a
 * known EIP id. Speakers say "8047" far more often than "EIP-8047", so bare
 * numbers have to count — but only against the corpus, or every gas figure in
 * the call becomes a candidate.
 *
 * Weak (`weak: true`): a bare 4-5 digit number the corpus doesn't know. Mostly
 * gas figures and slot numbers, but it is also the only way a newly proposed EIP
 * shows up — 8047 and 8294 were both real EIPs on ACDE 236 that Forkcast doesn't
 * carry yet. These are offered to the model, which has the surrounding sentence
 * to judge them by, and they never raise an unreported-candidate warning.
 *
 * `urlCount` is how many of those occurrences sat inside a link.
 *
 * @returns {Map<number, {count: number, explicit: boolean, weak: boolean, urlCount: number}>}
 */
export function extractEipCandidates(text, knownIds = new Set()) {
  const body = stripVttScaffolding(text);
  const candidates = new Map();

  for (const match of body.matchAll(MENTION_RE)) {
    const explicit = Boolean(match[1]);
    const digits = match[2];
    const id = Number(digits);
    let weak = false;

    if (!explicit) {
      // "30,000" and "0.512" fragment into 000 and 512 without this.
      if (isGroupedNumberFragment(body, match.index, digits.length)) continue;
      // A leading zero means it isn't an EIP reference — nobody says "EIP-001".
      // ACDC calls say "001 or 002" constantly: those are validator withdrawal
      // credential types, and they resolve to the very real EIP-1 and EIP-2.
      if (digits[0] === '0') continue;
      // Two digits or fewer is hopeless: EIP-1 through EIP-8 exist, so every
      // counted item in the call would become a candidate.
      if (digits.length < 3) continue;
      // An unknown id this short is noise; a real proposal that new is 4-5 digits.
      if (digits.length === 3 && !knownIds.has(id)) continue;
      if (!knownIds.has(id)) {
        weak = true;
      } else if (digits.length === 3 || readsAsQuantity(id)) {
        // Weak, not strong. Measured across every call with a transcript: of the
        // sub-1000 ids appearing as a bare number, all are noise — 100 alone
        // lands in 55 calls ("100%", "off by 100"), plus 150, 233, 606, 627,
        // 908 — while every genuine one arrives prefixed (EIP-161, EIP-684,
        // ERC-20). Demoted rather than dropped so that a genuine bare "684" is
        // still offered to the model instead of vanishing, at a measured cost of
        // ~1 extra unconfirmed number per call.
        weak = true;
      }
    }

    const fromUrl = isInsideUrl(body, match.index, match[0].length);
    const existing = candidates.get(id);
    if (existing) {
      existing.count += 1;
      existing.explicit ||= explicit;
      existing.weak &&= weak;
      if (fromUrl) existing.urlCount += 1;
    } else {
      candidates.set(id, { count: 1, explicit, weak, urlCount: fromUrl ? 1 : 0 });
    }
  }

  return new Map([...candidates].sort((a, b) => a[0] - b[0]));
}

/**
 * Check a generated eip_mentions payload.
 *
 * Errors mean nothing is written. Warnings are written and handed to the human
 * pass — a reported EIP with no anchor is usually fabricated but can be a
 * spelled-out number, and an unreported candidate is as often a gas figure as a
 * missed mention.
 *
 * @returns {{errors: string[], warnings: string[]}}
 */
export function validateMentions(data, { knownIds = new Set(), candidates = new Map(), lastCue = null } = {}) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== 'object') {
    return { errors: ['Output is not an object'], warnings };
  }
  if (!data.meeting) errors.push("Missing 'meeting' field");
  if (!Array.isArray(data.eips)) {
    errors.push("'eips' must be an array");
    return { errors, warnings };
  }
  // An empty result is a legitimate answer, not a schema failure: a testing call
  // can genuinely name no EIPs. The caller decides what to do with it, and any
  // strong candidate the model passed over still raises its own warning below.

  const seen = new Map();

  for (let i = 0; i < data.eips.length; i++) {
    const entry = data.eips[i];
    const prefix = `eips[${i}]`;

    if (!Number.isInteger(entry?.eip)) {
      errors.push(`${prefix}: 'eip' must be an integer (got ${JSON.stringify(entry?.eip)})`);
      continue;
    }
    const id = entry.eip;

    if (seen.has(id)) {
      errors.push(`${prefix}: EIP-${id} already appears at eips[${seen.get(id)}] — grouping failed`);
    }
    seen.set(id, i);

    if (!entry.summary) errors.push(`${prefix}: EIP-${id} missing or empty 'summary'`);
    if (!WEIGHTS.has(entry.weight)) {
      errors.push(`${prefix}: EIP-${id} 'weight' must be discussed|mentioned (got ${JSON.stringify(entry.weight)})`);
    }

    if (!Array.isArray(entry.moments) || entry.moments.length === 0) {
      errors.push(`${prefix}: EIP-${id} 'moments' must be a non-empty array`);
    } else {
      for (let j = 0; j < entry.moments.length; j++) {
        const moment = entry.moments[j];
        const momentPrefix = `${prefix}.moments[${j}]`;
        if (!TIMESTAMP_RE.test(moment?.timestamp || '')) {
          errors.push(`${momentPrefix}: 'timestamp' must match HH:MM:SS (got '${moment?.timestamp}')`);
          continue;
        }
        if (!moment.context) errors.push(`${momentPrefix}: missing or empty 'context'`);
        if (lastCue !== null && timestampToSeconds(moment.timestamp) > lastCue) {
          warnings.push(
            `EIP-${id} moment ${moment.timestamp} is past the end of the transcript`,
          );
        }
      }
    }

    if (!candidates.has(id)) {
      warnings.push(`EIP-${id} has no textual anchor in the transcript or chat — likely fabricated`);
    }
    if (knownIds.size > 0 && !knownIds.has(id)) {
      warnings.push(`EIP-${id} is not in src/data/eips/ — a garble, or a gap in the corpus`);
    }
  }

  // A typo the model *accepted* never reaches the loop below, which only checks
  // candidates it declined. Flag a reported id that the corpus doesn't carry when
  // another reported id sits one digit away: ACDE 236 indexed both 8254 ("Cap
  // Deposit Requests Per Block") and 8294, three minutes apart, same speaker
  // proposing the same thing. Pairs that are both tracked (8037/8038, 8253/8254)
  // are left alone — those legitimately co-occur.
  for (const [id] of seen) {
    if (knownIds.size > 0 && knownIds.has(id)) continue;
    const twin = [...seen.keys()].find((other) => other !== id && oneDigitOff(id, other));
    if (twin !== undefined) {
      warnings.push(
        `EIP-${id} is not in src/data/eips/ and is one digit from EIP-${twin}, which this file also indexes — ` +
          `check whether it is a typo for ${twin} before keeping it as a separate entry`,
      );
    }
  }

  const unreportedWeak = [];
  for (const [id, { count, weak }] of candidates) {
    if (seen.has(id)) continue;

    // A near-miss gets its own line whether it is weak or strong. Left in the
    // collapsed list below it reads as a candidate to go and add, which is
    // exactly the wrong move when it is a typo of one already in the file.
    const nearMiss = [...seen.keys()].find((reported) => oneDigitOff(id, reported));
    if (nearMiss !== undefined) {
      warnings.push(
        `${id} appears ${count}x and is one digit from EIP-${nearMiss}, which this call reported — ` +
          `read the surrounding lines before treating it as a separate EIP, it is usually a typo`,
      );
      continue;
    }

    // One line for all the weak ones. A warning each would be a dozen per call
    // and would bury the real findings, but they can't go unmentioned either:
    // a newly proposed EIP is indistinguishable from a gas figure to the scan,
    // and the model skips numbers it doesn't recognize.
    if (weak) unreportedWeak.push(id);
    else warnings.push(`EIP-${id} appears ${count}x in the inputs but was not reported`);
  }
  if (unreportedWeak.length > 0) {
    warnings.push(
      `${unreportedWeak.length} unrecognized number(s) not reported — check any that look like an EIP id: ${unreportedWeak.join(', ')}`,
    );
  }

  return { errors, warnings };
}

/**
 * True when two ids differ by exactly one digit in the same position.
 *
 * A spoken or typed EIP number one digit off from one the call actually
 * discussed is far more often a typo than a second EIP: ACDC 187's chat says
 * "redo that list with 8441 PFId", and the reply six seconds later names
 * EIP-8411, which that call PFI'd.
 */
function oneDigitOff(a, b) {
  const x = String(a);
  const y = String(b);
  if (x.length !== y.length) return false;
  let differences = 0;
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== y[i] && ++differences > 1) return false;
  }
  return differences === 1;
}

/** Chronological order: moments within an entry, then entries by first moment. */
export function sortMentions(eips) {
  for (const entry of eips) {
    if (Array.isArray(entry.moments)) {
      entry.moments.sort((a, b) => timestampToSeconds(a.timestamp) - timestampToSeconds(b.timestamp));
    }
  }
  return eips.sort(
    (a, b) => timestampToSeconds(a.moments?.[0]?.timestamp) - timestampToSeconds(b.moments?.[0]?.timestamp),
  );
}
