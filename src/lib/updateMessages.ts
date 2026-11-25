import { format } from 'date-fns';
import type { EventUpdate } from '../types';
import { formatDayHeading } from './time';

/** e.g. "Today 5:00–8:00 PM" or "Sat Nov 28 6:30–9:00 PM". */
export function describeTime(start: Date, end: Date, now: Date): string {
  return `${formatDayHeading(start, now)} ${format(start, 'h:mm')}–${format(end, 'h:mm a')}`;
}

function withNote(message: string, note?: string): string {
  const trimmed = note?.trim();
  return trimmed ? `${message} ${trimmed}` : message;
}

export function timeChangeMessage(
  before: { start: Date; end: Date },
  after: { start: Date; end: Date },
  now: Date,
  note?: string,
): string {
  return withNote(
    `Time changed from ${describeTime(before.start, before.end, now)} to ${describeTime(after.start, after.end, now)}.`,
    note,
  );
}

export function locationChangeMessage(before: string, after: string, note?: string): string {
  return withNote(`Location changed from ${before} to ${after}.`, note);
}

/** Times are compared to the minute: the form can't express seconds. */
export function sameMinute(a: Date, b: Date): boolean {
  return Math.floor(a.getTime() / 60000) === Math.floor(b.getTime() / 60000);
}

export interface ChangeUpdate {
  type: EventUpdate['type'];
  message: string;
}

/**
 * The automatic updates an edit should post: one for a time change and one for a location
 * change. Other edits (title, description, photo, spots) don't notify anyone.
 */
export function updatesForEdit(
  before: { start: string; end: string; locationName: string },
  after: { start: string; end: string; locationName: string },
  now: Date,
): ChangeUpdate[] {
  const updates: ChangeUpdate[] = [];
  const old = { start: new Date(before.start), end: new Date(before.end) };
  const next = { start: new Date(after.start), end: new Date(after.end) };
  if (!sameMinute(old.start, next.start) || !sameMinute(old.end, next.end)) {
    updates.push({ type: 'time', message: timeChangeMessage(old, next, now) });
  }
  if (before.locationName.trim() !== after.locationName.trim()) {
    updates.push({ type: 'location', message: locationChangeMessage(before.locationName, after.locationName.trim()) });
  }
  return updates;
}
