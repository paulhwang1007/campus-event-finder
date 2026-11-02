import { addDays, format, isSameDay } from 'date-fns';
import type { CampusEvent } from '../types';

export function isOngoing(event: CampusEvent, now: Date): boolean {
  return new Date(event.start) <= now && now < new Date(event.end);
}

export function isPast(event: CampusEvent, now: Date): boolean {
  return event.cancelled || new Date(event.end) < now;
}

export interface EventTimeParts {
  /** The urgency-colored segment, e.g. "Happening now", "Today", "Tomorrow", "Sat Oct 31". */
  label: string;
  /** The plain time range, e.g. "5:00 – 8:00 PM". Null when ongoing (label covers it all). */
  range: string | null;
}

export function formatEventTimeParts(event: CampusEvent, now: Date): EventTimeParts {
  if (isOngoing(event, now)) return { label: 'Happening now', range: null };

  const start = new Date(event.start);
  const end = new Date(event.end);
  const range = `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`;

  if (isSameDay(start, now)) return { label: 'Today', range };
  if (isSameDay(start, addDays(now, 1))) return { label: 'Tomorrow', range };
  return { label: format(start, 'EEE MMM d'), range };
}

export function formatDayHeading(date: Date, now: Date): string {
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, addDays(now, 1))) return 'Tomorrow';
  return format(date, 'EEE MMM d');
}

export function sameDay(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}
