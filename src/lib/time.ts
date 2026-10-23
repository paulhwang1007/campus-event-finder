import { addDays, format, isSameDay } from 'date-fns';
import type { CampusEvent } from '../types';

export function isOngoing(event: CampusEvent, now: Date): boolean {
  return new Date(event.start) <= now && now < new Date(event.end);
}

export function isPast(event: CampusEvent, now: Date): boolean {
  return event.cancelled || new Date(event.end) < now;
}

export function formatEventTime(event: CampusEvent, now: Date): string {
  if (isOngoing(event, now)) return 'Happening now';

  const start = new Date(event.start);
  const time = format(start, 'h:mm a');

  if (isSameDay(start, now)) return `Today · ${time}`;
  if (isSameDay(start, addDays(now, 1))) return `Tomorrow · ${time}`;
  return `${format(start, 'EEE MMM d')} · ${time}`;
}

export function formatDayHeading(date: Date, now: Date): string {
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, addDays(now, 1))) return 'Tomorrow';
  return format(date, 'EEE MMM d');
}

export function sameDay(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}
