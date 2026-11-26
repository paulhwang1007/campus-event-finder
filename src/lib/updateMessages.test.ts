import { describe, expect, it } from 'vitest';
import { updatesForEdit } from './updateMessages';

const now = new Date(2026, 10, 2, 9, 0);
const before = {
  start: new Date(2026, 10, 2, 17, 0).toISOString(),
  end: new Date(2026, 10, 2, 20, 0).toISOString(),
  locationName: 'Arts Quad',
};

describe('updatesForEdit', () => {
  it('posts nothing when only other fields change', () => {
    expect(updatesForEdit(before, { ...before }, now)).toEqual([]);
  });

  it('ignores seconds, which the form cannot show', () => {
    const withSeconds = { ...before, start: new Date(2026, 10, 2, 17, 0, 42).toISOString() };
    expect(updatesForEdit(withSeconds, before, now)).toEqual([]);
  });

  it('describes a time change with old and new times', () => {
    const after = {
      ...before,
      start: new Date(2026, 10, 2, 18, 0).toISOString(),
      end: new Date(2026, 10, 2, 21, 0).toISOString(),
    };
    expect(updatesForEdit(before, after, now)).toEqual([
      { type: 'time', message: 'Time changed from Today 5:00–8:00 PM to Today 6:00–9:00 PM.' },
    ]);
  });

  it('describes a location change, and posts both when both change', () => {
    const after = { ...before, end: new Date(2026, 10, 2, 21, 0).toISOString(), locationName: ' Libe Slope ' };
    const updates = updatesForEdit(before, after, now);
    expect(updates.map((u) => u.type)).toEqual(['time', 'location']);
    expect(updates[1].message).toBe('Location changed from Arts Quad to Libe Slope.');
  });
});

describe('updatesForEdit with map pins', () => {
  const pinned = { ...before, locationCoords: { lat: 42.449, lng: -76.484 } };

  it('ignores tiny pin nudges', () => {
    const after = { ...pinned, locationCoords: { lat: 42.4491, lng: -76.4841 } }; // ~14m
    expect(updatesForEdit(pinned, after, now)).toEqual([]);
  });

  it('posts an update when the pin moves to a different spot with the same name', () => {
    const after = { ...pinned, locationCoords: { lat: 42.4475, lng: -76.486 } }; // ~200m
    expect(updatesForEdit(pinned, after, now)).toEqual([
      { type: 'location', message: 'New spot for Arts Quad: check the map for the exact place.' },
    ]);
  });

  it("doesn't count adding a first pin as a move", () => {
    expect(updatesForEdit(before, pinned, now)).toEqual([]);
  });
});
