import { describe, expect, it } from 'vitest';
import {
  getFeed,
  getInterested,
  getProfileEvents,
  groupEventsByDay,
  hasUnreadUpdate,
  isFull,
  searchEvents,
  spotsLeft,
} from './selectors';
import type { CampusEvent, User } from '../types';

const now = new Date('2026-10-23T12:00:00.000Z');
const hours = (n: number) => new Date(now.getTime() + n * 60 * 60 * 1000).toISOString();

function makeEvent(id: string, overrides: Partial<CampusEvent>): CampusEvent {
  return {
    id,
    title: `Event ${id}`,
    description: 'desc',
    category: 'food',
    organizerType: 'student',
    organizerName: 'Someone',
    organizerNetId: 'abc123',
    start: hours(1),
    end: hours(2),
    locationName: 'Somewhere',
    interestedCount: 0,
    goingCount: 0,
    updates: [],
    cancelled: false,
    createdAt: hours(-24),
    ...overrides,
  };
}

const user: User = {
  netId: 'test123',
  name: 'Test User',
  classYear: 'Sophomore',
  interests: ['food'],
  verified: true,
  onboarded: true,
};

describe('getFeed', () => {
  it('excludes past, saved, passed, and reported events', () => {
    const events = [
      makeEvent('past', { start: hours(-5), end: hours(-4) }),
      makeEvent('saved', {}),
      makeEvent('passed', {}),
      makeEvent('reported', {}),
      makeEvent('visible', {}),
    ];
    const feed = getFeed(
      { user, events, savedIds: ['saved'], passedIds: ['passed'], reportedIds: ['reported'] },
      now,
    );
    expect(feed.map((c) => c.event.id)).toEqual(['visible']);
  });

  it('includes the user’s own events, flagged, until they move past them', () => {
    const events = [makeEvent('own', { organizerNetId: user.netId }), makeEvent('other', {})];

    const feed = getFeed({ user, events, savedIds: [], passedIds: [], reportedIds: [] }, now);
    expect(feed.map((c) => [c.event.id, c.isOwn])).toEqual([
      ['own', true],
      ['other', false],
    ]);

    const afterSkip = getFeed({ user, events, savedIds: [], passedIds: ['own'], reportedIds: [] }, now);
    expect(afterSkip.map((c) => c.event.id)).toEqual(['other']);
  });

  it('puts events matching the user interests first, ongoing before upcoming within each group', () => {
    const events = [
      makeEvent('other-category-upcoming', { category: 'arts', start: hours(1), end: hours(2) }),
      makeEvent('interest-upcoming', { category: 'food', start: hours(3), end: hours(4) }),
      makeEvent('interest-ongoing', { category: 'food', start: hours(-1), end: hours(1) }),
    ];
    const feed = getFeed({ user, events, savedIds: [], passedIds: [], reportedIds: [] }, now);
    expect(feed.map((c) => c.event.id)).toEqual([
      'interest-ongoing',
      'interest-upcoming',
      'other-category-upcoming',
    ]);
    expect(feed.find((c) => c.event.id === 'other-category-upcoming')?.isOutsideInterests).toBe(true);
    expect(feed.find((c) => c.event.id === 'interest-upcoming')?.isOutsideInterests).toBe(false);
  });

  it('applies a category filter', () => {
    const events = [
      makeEvent('food-event', { category: 'food' }),
      makeEvent('arts-event', { category: 'arts' }),
    ];
    const feed = getFeed({ user, events, savedIds: [], passedIds: [], reportedIds: [] }, now, 'arts');
    expect(feed.map((c) => c.event.id)).toEqual(['arts-event']);
  });
});

describe('getInterested', () => {
  it('splits saved events into going (confirmed) and interested (not confirmed)', () => {
    const events = [
      makeEvent('confirmed', {}),
      makeEvent('just-interested', {}),
      makeEvent('not-saved', {}),
    ];
    const result = getInterested(
      {
        events,
        savedIds: ['confirmed', 'just-interested'],
        confirmedIds: ['confirmed'],
        reportedIds: [],
      },
      now,
    );
    expect(result.going.map((e) => e.id)).toEqual(['confirmed']);
    expect(result.interested.map((e) => e.id)).toEqual(['just-interested']);
  });

  it('excludes past and reported events from both groups', () => {
    const events = [
      makeEvent('past-confirmed', { start: hours(-5), end: hours(-4) }),
      makeEvent('reported-interested', {}),
    ];
    const result = getInterested(
      {
        events,
        savedIds: ['past-confirmed', 'reported-interested'],
        confirmedIds: ['past-confirmed'],
        reportedIds: ['reported-interested'],
      },
      now,
    );
    expect(result.going).toEqual([]);
    expect(result.interested).toEqual([]);
  });

  it('sorts each group by start time, ongoing first', () => {
    const events = [
      makeEvent('later', { start: hours(3), end: hours(4) }),
      makeEvent('ongoing', { start: hours(-1), end: hours(1) }),
    ];
    const result = getInterested(
      { events, savedIds: ['later', 'ongoing'], confirmedIds: [], reportedIds: [] },
      now,
    );
    expect(result.interested.map((e) => e.id)).toEqual(['ongoing', 'later']);
  });
});

describe('getProfileEvents', () => {
  it('splits confirmed events into going (upcoming) and attended (past)', () => {
    const events = [
      makeEvent('upcoming-confirmed', { start: hours(1), end: hours(2) }),
      makeEvent('past-confirmed', { start: hours(-5), end: hours(-4) }),
      makeEvent('not-confirmed', {}),
    ];
    const result = getProfileEvents(
      { user, events, confirmedIds: ['upcoming-confirmed', 'past-confirmed'], reportedIds: [] },
      now,
    );
    expect(result.going.map((e) => e.id)).toEqual(['upcoming-confirmed']);
    expect(result.attended.map((e) => e.id)).toEqual(['past-confirmed']);
  });

  it('lists events the user organized as hosting, regardless of confirmation', () => {
    const events = [
      makeEvent('hosted', { organizerNetId: user.netId }),
      makeEvent('someone-elses', { organizerNetId: 'other456' }),
    ];
    const result = getProfileEvents({ user, events, confirmedIds: [], reportedIds: [] }, now);
    expect(result.hosting.map((e) => e.id)).toEqual(['hosted']);
  });

  it('sorts attended events most-recent-first', () => {
    const events = [
      makeEvent('older', { start: hours(-10), end: hours(-9) }),
      makeEvent('newer', { start: hours(-2), end: hours(-1) }),
    ];
    const result = getProfileEvents(
      { user, events, confirmedIds: ['older', 'newer'], reportedIds: [] },
      now,
    );
    expect(result.attended.map((e) => e.id)).toEqual(['newer', 'older']);
  });

  it('excludes reported events from going and attended', () => {
    const events = [makeEvent('reported-confirmed', {})];
    const result = getProfileEvents(
      { user, events, confirmedIds: ['reported-confirmed'], reportedIds: ['reported-confirmed'] },
      now,
    );
    expect(result.going).toEqual([]);
    expect(result.attended).toEqual([]);
  });
});

describe('hasUnreadUpdate', () => {
  it('is true when there is an update and nothing has been seen yet', () => {
    const event = makeEvent('e', { updates: [{ id: 'u1', type: 'note', message: 'hi', createdAt: hours(-1) }] });
    expect(hasUnreadUpdate(event, {})).toBe(true);
  });

  it('is false once the latest update has been seen', () => {
    const updateTime = hours(-1);
    const event = makeEvent('e', { updates: [{ id: 'u1', type: 'note', message: 'hi', createdAt: updateTime }] });
    expect(hasUnreadUpdate(event, { e: updateTime })).toBe(false);
  });

  it('is false when there are no updates', () => {
    const event = makeEvent('e', { updates: [] });
    expect(hasUnreadUpdate(event, {})).toBe(false);
  });
});

describe('spotsLeft', () => {
  it('returns null when there is no capacity', () => {
    expect(spotsLeft(makeEvent('e', { capacity: undefined, goingCount: 5 }))).toBeNull();
  });

  it('counts people going, not people interested', () => {
    expect(spotsLeft(makeEvent('e', { capacity: 10, goingCount: 4, interestedCount: 9 }))).toBe(6);
  });

  it('never returns a negative number', () => {
    expect(spotsLeft(makeEvent('e', { capacity: 5, goingCount: 9 }))).toBe(0);
  });
});

describe('isFull', () => {
  it('is true only when a capacity is set and reached', () => {
    expect(isFull(makeEvent('e', { capacity: 3, goingCount: 3 }))).toBe(true);
    expect(isFull(makeEvent('e', { capacity: 3, goingCount: 2, interestedCount: 10 }))).toBe(false);
    expect(isFull(makeEvent('e', { capacity: undefined, goingCount: 50 }))).toBe(false);
  });
});

describe('getFeed cancelled events', () => {
  it('leaves cancelled events out of the feed', () => {
    const state = { user, events: [makeEvent('live', {}), makeEvent('off', { cancelled: true })], savedIds: [], passedIds: [], reportedIds: [] };
    expect(getFeed(state, now).map((c) => c.event.id)).toEqual(['live']);
  });
});

describe('groupEventsByDay', () => {
  // Local-time dates, so day boundaries don't depend on the machine's time zone.
  const localNow = new Date(2026, 9, 23, 12, 0); // Fri Oct 23, noon
  const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString();

  it('puts ongoing events first, then one group per day in order', () => {
    const events = [
      makeEvent('sat', { start: at(24, 15), end: at(24, 16) }),
      makeEvent('now', { start: at(23, 11), end: at(23, 13) }),
      makeEvent('tonight', { start: at(23, 19), end: at(23, 21) }),
      makeEvent('afternoon', { start: at(23, 14), end: at(23, 15) }),
      makeEvent('later', { start: at(27, 10), end: at(27, 11) }),
    ];

    const groups = groupEventsByDay(events, localNow);

    expect(groups.map((g) => g.label)).toEqual(['Happening now', 'Today', 'Tomorrow', 'Tue Oct 27']);
    expect(groups.map((g) => g.events.map((e) => e.id))).toEqual([
      ['now'],
      ['afternoon', 'tonight'],
      ['sat'],
      ['later'],
    ]);
  });

  it('returns no groups for no events', () => {
    expect(groupEventsByDay([], localNow)).toEqual([]);
  });

  it('works with search and a category filter', () => {
    const state = {
      user: null,
      events: [
        makeEvent('pizza', { title: 'Study break pizza', category: 'food', start: at(23, 15), end: at(23, 16) }),
        makeEvent('pizza-art', { title: 'Pizza box painting', category: 'arts', start: at(23, 15), end: at(23, 16) }),
        makeEvent('bagels', { title: 'Bagel run', category: 'food', start: at(24, 9), end: at(24, 10) }),
        makeEvent('old', { title: 'Old pizza', category: 'food', start: at(22, 9), end: at(22, 10) }),
      ],
      savedIds: ['pizza'],
      passedIds: [],
      reportedIds: [],
    };

    const found = searchEvents(state, localNow, 'pizza', 'food');

    // Saved events still show in the list; past events don't.
    expect(groupEventsByDay(found, localNow).map((g) => g.events.map((e) => e.id))).toEqual([['pizza']]);
  });
});
