import { describe, expect, it } from 'vitest';
import { findPlace } from './places';

describe('findPlace', () => {
  it('matches the seeded location names', () => {
    for (const name of ['Mann Library', 'Duffield Atrium', 'Noyes', 'Willard Straight', 'Arts Quad', 'Fall Creek Gorge Trail']) {
      expect(findPlace(name)?.name).toBe(name);
    }
  });

  it('ignores case, "the", and extra words', () => {
    expect(findPlace('the arts quad')?.name).toBe('Arts Quad');
    expect(findPlace('Mann Library study lounge')?.name).toBe('Mann Library');
    expect(findPlace('Willard Straight Hall')?.name).toBe('Willard Straight');
  });

  it('only looks before a comma or dash', () => {
    expect(findPlace('Mann Library, 2nd floor')?.name).toBe('Mann Library');
    expect(findPlace('Somewhere new - near Olin')).toBeNull();
  });

  it('prefers the longest match', () => {
    expect(findPlace('Fall Creek Gorge Trail')?.name).toBe('Fall Creek Gorge Trail');
  });

  it('returns null for unknown places', () => {
    expect(findPlace('My apartment')).toBeNull();
    expect(findPlace('')).toBeNull();
  });
});
