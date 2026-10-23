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

export function getFeed(state: FeedState, now: Date, categoryFilter?: CategoryId | 'all'): FeedCard[] {
  const { user, events, savedIds, passedIds, reportedIds } = state;
  const excluded = new Set([...savedIds, ...passedIds, ...reportedIds]);

  const visible = events.filter((e) => {
    if (isPast(e, now)) return false;
    if (excluded.has(e.id)) return false;
    if (user && e.organizerNetId === user.netId) return false;
    if (categoryFilter && categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    return true;
  });

  const interests = new Set(user?.interests ?? []);
  const matching = visible.filter((e) => interests.has(e.category));
  const rest = visible.filter((e) => !interests.has(e.category));

  const byStart = (a: CampusEvent, b: CampusEvent) => {
    const aOngoing = isOngoing(a, now);
    const bOngoing = isOngoing(b, now);
    if (aOngoing !== bOngoing) return aOngoing ? -1 : 1;
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  };

  matching.sort(byStart);
  rest.sort(byStart);

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
    if (state.reportedIds.includes(e.id)) return false;
    if (category && category !== 'all' && e.category !== category) return false;
    if (!q) return true;
    return e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
  });
}

export function spotsLeft(event: CampusEvent): number | null {
  if (event.capacity == null) return null;
  return Math.max(0, event.capacity - event.interestedCount);
}
