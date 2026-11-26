import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampusEvent } from '../types';

vi.mock('../lib/api', () => ({
  postEventUpdate: vi.fn(),
  reportEvent: vi.fn(),
  uploadEventPhoto: vi.fn(),
  createEvent: vi.fn(),
  deleteEventPhoto: vi.fn(() => Promise.resolve()),
  editEvent: vi.fn(),
  resetDemo: vi.fn(),
  fetchProfile: vi.fn(),
  fetchEvents: vi.fn(),
  fetchMyResponses: vi.fn(),
  fetchMyReportedIds: vi.fn(),
  updateProfile: vi.fn(),
  setAvatarPath: vi.fn(),
}));
vi.mock('../lib/supabase', () => ({ supabase: {} }));

const api = await import('../lib/api');
const { useAppStore, friendlyError } = await import('./useAppStore');
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

describe('editEvent', () => {
  const input = {
    title: 'New title',
    description: 'desc',
    category: 'food' as const,
    organizerType: 'student' as const,
    organizerName: 'Host',
    start: '2099-01-01T17:00:00.000Z',
    end: '2099-01-01T19:00:00.000Z',
    locationName: 'Noyes',
  };

  beforeEach(() => {
    useAppStore.setState({ events: [makeEvent('a', { photoPath: 'host/old.jpg', photoUrl: 'https://x/old.jpg' })] });
  });

  it('sends no updates for a title-only change, and keeps the photo', async () => {
    vi.mocked(api.editEvent).mockResolvedValue(makeEvent('a', { title: 'New title', photoPath: 'host/old.jpg' }));

    const ok = await useAppStore.getState().editEvent('a', input, { kind: 'keep' });

    expect(ok).toBe(true);
    expect(api.editEvent).toHaveBeenCalledWith('a', input, 'host/old.jpg', []);
    expect(api.deleteEventPhoto).not.toHaveBeenCalled();
    expect(useAppStore.getState().events[0].title).toBe('New title');
  });

  it('sends a location update when the location changes', async () => {
    vi.mocked(api.editEvent).mockResolvedValue(makeEvent('a'));

    await useAppStore.getState().editEvent('a', { ...input, locationName: 'Mann Library' }, { kind: 'keep' });

    const updates = vi.mocked(api.editEvent).mock.calls[0][3];
    expect(updates).toEqual([{ type: 'location', message: 'Location changed from Noyes to Mann Library.' }]);
  });

  it('deletes the old photo only after a replacement saves', async () => {
    vi.mocked(api.uploadEventPhoto).mockResolvedValue('host/new.jpg');
    vi.mocked(api.editEvent).mockResolvedValue(makeEvent('a', { photoPath: 'host/new.jpg' }));

    await useAppStore.getState().editEvent('a', input, { kind: 'replace', photo: new Blob(['x']) });

    expect(api.editEvent).toHaveBeenCalledWith('a', input, 'host/new.jpg', []);
    expect(api.deleteEventPhoto).toHaveBeenCalledWith('host/old.jpg');
    expect(api.deleteEventPhoto).not.toHaveBeenCalledWith('host/new.jpg');
  });

  it('keeps the old photo and removes the new upload if saving fails', async () => {
    vi.mocked(api.uploadEventPhoto).mockResolvedValue('host/new.jpg');
    vi.mocked(api.editEvent).mockRejectedValue({ code: 'P0001', message: "6 people are going, so spots can't be lower than 6." });

    const ok = await useAppStore.getState().editEvent('a', input, { kind: 'replace', photo: new Blob(['x']) });

    expect(ok).toBe(false);
    expect(api.deleteEventPhoto).toHaveBeenCalledWith('host/new.jpg');
    expect(api.deleteEventPhoto).not.toHaveBeenCalledWith('host/old.jpg');
    expect(useAppStore.getState().events[0].photoPath).toBe('host/old.jpg');
    expect(useAppStore.getState().toast?.message).toBe("6 people are going, so spots can't be lower than 6.");
  });
});

describe('resetDemo', () => {
  it('reloads fresh data (including refreshed demo times) after resetting', async () => {
    vi.mocked(api.resetDemo).mockResolvedValue();
    vi.mocked(api.fetchProfile).mockResolvedValue({
      netId: 'abc123',
      name: 'Tester',
      interests: [],
      verified: true,
      onboarded: true,
    });
    const moved = makeEvent('a', { start: '2099-02-01T17:00:00.000Z', end: '2099-02-01T19:00:00.000Z' });
    vi.mocked(api.fetchEvents).mockResolvedValue([moved]);
    vi.mocked(api.fetchMyResponses).mockResolvedValue([]);
    vi.mocked(api.fetchMyReportedIds).mockResolvedValue([]);
    useAppStore.setState({ lastSeenUpdateAt: { a: '2026-01-01T00:00:00.000Z' } });

    const ok = await useAppStore.getState().resetDemo();

    const state = useAppStore.getState();
    expect(ok).toBe(true);
    expect(state.events[0].start).toBe('2099-02-01T17:00:00.000Z');
    expect(state.savedIds).toEqual([]);
    expect(state.lastSeenUpdateAt).toEqual({});
  });

  it('keeps the current data and shows an error if the reset fails', async () => {
    vi.mocked(api.resetDemo).mockRejectedValue(new Error('offline'));

    const ok = await useAppStore.getState().resetDemo();

    expect(ok).toBe(false);
    expect(useAppStore.getState().savedIds).toEqual(['a']);
    expect(useAppStore.getState().toast?.tone).toBe('error');
  });
});

describe('editEvent with a note for guests', () => {
  it('adds the note to the automatic update it sends', async () => {
    useAppStore.setState({ events: [makeEvent('a')] });
    vi.mocked(api.editEvent).mockResolvedValue(makeEvent('a'));

    await useAppStore.getState().editEvent(
      'a',
      {
        title: 'Event a',
        description: 'desc',
        category: 'food',
        organizerType: 'student',
        organizerName: 'Host',
        start: '2099-01-01T17:00:00.000Z',
        end: '2099-01-01T19:00:00.000Z',
        locationName: 'Mann Library',
      },
      { kind: 'keep' },
      'Meet at the front desk.',
    );

    expect(vi.mocked(api.editEvent).mock.calls[0][3]).toEqual([
      { type: 'location', message: 'Location changed from Noyes to Mann Library. Meet at the front desk.' },
    ]);
  });
});

describe('friendlyError', () => {
  it('explains when the database is missing a newer migration', () => {
    expect(friendlyError({ code: 'PGRST202', message: 'Could not find the function' })).toBe(
      'The database needs an update. Run the latest file in supabase/migrations.',
    );
  });

  it('shows messages the database raises on purpose', () => {
    expect(friendlyError({ code: 'P0001', message: 'This event is full.' })).toBe('This event is full.');
  });

  it('falls back to a connection message', () => {
    expect(friendlyError(new Error('fetch failed'))).toBe("Couldn't save that. Check your connection and try again.");
  });
});

describe('updateProfile with a profile photo', () => {
  const input = { name: 'Tester', gradYear: 2028, interests: ['food' as const] };
  const savedUser = {
    netId: 'abc123',
    name: 'Tester',
    gradYear: 2028,
    interests: ['food' as const],
    verified: true,
    onboarded: true,
    avatarPath: 'me/avatar-old.jpg',
  };

  it('uploads the new photo, points the profile at it, then deletes the old one', async () => {
    vi.mocked(api.updateProfile).mockResolvedValue(savedUser);
    vi.mocked(api.uploadEventPhoto).mockResolvedValue('me/avatar-new.jpg');
    vi.mocked(api.setAvatarPath).mockResolvedValue({ ...savedUser, avatarPath: 'me/avatar-new.jpg' });

    await useAppStore.getState().updateProfile(input, { kind: 'replace', photo: new Blob(['x']) });

    expect(api.uploadEventPhoto).toHaveBeenCalledWith(expect.any(Blob), 'avatar-');
    expect(api.setAvatarPath).toHaveBeenCalledWith('me/avatar-new.jpg');
    expect(api.deleteEventPhoto).toHaveBeenCalledWith('me/avatar-old.jpg');
    expect(useAppStore.getState().user?.avatarPath).toBe('me/avatar-new.jpg');
  });

  it("shows the new photo on the user's hosted events right away", async () => {
    useAppStore.setState({
      events: [makeEvent('mine', { organizerNetId: 'abc123' }), makeEvent('theirs', { organizerNetId: 'other1' })],
    });
    vi.mocked(api.updateProfile).mockResolvedValue(savedUser);
    vi.mocked(api.uploadEventPhoto).mockResolvedValue('me/avatar-new.jpg');
    vi.mocked(api.setAvatarPath).mockResolvedValue({ ...savedUser, avatarUrl: 'https://x/new.jpg' });

    await useAppStore.getState().updateProfile(input, { kind: 'replace', photo: new Blob(['x']) });

    const events = useAppStore.getState().events;
    expect(events.find((e) => e.id === 'mine')?.organizerAvatarUrl).toBe('https://x/new.jpg');
    expect(events.find((e) => e.id === 'theirs')?.organizerAvatarUrl).toBeUndefined();
  });

  it('removes the photo', async () => {
    vi.mocked(api.updateProfile).mockResolvedValue(savedUser);
    vi.mocked(api.setAvatarPath).mockResolvedValue({ ...savedUser, avatarPath: undefined });

    await useAppStore.getState().updateProfile(input, { kind: 'remove' });

    expect(api.setAvatarPath).toHaveBeenCalledWith(null);
    expect(api.deleteEventPhoto).toHaveBeenCalledWith('me/avatar-old.jpg');
  });

  it('leaves the photo alone when it did not change', async () => {
    vi.mocked(api.updateProfile).mockResolvedValue(savedUser);

    await useAppStore.getState().updateProfile(input, { kind: 'keep' });

    expect(api.setAvatarPath).not.toHaveBeenCalled();
    expect(api.deleteEventPhoto).not.toHaveBeenCalled();
  });

  it('keeps the old photo and cleans up the upload if saving the new one fails', async () => {
    vi.mocked(api.updateProfile).mockResolvedValue(savedUser);
    vi.mocked(api.uploadEventPhoto).mockResolvedValue('me/avatar-new.jpg');
    vi.mocked(api.setAvatarPath).mockRejectedValue(new Error('offline'));

    await expect(
      useAppStore.getState().updateProfile(input, { kind: 'replace', photo: new Blob(['x']) }),
    ).rejects.toThrow('offline');
    expect(api.deleteEventPhoto).toHaveBeenCalledWith('me/avatar-new.jpg');
    expect(api.deleteEventPhoto).not.toHaveBeenCalledWith('me/avatar-old.jpg');
  });
});
