import { format } from 'date-fns';
import type { EventUpdate, LatLng } from '../types';
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

/** Rough distance in meters between two pins (accurate enough at campus scale). */
export function metersBetween(a: LatLng, b: LatLng): number {
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot((a.lat - b.lat) * metersPerDegLat, (a.lng - b.lng) * metersPerDegLng);
}

/** A pin moved far enough that people should be told (or was added/removed). */
const PIN_MOVE_METERS = 30;
function pinMoved(before?: LatLng, after?: LatLng): boolean {
  if (!before || !after) return false; // adding a first pin or removing one isn't a move
  return metersBetween(before, after) > PIN_MOVE_METERS;
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
  before: { start: string; end: string; locationName: string; locationCoords?: LatLng },
  after: { start: string; end: string; locationName: string; locationCoords?: LatLng },
  now: Date,
  /** Optional host note, added to the end of the last automatic update. */
  note?: string,
): ChangeUpdate[] {
  const updates: ChangeUpdate[] = [];
  const old = { start: new Date(before.start), end: new Date(before.end) };
  const next = { start: new Date(after.start), end: new Date(after.end) };
  if (!sameMinute(old.start, next.start) || !sameMinute(old.end, next.end)) {
    updates.push({ type: 'time', message: timeChangeMessage(old, next, now) });
  }
  if (
    before.locationName.trim() !== after.locationName.trim() ||
    pinMoved(before.locationCoords, after.locationCoords)
  ) {
    const sameName = before.locationName.trim() === after.locationName.trim();
    updates.push({
      type: 'location',
      message: sameName
        ? `New spot for ${after.locationName.trim()}: check the map for the exact place.`
        : locationChangeMessage(before.locationName, after.locationName.trim()),
    });
  }
  const last = updates[updates.length - 1];
  if (last) last.message = withNote(last.message, note);
  return updates;
}

/** Longest message the database accepts for one update. */
export const UPDATE_MESSAGE_MAX = 280;
