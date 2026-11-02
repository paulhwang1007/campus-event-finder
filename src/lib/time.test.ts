import { describe, expect, it } from 'vitest';
import { formatEventTimeParts, isOngoing, isPast } from './time';
import type { CampusEvent } from '../types';

const now = new Date('2026-10-23T12:00:00.000Z');

function makeEvent(overrides: Partial<CampusEvent>): CampusEvent {
  return {
    id: '1',
    title: 'Test event',
    description: 'desc',
    category: 'food',
    organizerType: 'student',
    organizerName: 'Someone',
    organizerNetId: 'abc123',
    start: now.toISOString(),
    end: now.toISOString(),
    locationName: 'Somewhere',
    interestedCount: 0,
    updates: [],
    cancelled: false,
    createdAt: now.toISOString(),
    ...overrides,
  };
}

describe('isOngoing', () => {
  it('is true when start <= now < end', () => {
    const event = makeEvent({
      start: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      end: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    });
    expect(isOngoing(event, now)).toBe(true);
  });

  it('is false once the event has ended', () => {
    const event = makeEvent({
      start: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      end: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    });
    expect(isOngoing(event, now)).toBe(false);
  });
});

describe('isPast', () => {
  it('is true once the event has ended', () => {
    const event = makeEvent({ end: new Date(now.getTime() - 1000).toISOString() });
    expect(isPast(event, now)).toBe(true);
  });

  it('is true for a cancelled future event', () => {
    const event = makeEvent({
      end: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      cancelled: true,
    });
    expect(isPast(event, now)).toBe(true);
  });

  it('is false for an upcoming event', () => {
    const event = makeEvent({ end: new Date(now.getTime() + 1000).toISOString() });
    expect(isPast(event, now)).toBe(false);
  });
});

describe('formatEventTimeParts', () => {
  it('returns "Happening now" as the label with no range for an ongoing event', () => {
    const event = makeEvent({
      start: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      end: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    });
    expect(formatEventTimeParts(event, now)).toEqual({ label: 'Happening now', range: null });
  });

  it('labels a later-today event "Today" with a start–end range', () => {
    const event = makeEvent({
      start: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      end: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    });
    const parts = formatEventTimeParts(event, now);
    expect(parts.label).toBe('Today');
    expect(parts.range).toContain('–');
  });

  it('labels a next-day event "Tomorrow"', () => {
    const event = makeEvent({
      start: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      end: new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString(),
    });
    expect(formatEventTimeParts(event, now).label).toBe('Tomorrow');
  });

  it('labels a future day with its weekday/date', () => {
    const event = makeEvent({
      start: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    });
    const parts = formatEventTimeParts(event, now);
    expect(parts.label).not.toMatch(/Today|Tomorrow|Happening now/);
    expect(parts.range).not.toBeNull();
  });
});
