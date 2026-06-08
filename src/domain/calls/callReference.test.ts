import { describe, expect, it } from 'vitest';
import { formatCallReference } from './callReference';

describe('formatCallReference', () => {
  it('zero-pads the call number so the link matches the emitted call page', () => {
    // EIP data stores unpadded numbers ("acdt/66"), but the static build emits
    // zero-padded call paths ("acdt/066"). Without padding the link 404s.
    expect(formatCallReference('acdt/66')).toEqual({
      display: 'ACDT #66',
      link: '/calls/acdt/066',
    });
  });

  it('leaves an already-three-digit number unchanged', () => {
    expect(formatCallReference('acde/213').link).toBe('/calls/acde/213');
  });

  it('appends a timestamp hash when provided', () => {
    expect(formatCallReference('acdc/158', 1234).link).toBe('/calls/acdc/158#t=1234');
  });

  it('throws on a malformed reference with no "{series}/{number}" separator', () => {
    // Guards bad EIP data: a slashless value would otherwise emit a 404ing link.
    expect(() => formatCallReference('acdt66')).toThrow(/Malformed call reference/);
    expect(() => formatCallReference('acdt/')).toThrow(/Malformed call reference/);
    expect(() => formatCallReference('/66')).toThrow(/Malformed call reference/);
  });
});
