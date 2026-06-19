import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchYouTubeUrl } from './snapshot-runtime-routes.mjs';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchYouTubeUrl', () => {
  it('returns the YouTube URL from successfully fetched issue comments', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { body: '✅ **YouTube Live**: [Watch Live](https://www.youtube.com/watch?v=abc123)' },
      ],
    }));

    await expect(fetchYouTubeUrl(1234)).resolves.toBe('https://www.youtube.com/watch?v=abc123');
  });

  it('returns undefined when comments are fetched and no YouTube URL exists yet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ body: 'Agenda only.' }],
    }));

    await expect(fetchYouTubeUrl(1234)).resolves.toBeUndefined();
  });

  it('rejects failed comment fetches so transient failures cannot remove watch routes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }));

    await expect(fetchYouTubeUrl(1234)).rejects.toThrow(
      'GitHub issue comments fetch failed for #1234: 503',
    );
  });

  it('rejects network errors so snapshot refreshes keep the previous committed routes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket hang up')));

    await expect(fetchYouTubeUrl(1234)).rejects.toThrow('socket hang up');
  });
});
