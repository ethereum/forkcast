import { describe, expect, it } from 'vitest';
import { keepTimestampIfUnchanged } from './stable-timestamp.mjs';

describe('keepTimestampIfUnchanged', () => {
  const prev = { id: 'x', scrapedAt: 'OLD', eips: [1, 2] };

  it('keeps the previous timestamp when nothing else changed', () => {
    const next = { id: 'x', scrapedAt: 'NEW', eips: [1, 2] };
    expect(keepTimestampIfUnchanged(next, prev, 'scrapedAt')).toEqual(prev);
  });

  it('serialises byte-identical to the previous file', () => {
    const next = { id: 'x', scrapedAt: 'NEW', eips: [1, 2] };
    expect(
      JSON.stringify(keepTimestampIfUnchanged(next, prev, 'scrapedAt')),
    ).toBe(JSON.stringify(prev));
  });

  it('uses the new timestamp when content changed', () => {
    const next = { id: 'x', scrapedAt: 'NEW', eips: [1, 2, 3] };
    expect(keepTimestampIfUnchanged(next, prev, 'scrapedAt')).toEqual(next);
  });

  it('treats an added or removed field as a change', () => {
    const next = { id: 'x', scrapedAt: 'NEW', eips: [1, 2], canceled: true };
    expect(keepTimestampIfUnchanged(next, prev, 'scrapedAt').scrapedAt).toBe(
      'NEW',
    );
  });

  it('uses the new timestamp when there is no previous file or value', () => {
    const next = { id: 'x', scrapedAt: 'NEW', eips: [1, 2] };
    expect(keepTimestampIfUnchanged(next, null, 'scrapedAt')).toEqual(next);
    expect(
      keepTimestampIfUnchanged(next, { id: 'x', eips: [1, 2] }, 'scrapedAt'),
    ).toEqual(next);
  });
});
