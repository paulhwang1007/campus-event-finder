import { isOngoing, isPast } from '../lib/time';
import type { CampusEvent, CategoryId, User } from '../types';

export { isOngoing, isPast };

export interface FeedCard {
  event: CampusEvent;
  isOutsideInterests: boolean;
}

interface FeedState {
  user: User | null;
  events: CampusEvent[];
  savedIds: string[];
  passedIds: string[];
  reportedIds: string[];
}

function sortByStart(events: CampusEvent[], now: Date): CampusEvent[] {
  return [...events].sort((a, b) => {
    const aOngoing = isOngoing(a, now);
    const bOngoing = isOngoing(b, now);
    if (aOngoing !== bOngoing) return aOngoing ? -1 : 1;
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });
}

export function getFeed(state: FeedState, now: Date, categoryFilter?: CategoryId | 'all'): FeedCard[] {
  const { user, events, savedIds, passedIds, reportedIds } = state;
  const excluded = new Set([...savedIds, ...passedIds, ...reportedIds]);

  const visible = events.filter((e) => {
    if (isPast(e, now)) return false;
    if (e.cancelled) return false;
    if (excluded.has(e.id)) return false;
    if (user && e.organizerNetId === user.netId) return false;
    if (categoryFilter && categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    return true;
  });

  const interests = new Set(user?.interests ?? []);
  // A user who hasn't picked interests yet sees everything as a match.
  const matches = (e: CampusEvent) => interests.size === 0 || interests.has(e.category);
  const matching = sortByStart(visible.filter(matches), now);
  const rest = sortByStart(visible.filter((e) => !matches(e)), now);

  return [
    ...matching.map((event) => ({ event, isOutsideInterests: false })),
    ...rest.map((event) => ({ event, isOutsideInterests: true })),
  ];
}

export function getSaved(state: FeedState, now: Date): { upcoming: CampusEvent[]; past: CampusEvent[] } {
  const saved = state.events.filter(
    (e) => state.savedIds.includes(e.id) && !state.reportedIds.includes(e.id),
  );
  return {
    upcoming: saved.filter((e) => new Date(e.end) >= now),
    past: saved.filter((e) => new Date(e.end) < now),
  };
}

interface InterestedState {
  events: CampusEvent[];
  savedIds: string[];
  confirmedIds: string[];
  reportedIds: string[];
}

export function getInterested(
  state: InterestedState,
  now: Date,
): { going: CampusEvent[]; interested: CampusEvent[] } {
  const { events, savedIds, confirmedIds, reportedIds } = state;
  const saved = events.filter(
    (e) => savedIds.includes(e.id) && !reportedIds.includes(e.id) && !isPast(e, now),
  );
  const going = saved.filter((e) => confirmedIds.includes(e.id));
  const interested = saved.filter((e) => !confirmedIds.includes(e.id));
  return { going: sortByStart(going, now), interested: sortByStart(interested, now) };
}

interface ProfileState {
  user: User | null;
  events: CampusEvent[];
  confirmedIds: string[];
  reportedIds: string[];
}

export function getProfileEvents(
  state: ProfileState,
  now: Date,
): { going: CampusEvent[]; hosting: CampusEvent[]; attended: CampusEvent[] } {
  const { user, events, confirmedIds, reportedIds } = state;
  const confirmed = events.filter((e) => confirmedIds.includes(e.id) && !reportedIds.includes(e.id));
  const going = sortByStart(
    confirmed.filter((e) => !isPast(e, now)),
    now,
  );
  const attended = confirmed
    .filter((e) => isPast(e, now))
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
  const hosting = user ? sortByStart(events.filter((e) => e.organizerNetId === user.netId), now) : [];
  return { going, hosting, attended };
}

export function hasUnreadUpdate(
  event: CampusEvent,
  lastSeenUpdateAt: Record<string, string>,
): boolean {
  if (event.updates.length === 0) return false;
  const latest = event.updates[event.updates.length - 1];
  const lastSeen = lastSeenUpdateAt[event.id];
  if (!lastSeen) return true;
  return new Date(latest.createdAt) > new Date(lastSeen);
}

export function searchEvents(
  state: FeedState,
  now: Date,
  query: string,
  category?: CategoryId | 'all',
): CampusEvent[] {
  const q = query.trim().toLowerCase();
  return state.events.filter((e) => {
    if (isPast(e, now)) return false;
    if (e.cancelled) return false;
    if (state.reportedIds.includes(e.id)) return false;
    if (category && category !== 'all' && e.category !== category) return false;
    if (!q) return true;
    return e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
  });
}

/** Spots left for people marked as going; null when the event has no capacity limit. */
export function spotsLeft(event: CampusEvent): number | null {
  if (event.capacity == null) return null;
  return Math.max(0, event.capacity - event.goingCount);
}

export function isFull(event: CampusEvent): boolean {
  return spotsLeft(event) === 0;
}
