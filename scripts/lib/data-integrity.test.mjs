import { describe, expect, it } from 'vitest';

import { checkDataIntegrity } from './data-integrity.mjs';

const stance = (clientName, clientType, rawRating = 'A', normalizedScore = 4) => ({
  clientName,
  clientType,
  ratingSystem: 'tier-abcds',
  rawRating,
  normalizedScore,
  lastUpdated: '2026-01-01',
});

const devnetSpec = (id, extra = {}) => ({
  id,
  title: id,
  sourceUrl: `https://notes.ethereum.org/@ethpandaops/${id}`,
  scrapedAt: '2026-01-01T00:00:00.000Z',
  announcements: [],
  eips: [{ number: 7928, title: 'BAL', status: 'new', url: 'https://eips.ethereum.org/EIPS/eip-7928' }],
  elClientSupport: { clients: [], matrix: [] },
  clClientSupport: { clients: [], matrix: [] },
  specReferences: { consensusSpecs: null, executionSpecs: null },
  ...extra,
});

/** A small dataset with every kind of cross-reference, all resolving. */
function fixture() {
  return {
    eips: [
      {
        file: '7928.json',
        eip: {
          id: 7928,
          forkRelationships: [
            {
              forkName: 'Glamsterdam',
              statusHistory: [
                { status: 'Proposed', call: 'acdt/66', date: '2025-01-01' },
                { status: 'Scheduled', call: 'acde/200', date: '2025-02-01' },
              ],
              presentationHistory: [{ type: 'presentation', call: 'acde/200', date: '2025-02-01' }],
            },
          ],
        },
      },
    ],
    forkNames: ['glamsterdam', 'hegota'],
    calls: [
      { type: 'acde', date: '2025-02-01', number: '200', path: 'acde/200' },
      { type: 'acdt', date: '2025-01-01', number: '066', path: 'acdt/066' },
    ],
    prioritization: [
      {
        file: 'glamsterdam.json',
        data: {
          fork: 'glamsterdam',
          lastUpdated: '2026-01-01',
          teams: [
            { name: 'Geth', type: 'EL', initials: 'Ge' },
            { name: 'Lido', type: 'OTHER', initials: 'Li' },
          ],
          eips: [{ eipId: 7928, stances: [stance('Geth', 'EL'), stance('Lido', 'OTHER', 'neutral', null)] }],
        },
      },
    ],
    devnets: [
      { file: 'bal-devnet-0.json', data: devnetSpec('bal-devnet-0') },
      { file: 'bal-devnet-1.json', data: devnetSpec('bal-devnet-1', { sameSpecAs: 'bal-devnet-0' }) },
      {
        file: 'glamsterdam.json',
        data: {
          upgrade: 'glamsterdam',
          lastUpdated: '2026-01-01',
          devnets: [{ id: 'bal-devnet-0', type: 'headliner', headliner: 'BAL', version: 0, eips: [7928] }],
        },
      },
    ],
    callDirs: [
      {
        dir: 'acde/2025-02-01_200',
        hasTranscript: true,
        config: {
          issue: 1,
          videoUrl: 'https://youtu.be/x',
          sync: { transcriptStartTime: null, videoStartTime: null },
        },
      },
      {
        dir: 'acdt/2025-01-01_066',
        hasTranscript: true,
        config: {
          videoUrl: 'https://youtu.be/y',
          sync: { transcriptStartTime: '00:00:00', videoStartTime: '00:00:00' },
          breakouts: { cl: { videoUrl: 'https://youtu.be/z', sync: { transcriptStartTime: '00:00:00', videoStartTime: '00:00:00' } } },
        },
      },
    ],
    clientTeams: [{ name: 'Geth', type: 'EL' }],
    eipCategories: [{ id: 'bal', eips: [7928] }, { id: 'aa', subcategories: [{ eips: [7928] }] }],
    breakouts: [{ parentPath: 'acdt/066', artifactDir: 'acdt-breakouts/2025-01-01_066/bal' }],
    artifactExists: () => true,
  };
}

const check = (mutate) => {
  const data = fixture();
  mutate?.(data);
  return checkDataIntegrity(data);
};

describe('checkDataIntegrity', () => {
  it('passes a consistent dataset', () => {
    expect(check()).toEqual({ errors: [], warnings: [] });
  });

  it.each([
    ['an EIP call reference with no call', d => { d.eips[0].eip.forkRelationships[0].statusHistory[0].call = 'acdt/999'; }, 'call "acdt/999"'],
    ['statusHistory out of date order', d => { d.eips[0].eip.forkRelationships[0].statusHistory.reverse(); }, 'not in date order'],
    ['a prioritization fork that is no upgrade', d => { d.prioritization[0].file = 'glamsterdm.json'; d.prioritization[0].data.fork = 'glamsterdm'; }, 'is not an upgrade id'],
    ['a prioritized EIP with no file', d => { d.prioritization[0].data.eips[0].eipId = 1; }, 'EIP 1 has no file'],
    ['a stance from a team not on the board', d => { d.prioritization[0].data.eips[0].stances[0].clientName = 'GETH'; }, 'not in teams[]'],
    ['a stance whose type disagrees with teams[]', d => { d.prioritization[0].data.eips[0].stances[0].clientType = 'CL'; }, 'teams[] says EL'],
    ['a client team typed differently from ALL_CLIENT_TEAMS', d => { d.prioritization[0].data.teams[0].type = 'CL'; d.prioritization[0].data.eips[0].stances[0].clientType = 'CL'; }, 'EL in ALL_CLIENT_TEAMS'],
    ['a score with no rating', d => { d.prioritization[0].data.eips[0].stances[0].rawRating = null; }, 'no rawRating'],
    ['a prioritization typo in a field name', d => { d.prioritization[0].data.eips[0].stances[0].rawRatng = 'A'; }, 'rawRatng'],
    ['a devnet spec missing a key', d => { delete d.devnets[0].data.eips; }, "must have required property 'eips'"],
    ['a devnet sameSpecAs pointing nowhere', d => { d.devnets[1].data.sameSpecAs = 'bal-devnet-9'; }, 'sameSpecAs "bal-devnet-9"'],
    ['a devnet roll-up EIP with no file', d => { d.devnets[2].data.devnets[0].eips = [1]; }, 'lists EIP 1'],
    ['a call config without a video', d => { delete d.callDirs[0].config.videoUrl; }, "must have required property 'videoUrl'"],
    ['a malformed sync offset', d => { d.callDirs[1].config.sync.videoStartTime = '0:00'; }, 'videoStartTime'],
    ['a listed call with no artifact folder', d => { d.callDirs.pop(); }, 'acdt/066 has no artifact folder'],
    ['a category EIP with no file', d => { d.eipCategories[1].subcategories[0].eips = [1]; }, 'category "aa" lists EIP 1'],
    ['a breakout under a call that does not exist', d => { d.breakouts[0].parentPath = 'acdt/067'; }, 'parent call "acdt/067"'],
  ])('flags %s', (_label, mutate, message) => {
    const { errors } = check(mutate);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(message);
  });

  it('warns about artifacts the site tolerates but probably shouldn\'t have', () => {
    const { errors, warnings } = check(d => {
      delete d.callDirs[0].config.sync;
      // No transcript, so no offsets to need (ethproofs calls are video-only).
      d.callDirs.push({ dir: 'acde/2025-03-01_201', config: { videoUrl: 'https://youtu.be/w' }, hasTranscript: false });
      d.artifactExists = () => false;
    });
    expect(errors).toEqual([]);
    expect(warnings).toEqual([
      'public/artifacts/acde/2025-02-01_200/config.json: no sync offsets (transcript won\'t follow the video)',
      'public/artifacts/acde/2025-03-01_201: not in protocol-calls.generated.json, so it has no page',
      'src/data/breakouts.ts: artifactDir "acdt-breakouts/2025-01-01_066/bal" does not exist under public/artifacts (the tab shows video only)',
    ]);
  });
});
