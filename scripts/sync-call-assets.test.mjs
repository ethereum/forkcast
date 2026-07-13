import { describe, expect, it } from 'vitest';

import { generateConfig, normalizeManifest, updateConfig } from './sync-call-config.mjs';

const ZERO_SYNC = { transcriptStartTime: '00:00:00', videoStartTime: '00:00:00' };

describe('call asset sync offsets', () => {
  it('keeps livestreamed calls manual', () => {
    expect(generateConfig({ issue: 2103, videoUrl: 'https://www.youtube.com/watch?v=sample' }, 'acde').sync).toEqual({
      transcriptStartTime: null,
      videoStartTime: null,
    });
  });

  it('zero-syncs raw Zoom calls, including acdt', () => {
    expect(generateConfig({ issue: 2103, videoUrl: 'https://www.youtube.com/watch?v=sample' }, 'bal').sync).toEqual(ZERO_SYNC);
    expect(generateConfig({ issue: 2151, videoUrl: 'https://www.youtube.com/watch?v=sample' }, 'acdt').sync).toEqual(ZERO_SYNC);
  });
});

describe('bundled breakouts', () => {
  const manifest = {
    series: {
      acdt: {
        calls: [
          {
            path: 'acdt/2026-07-13_087',
            date: '2026-07-13',
            resources: {
              transcript: 'transcript.vtt',
              transcript_corrected: 'transcript_corrected.vtt',
              tldr: 'tldr.json',
              chat: 'chat.txt',
              transcript_cl: 'transcript_cl.vtt',
              chat_cl: 'chat_cl.txt',
              tldr_cl: 'tldr_cl.json',
            },
            issue: 2151,
            videoUrl: 'https://www.youtube.com/watch?v=main',
            breakoutVideoUrls: {
              cl: 'https://www.youtube.com/watch?v=breakout',
            },
          },
        ],
      },
    },
  };

  it('extracts breakout metadata from the manifest', () => {
    expect(normalizeManifest(manifest).acdt['2026-07-13_087'].breakouts).toEqual({
      cl: {
        videoUrl: 'https://www.youtube.com/watch?v=breakout',
        has_transcript: true,
        has_chat: true,
        has_tldr: true,
      },
    });
  });

  it('omits breakouts when the manifest has none', () => {
    const bare = {
      series: {
        acdt: {
          calls: [
            {
              path: 'acdt/2026-07-06_086',
              date: '2026-07-06',
              resources: { transcript: 'transcript.vtt' },
              issue: 2144,
              videoUrl: 'https://www.youtube.com/watch?v=main',
            },
          ],
        },
      },
    };

    const callData = normalizeManifest(bare).acdt['2026-07-06_086'];
    expect(callData.breakouts).toBeNull();
    expect(generateConfig(callData, 'acdt')).not.toHaveProperty('breakouts');
  });

  it('generates breakout config with zero sync', () => {
    const callData = normalizeManifest(manifest).acdt['2026-07-13_087'];

    expect(generateConfig(callData, 'acdt')).toEqual({
      issue: 2151,
      videoUrl: 'https://www.youtube.com/watch?v=main',
      sync: ZERO_SYNC,
      breakouts: {
        cl: {
          videoUrl: 'https://www.youtube.com/watch?v=breakout',
          sync: ZERO_SYNC,
        },
      },
    });
  });

  it('adds new breakouts to an existing config', () => {
    const callData = normalizeManifest(manifest).acdt['2026-07-13_087'];
    const existingConfig = {
      issue: 2151,
      videoUrl: 'https://www.youtube.com/watch?v=main',
      sync: { transcriptStartTime: '00:01:30', videoStartTime: '00:01:30' },
    };

    expect(updateConfig(existingConfig, callData)).toEqual({
      config: {
        ...existingConfig,
        breakouts: {
          cl: {
            videoUrl: 'https://www.youtube.com/watch?v=breakout',
            sync: ZERO_SYNC,
          },
        },
      },
      changed: true,
    });
  });

  it('preserves tuned breakout sync when refreshing a changed video URL', () => {
    const callData = normalizeManifest(manifest).acdt['2026-07-13_087'];
    const tunedSync = { transcriptStartTime: '00:01:47', videoStartTime: '00:01:47' };
    const existingConfig = {
      issue: 2151,
      videoUrl: 'https://www.youtube.com/watch?v=main',
      sync: ZERO_SYNC,
      breakouts: {
        cl: { videoUrl: 'https://www.youtube.com/watch?v=stale', sync: tunedSync },
      },
    };

    const { config, changed } = updateConfig(existingConfig, callData);
    expect(changed).toBe(true);
    expect(config.breakouts.cl).toEqual({
      videoUrl: 'https://www.youtube.com/watch?v=breakout',
      sync: tunedSync,
    });
  });

  it('leaves an up-to-date config unchanged', () => {
    const callData = normalizeManifest(manifest).acdt['2026-07-13_087'];
    const existingConfig = generateConfig(callData, 'acdt');

    expect(updateConfig(existingConfig, callData).changed).toBe(false);
  });
});
