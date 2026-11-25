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
