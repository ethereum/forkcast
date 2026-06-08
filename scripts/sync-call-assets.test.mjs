import { describe, expect, it } from 'vitest';

import { generateConfig, normalizeManifest, updateConfig } from './sync-call-config.mjs';

describe('call asset sync offsets', () => {
  it('preserves PM-provided sync metadata from the normalized manifest', () => {
    const manifest = {
      series: {
        acdt: {
          calls: [
            {
              path: 'acdt/2026-06-08_082',
              date: '2026-06-08',
              resources: {
                transcript: 'transcript.vtt',
              },
              issue: 2103,
              videoUrl: 'https://www.youtube.com/watch?v=sample',
              sync: {
                transcriptStartTime: '00:00:43',
                videoStartTime: '00:00:54',
              },
            },
          ],
        },
      },
    };

    expect(normalizeManifest(manifest).acdt['2026-06-08_082'].sync).toEqual({
      transcriptStartTime: '00:00:43',
      videoStartTime: '00:00:54',
    });
  });

  it('uses PM-provided sync when generating config', () => {
    const sync = {
      transcriptStartTime: '00:04:47',
      videoStartTime: '00:00:55',
    };

    expect(generateConfig({ issue: 2103, videoUrl: 'https://www.youtube.com/watch?v=sample', sync }, 'acdt').sync).toEqual(sync);
  });

  it('keeps livestreamed calls manual when PM does not provide sync', () => {
    expect(generateConfig({ issue: 2103, videoUrl: 'https://www.youtube.com/watch?v=sample' }, 'acde').sync).toEqual({
      transcriptStartTime: null,
      videoStartTime: null,
    });
  });

  it('requires PM-provided sync for composed Zoom calls', () => {
    expect(() => generateConfig({ issue: 2103, videoUrl: 'https://www.youtube.com/watch?v=sample' }, 'acdt')).toThrow(
      'Missing PM-provided sync metadata',
    );
  });

  it('rejects existing zero-sync config for composed Zoom calls without PM-provided sync', () => {
    const existingConfig = {
      issue: 2103,
      videoUrl: 'https://www.youtube.com/watch?v=sample',
      sync: {
        transcriptStartTime: '00:00:00',
        videoStartTime: '00:00:00',
      },
    };

    expect(() =>
      updateConfig(existingConfig, { issue: 2103, videoUrl: 'https://www.youtube.com/watch?v=sample' }, 'acdt'),
    ).toThrow('Missing PM-provided sync metadata');
  });

  it('updates missing config sync from PM-provided sync', () => {
    const sync = {
      transcriptStartTime: '00:00:43',
      videoStartTime: '00:00:54',
    };

    expect(
      updateConfig(
        { issue: 2103, videoUrl: 'https://www.youtube.com/watch?v=sample' },
        { issue: 2103, videoUrl: 'https://www.youtube.com/watch?v=sample', sync },
        'acdt',
      ),
    ).toEqual({
      config: {
        issue: 2103,
        videoUrl: 'https://www.youtube.com/watch?v=sample',
        sync,
      },
      changed: true,
    });
  });

  it('keeps raw Zoom calls zero synced when PM does not provide sync', () => {
    expect(generateConfig({ issue: 2103, videoUrl: 'https://www.youtube.com/watch?v=sample' }, 'bal').sync).toEqual({
      transcriptStartTime: '00:00:00',
      videoStartTime: '00:00:00',
    });
  });
});
