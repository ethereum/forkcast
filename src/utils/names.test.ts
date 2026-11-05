import { describe, expect, it } from 'vitest';
import { abbreviateLastName } from './names';

describe('abbreviateLastName', () => {
  it('shortens a surname to its initial', () => {
    expect(abbreviateLastName('Felix Lange')).toBe('Felix L.');
    expect(abbreviateLastName('Jochem Brouwer')).toBe('Jochem B.');
  });

  it('leaves a handle with no surname whole', () => {
    expect(abbreviateLastName('lightclient')).toBe('lightclient');
    expect(abbreviateLastName('NC')).toBe('NC');
  });

  it('keeps everything before the surname, particles and middle names alike', () => {
    expect(abbreviateLastName('Jérôme de Tychey')).toBe('Jérôme de T.');
    expect(abbreviateLastName('Wei Han Ng')).toBe('Wei Han N.');
  });

  it('keeps the accent on a surname that starts with one', () => {
    expect(abbreviateLastName('Zsolt Felföldi')).toBe('Zsolt F.');
    expect(abbreviateLastName('Anna Ärling')).toBe('Anna Ä.');
  });

  it('leaves a name already shortened alone, rather than restating the initial', () => {
    expect(abbreviateLastName('Alex F.')).toBe('Alex F.');
    expect(abbreviateLastName('Alex F')).toBe('Alex F');
  });
});
