import { describe, expect, it } from 'vitest';

import {
  extractEipCandidates,
  lastCueSeconds,
  sortMentions,
  validateMentions,
} from './lib/eip-mentions.mjs';

const KNOWN = new Set([161, 4337, 7560, 8037, 8061]);

const VTT = `WEBVTT

1
00:00:14.220 --> 00:00:15.640
Ansgar Dietrichs: Hello, hello.

2
00:12:34.000 --> 00:12:38.100
Barnabas: We also added EIP 8061 on the CL side.

3
00:41:02.500 --> 00:41:07.000
nixo: 8037 and 8061 are stable enough to SFI.
`;

const mention = (overrides = {}) => ({
  eip: 8061,
  weight: 'discussed',
  summary: 'Added to devnet 2 on the CL side.',
  moments: [{ timestamp: '00:12:34', context: 'Barnabas reported it went in on the CL side.' }],
  ...overrides,
});

const payload = (eips) => ({ meeting: 'ACDE #236 - 2026-05-07', eips });

describe('extractEipCandidates', () => {
  it('ignores VTT cue indices and timecodes', () => {
    // 1, 2, 3 are cue indices; the timecodes are full of 3-5 digit runs.
    const scaffoldingOnly = 'WEBVTT\n\n1\n00:00:14.220 --> 00:00:15.640\n\n8061\n';
    expect([...extractEipCandidates(scaffoldingOnly, KNOWN).keys()]).toEqual([]);
  });

  it('matches every prefixed spelling', () => {
    const text = 'EIP-8061, EIP 8037, eip8061, ERC-4337 and RIP-7560 came up.';
    expect([...extractEipCandidates(text, new Set()).keys()]).toEqual([4337, 7560, 8037, 8061]);
  });

  it('keeps a prefixed id we do not track', () => {
    expect(extractEipCandidates('EIP-8047 was deprioritized', KNOWN).has(8047)).toBe(true);
  });

  it('treats a bare known id as a strong candidate and an unknown one as weak', () => {
    const candidates = extractEipCandidates('8061 needs 4212 gas', KNOWN);
    expect(candidates.get(8061).weak).toBe(false);
    expect(candidates.get(4212).weak).toBe(true);
  });

  it('demotes a bare sub-1000 id to the weak tier rather than dropping it', () => {
    // Measured across every call with a transcript: every sub-1000 id that shows
    // up as a bare number is noise ("100%", "off by 150", "ACDE 233"), while the
    // ones genuinely under discussion always carry a prefix. Kept as weak so a
    // genuine bare "684" is still offered to the model.
    const known = new Set([2, 3, 100, 161, 233, 627, 684]);
    const c = extractEipCandidates('agreed on ACDE 233, saw 100% pass, and 684 collisions', known);
    expect([...c.keys()].sort((a, b) => a - b)).toEqual([100, 233, 684]);
    for (const id of [100, 233, 684]) expect(c.get(id).weak).toBe(true);
  });

  it('drops a bare two-digit number and an unknown three-digit one', () => {
    const c = extractEipCandidates('we merged 3 PRs and saw 999 blocks', new Set([3]));
    expect([...c.keys()]).toEqual([]);
  });

  it('still takes a sub-1000 EIP when it carries its prefix', () => {
    const known = new Set([20, 161, 684]);
    const c = extractEipCandidates('EIP-161 and EIP-684 and ERC-20 came up', known);
    expect([...c.keys()]).toEqual([20, 161, 684]);
  });

  it('demotes a spoken year to the weak tier', () => {
    // EIP-2026 is a real id, but a bare "2026" shows up in 62 of the transcripts
    // as the year. Bare sub-1000 ids land in the same tier.
    const known = new Set([100, 161, 1559, 2026, 2780]);
    const candidates = extractEipCandidates('off by 100 in 2026; see 161, 1559 and 2780', known);
    expect(candidates.get(100).weak).toBe(true);
    expect(candidates.get(161).weak).toBe(true);
    expect(candidates.get(2026).weak).toBe(true);
    // Genuine bare mentions are untouched.
    expect(candidates.get(1559).weak).toBe(false);
    expect(candidates.get(2780).weak).toBe(false);
  });

  it('keeps a quantity-shaped id strong when it is EIP-prefixed', () => {
    expect(extractEipCandidates('EIP-100 changed difficulty', new Set([100])).get(100).weak).toBe(false);
  });

  it('rejects a bare number with a leading zero', () => {
    // ACDC 187: "people to switch to 001 or 002" — validator withdrawal
    // credential types, which resolve to the real EIP-1 and EIP-2.
    const known = new Set([1, 2, 8, 8365]);
    const candidates = extractEipCandidates('switch to 001 or 002 before 8365', known);
    expect([...candidates.keys()]).toEqual([8365]);
  });

  it('still honours an explicitly prefixed zero-padded id', () => {
    expect(extractEipCandidates('see EIP-001', new Set([1])).has(1)).toBe(true);
  });

  it('offers an unrecognized 4-digit number as a weak candidate', () => {
    // 8047 was a real EIP on ACDE 236 that the corpus doesn't carry, said only
    // as a bare number.
    const candidates = extractEipCandidates('8047 was the second lowest prioritized', KNOWN);
    expect(candidates.get(8047)).toEqual({ count: 1, explicit: false, weak: true, urlCount: 0 });
  });

  it('does not split comma-grouped or decimal numbers into candidates', () => {
    const candidates = extractEipCandidates('a 30,000 gas floor and 0.512 seconds', KNOWN);
    expect([...candidates.keys()]).toEqual([]);
  });

  it('counts a prefixed mention once, not twice', () => {
    expect(extractEipCandidates('EIP-8061', KNOWN).get(8061)).toEqual({ count: 1, explicit: true, weak: false, urlCount: 0 });
  });

  it('accumulates counts and promotes explicit across a real transcript', () => {
    const candidates = extractEipCandidates(VTT, KNOWN);
    expect(candidates.get(8061)).toEqual({ count: 2, explicit: true, weak: false, urlCount: 0 });
    expect(candidates.get(8037)).toEqual({ count: 1, explicit: false, weak: false, urlCount: 0 });
  });
});

describe('URL context', () => {
  it('counts occurrences that sit inside a link', () => {
    // EIP-5680 exists, so a consensus-specs PR link resolves to a corpus title
    // and looks like a confirmed mention unless link context is carried through.
    const text = 'see https://github.com/ethereum/consensus-specs/pull/5680 for details';
    expect(extractEipCandidates(text, new Set([5680])).get(5680)).toEqual({
      count: 1,
      explicit: false,
      weak: false,
      urlCount: 1,
    });
  });

  it('does not count a spoken number as a link', () => {
    expect(extractEipCandidates('we agreed on that in 8037', new Set([8037])).get(8037).urlCount).toBe(0);
  });

  it('counts a mixed number partially', () => {
    const text = 'PR https://github.com/ethereum/EIPs/pull/8037 implements 8037 properly';
    const c = extractEipCandidates(text, new Set([8037])).get(8037);
    expect(c.count).toBe(2);
    expect(c.urlCount).toBe(1);
  });
});

describe('lastCueSeconds', () => {
  it('returns the latest cue end', () => {
    expect(lastCueSeconds(VTT)).toBe(41 * 60 + 7);
  });

  it('returns null without cues', () => {
    expect(lastCueSeconds('WEBVTT\n')).toBeNull();
  });
});

describe('validateMentions', () => {
  const candidates = extractEipCandidates(VTT, KNOWN);
  const opts = { knownIds: KNOWN, candidates, lastCue: lastCueSeconds(VTT) };

  it('accepts a well-formed payload', () => {
    const { errors } = validateMentions(
      payload([mention(), mention({ eip: 8037, weight: 'mentioned', moments: [{ timestamp: '00:41:02', context: 'Named in the SFI list.' }] })]),
      opts,
    );
    expect(errors).toEqual([]);
  });

  it('accepts an empty result — a testing call can genuinely name no EIPs', () => {
    const { errors } = validateMentions({ meeting: 'ACDT #098', eips: [] }, opts);
    expect(errors).toEqual([]);
  });

  it('still warns about strong candidates when the result is empty', () => {
    const { warnings } = validateMentions({ meeting: 'ACDT #098', eips: [] }, opts);
    expect(warnings.some(w => w.includes('EIP-8061 appears'))).toBe(true);
  });

  it('rejects a non-array eips field', () => {
    const { errors } = validateMentions({ meeting: 'x', eips: null }, opts);
    expect(errors).toEqual(["'eips' must be an array"]);
  });

  it('rejects the same EIP appearing twice', () => {
    const { errors } = validateMentions(payload([mention(), mention()]), opts);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/already appears/);
  });

  it('rejects an unknown weight', () => {
    const { errors } = validateMentions(payload([mention({ weight: 'supportive' })]), opts);
    expect(errors[0]).toMatch(/'weight' must be discussed\|mentioned/);
  });

  it('rejects an HH:MM timestamp', () => {
    const { errors } = validateMentions(
      payload([mention({ moments: [{ timestamp: '12:34', context: 'x' }] })]),
      opts,
    );
    expect(errors[0]).toMatch(/must match HH:MM:SS/);
  });

  it('rejects empty moments', () => {
    const { errors } = validateMentions(payload([mention({ moments: [] })]), opts);
    expect(errors[0]).toMatch(/'moments' must be a non-empty array/);
  });

  it('warns without erroring on an EIP with no anchor', () => {
    const { errors, warnings } = validateMentions(payload([mention({ eip: 7702 })]), opts);
    expect(errors).toEqual([]);
    expect(warnings).toContain('EIP-7702 has no textual anchor in the transcript or chat — likely fabricated');
  });

  it('warns without erroring on an untracked EIP', () => {
    const anchored = { ...opts, candidates: new Map([[8047, { count: 1, explicit: true }]]) };
    const { errors, warnings } = validateMentions(payload([mention({ eip: 8047 })]), anchored);
    expect(errors).toEqual([]);
    expect(warnings.some(w => w.includes('EIP-8047 is not in src/data/eips/'))).toBe(true);
  });

  it('warns about a strong candidate the model never reported', () => {
    const { warnings } = validateMentions(payload([mention()]), opts);
    expect(warnings).toContain('EIP-8037 appears 1x in the inputs but was not reported');
  });

  it('flags an untracked reported EIP one digit from another reported EIP', () => {
    // ACDE 236 indexed both 8254 ("Cap Deposit Requests Per Block") and 8294,
    // three minutes apart, the same speaker proposing the same thing.
    const opts2 = { ...opts, knownIds: new Set([8254]), candidates: new Map([[8254, { count: 1, explicit: true, weak: false, urlCount: 0 }], [8294, { count: 1, explicit: false, weak: true, urlCount: 0 }]]) };
    const { warnings } = validateMentions(payload([mention({ eip: 8254 }), mention({ eip: 8294 })]), opts2);
    expect(warnings.some(w => w.includes('EIP-8294 is not in src/data/eips/ and is one digit from EIP-8254'))).toBe(true);
  });

  it('leaves two tracked neighbours alone', () => {
    // 8037 and 8038 are both real and routinely discussed on the same call.
    const opts2 = { ...opts, knownIds: new Set([8037, 8038]), candidates: new Map([[8037, { count: 1, explicit: true, weak: false, urlCount: 0 }], [8038, { count: 1, explicit: true, weak: false, urlCount: 0 }]]) };
    const { warnings } = validateMentions(payload([mention({ eip: 8037 }), mention({ eip: 8038 })]), opts2);
    expect(warnings.filter(w => w.includes('one digit from'))).toEqual([]);
  });

  it('flags a candidate one digit from a reported EIP as a likely typo', () => {
    // ACDC 187: chat said "redo that list with 8441 PFId"; the reply six seconds
    // later names EIP-8411, which that call PFI'd.
    const opts2 = {
      ...opts,
      candidates: new Map([
        [8061, { count: 1, explicit: true, weak: false, urlCount: 0 }],
        [8441, { count: 1, explicit: false, weak: true, urlCount: 0 }],
      ]),
    };
    const { errors, warnings } = validateMentions(
      payload([mention({ eip: 8061 }), mention({ eip: 8411 })]),
      opts2,
    );
    expect(errors).toEqual([]);
    expect(warnings.some(w => w.includes('8441 appears 1x and is one digit from EIP-8411'))).toBe(true);
    // and it must not also appear in the collapsed "go look at these" list
    expect(warnings.some(w => w.includes('unrecognized number(s) not reported'))).toBe(false);
  });

  it('collapses unreported weak candidates into one warning', () => {
    const weakOnly = {
      ...opts,
      candidates: new Map([
        [8061, { count: 1, explicit: true, weak: false, urlCount: 0 }],
        [8047, { count: 3, explicit: false, weak: true }],
        [11605, { count: 1, explicit: false, weak: true, urlCount: 0 }],
      ]),
    };
    const { warnings } = validateMentions(payload([mention()]), weakOnly);
    expect(warnings).toEqual([
      '2 unrecognized number(s) not reported — check any that look like an EIP id: 8047, 11605',
    ]);
  });

  it('warns about a moment past the end of the transcript', () => {
    const { errors, warnings } = validateMentions(
      payload([mention({ moments: [{ timestamp: '02:00:00', context: 'x' }] })]),
      opts,
    );
    expect(errors).toEqual([]);
    expect(warnings).toContain('EIP-8061 moment 02:00:00 is past the end of the transcript');
  });
});

describe('sortMentions', () => {
  it('orders moments within an entry and entries by first moment', () => {
    const sorted = sortMentions([
      mention({ eip: 8037, moments: [{ timestamp: '00:41:02', context: 'b' }, { timestamp: '00:05:00', context: 'a' }] }),
      mention({ eip: 8061, moments: [{ timestamp: '00:12:34', context: 'c' }] }),
    ]);
    expect(sorted.map(e => e.eip)).toEqual([8037, 8061]);
    expect(sorted[0].moments.map(m => m.timestamp)).toEqual(['00:05:00', '00:41:02']);
  });
});
