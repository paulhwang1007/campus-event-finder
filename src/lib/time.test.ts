import { describe, expect, it } from 'vitest';
import { formatEventTime, isOngoing, isPast } from './time';
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

describe('formatEventTime', () => {
  it('shows "Happening now" for an ongoing event', () => {
    const event = makeEvent({
      start: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      end: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    });
    expect(formatEventTime(event, now)).toBe('Happening now');
  });

  it('shows "Today" for a later-today event', () => {
    const event = makeEvent({
      start: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      end: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    });
    expect(formatEventTime(event, now)).toContain('Today');
  });

  it('shows "Tomorrow" for a next-day event', () => {
    const event = makeEvent({
      start: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      end: new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString(),
    });
    expect(formatEventTime(event, now)).toContain('Tomorrow');
  });
});
