import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampusEvent } from '../types';

vi.mock('../lib/api', () => ({
  postEventUpdate: vi.fn(),
  reportEvent: vi.fn(),
  uploadEventPhoto: vi.fn(),
  createEvent: vi.fn(),
  deleteEventPhoto: vi.fn(() => Promise.resolve()),
}));
vi.mock('../lib/supabase', () => ({ supabase: {} }));

const api = await import('../lib/api');
const { useAppStore } = await import('./useAppStore');
const { getFeed, getInterested, hasUnreadUpdate } = await import('./selectors');

function makeEvent(id: string, overrides: Partial<CampusEvent> = {}): CampusEvent {
  return {
    id,
    title: `Event ${id}`,
    description: 'desc',
    category: 'food',
    organizerType: 'student',
    organizerName: 'Host',
    organizerNetId: 'host1',
    start: '2099-01-01T17:00:00.000Z',
    end: '2099-01-01T19:00:00.000Z',
    locationName: 'Noyes',
    interestedCount: 0,
    goingCount: 0,
    updates: [],
    cancelled: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const now = new Date('2026-06-01T12:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({
    events: [makeEvent('a'), makeEvent('b')],
    savedIds: ['a'],
    passedIds: [],
    confirmedIds: [],
    reportedIds: [],
    lastSeenUpdateAt: {},
    toast: null,
    user: null,
  });
});

describe('postUpdate', () => {
  it('moves the event to the new time and adds the update', async () => {
    vi.mocked(api.postEventUpdate).mockResolvedValue({
      id: 'u1',
      type: 'time',
      message: 'Time changed',
      createdAt: '2026-06-01T12:00:00.000Z',
    });

    const ok = await useAppStore.getState().postUpdate('a', {
      type: 'time',
      message: 'Time changed',
      start: '2099-01-01T18:00:00.000Z',
      end: '2099-01-01T20:00:00.000Z',
    });

    expect(ok).toBe(true);
    const event = useAppStore.getState().events.find((e) => e.id === 'a')!;
    expect(event.start).toBe('2099-01-01T18:00:00.000Z');
    expect(event.end).toBe('2099-01-01T20:00:00.000Z');
    expect(event.updates.map((u) => u.id)).toEqual(['u1']);
  });

  it('does not flag the host’s own update as unread for them', async () => {
    vi.mocked(api.postEventUpdate).mockResolvedValue({
      id: 'u1',
      type: 'location',
      message: 'Moved',
      createdAt: '2026-06-01T12:00:00.000Z',
    });

    await useAppStore.getState().postUpdate('a', { type: 'location', message: 'Moved', locationName: 'Mann' });

    const { events, lastSeenUpdateAt } = useAppStore.getState();
    const event = events.find((e) => e.id === 'a')!;
    expect(event.locationName).toBe('Mann');
    expect(hasUnreadUpdate(event, lastSeenUpdateAt)).toBe(false);
    // Someone else, who hasn't seen it, would get the dot.
    expect(hasUnreadUpdate(event, {})).toBe(true);
  });

  it('leaves the event alone and shows an error when saving fails', async () => {
    vi.mocked(api.postEventUpdate).mockRejectedValue({ code: 'P0001', message: 'End time must be after start time.' });

    const ok = await useAppStore.getState().postUpdate('a', { type: 'note', message: 'hi' });

    expect(ok).toBe(false);
    expect(useAppStore.getState().events.find((e) => e.id === 'a')!.updates).toEqual([]);
    expect(useAppStore.getState().toast?.message).toBe('End time must be after start time.');
  });
});

describe('reportEvent', () => {
  it('hides the reported event from the feed and Interested', async () => {
    vi.mocked(api.reportEvent).mockResolvedValue();

    const ok = await useAppStore.getState().reportEvent('a', 'misleading');

    expect(ok).toBe(true);
    const state = useAppStore.getState();
    expect(state.reportedIds).toEqual(['a']);
    expect(getInterested(state, now).interested.map((e) => e.id)).toEqual([]);
    expect(getFeed(state, now).map((c) => c.event.id)).toEqual(['b']);
  });

  it('un-hides the event if the report fails to save', async () => {
    vi.mocked(api.reportEvent).mockRejectedValue(new Error('offline'));

    const ok = await useAppStore.getState().reportEvent('a', 'other', 'note');

    expect(ok).toBe(false);
    expect(useAppStore.getState().reportedIds).toEqual([]);
  });
});

describe('createEvent with a photo', () => {
  it('removes the uploaded photo if the event fails to save', async () => {
    vi.mocked(api.uploadEventPhoto).mockResolvedValue('user/photo.jpg');
    vi.mocked(api.createEvent).mockRejectedValue(new Error('offline'));

    await expect(
      useAppStore.getState().createEvent(
        {
          title: 't',
          description: 'd',
          category: 'food',
          organizerType: 'student',
          organizerName: 'Me',
          start: '2099-01-01T17:00:00.000Z',
          end: '2099-01-01T19:00:00.000Z',
          locationName: 'Noyes',
        },
        new Blob(['x']),
      ),
    ).rejects.toThrow('offline');
    expect(api.deleteEventPhoto).toHaveBeenCalledWith('user/photo.jpg');
  });
});
