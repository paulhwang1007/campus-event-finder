import { describe, expect, it } from 'vitest';
import { getFeed, hasUnreadUpdate, spotsLeft } from './selectors';
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
};

describe('getFeed', () => {
  it('excludes past, saved, passed, reported, and own events', () => {
    const events = [
      makeEvent('past', { start: hours(-5), end: hours(-4) }),
      makeEvent('saved', {}),
      makeEvent('passed', {}),
      makeEvent('reported', {}),
      makeEvent('own', { organizerNetId: user.netId }),
      makeEvent('visible', {}),
    ];
    const feed = getFeed(
      { user, events, savedIds: ['saved'], passedIds: ['passed'], reportedIds: ['reported'] },
      now,
    );
    expect(feed.map((c) => c.event.id)).toEqual(['visible']);
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
    expect(spotsLeft(makeEvent('e', { capacity: undefined, interestedCount: 5 }))).toBeNull();
  });

  it('returns the remaining spots', () => {
    expect(spotsLeft(makeEvent('e', { capacity: 10, interestedCount: 4 }))).toBe(6);
  });

  it('never returns a negative number', () => {
    expect(spotsLeft(makeEvent('e', { capacity: 5, interestedCount: 9 }))).toBe(0);
  });
});
