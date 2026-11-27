import type { CategoryId, LatLng, OrganizerType } from '../types';

export interface EventDraft {
  title: string;
  description: string;
  category: CategoryId | null;
  date: Date | null;
  startTime: string;
  endTime: string;
  locationName: string;
  /** Map pin from the location picker; optional (a name alone is allowed). */
  locationCoords?: LatLng | null;
  capacityMode: 'limited' | 'unlimited';
  capacityValue: string;
  organizerType: OrganizerType;
  clubName: string;
  policyAck: boolean;
}

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 500;
const PAST_GRACE_MS = 60 * 60 * 1000;

export function combineDateAndTime(date: Date, time: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const combined = new Date(date);
  combined.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return combined;
}

/** Extra rules when a host edits an existing event. */
export interface EditContext {
  /** The event's current start. Keeping it is allowed even if it's already in the past (the event started). */
  originalStart: Date;
  /** People already going: spots can't go below this. */
  goingCount: number;
}

function toMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function fromMinutes(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * When the start time changes, move the end so the event keeps the same length
 * (e.g. 5–6 PM, start moved to 8 PM → 8–9 PM). Ends at 11:59 PM at the latest, since an
 * event has one date. A previously invalid range gets a 1-hour default.
 */
export function shiftEndWithStart(prevStart: string, prevEnd: string, nextStart: string): string {
  const a = toMinutes(prevStart);
  const b = toMinutes(prevEnd);
  const c = toMinutes(nextStart);
  if (c == null) return prevEnd;
  const length = a != null && b != null && b > a ? b - a : 60;
  return fromMinutes(Math.min(c + length, 23 * 60 + 59));
}

/**
 * Problem with a date + start/end time, or null if it's fine. Shared by the date & time
 * picker (shown as you pick) and the form check on Post.
 * `keepStart`: when editing, an event that already started may keep its original start time.
 */
export function timeRangeError(date: Date, startTime: string, endTime: string, now: Date, keepStart?: Date): string | null {
  const start = combineDateAndTime(date, startTime);
  const end = combineDateAndTime(date, endTime);
  if (!start || !end) return 'Pick a start and end time.';
  if (end <= start) return 'End time must be after start time.';
  const unchangedStart = keepStart != null && Math.floor(start.getTime() / 60000) === Math.floor(keepStart.getTime() / 60000);
  if (start.getTime() < now.getTime() - PAST_GRACE_MS && !unchangedStart) return "Start time can't be in the past.";
  return null;
}

export function validateEventForm(draft: EventDraft, now: Date, edit?: EditContext): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!draft.title.trim()) errors.title = 'Title is required.';
  else if (draft.title.length > TITLE_MAX) errors.title = `Title must be ${TITLE_MAX} characters or fewer.`;

  if (!draft.description.trim()) errors.description = 'Description is required.';
  else if (draft.description.length > DESCRIPTION_MAX)
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;

  if (!draft.category) errors.category = 'Pick a category.';

  if (!draft.date || !draft.startTime || !draft.endTime) {
    errors.date = 'Pick a date and time.';
  } else {
    const problem = timeRangeError(draft.date, draft.startTime, draft.endTime, now, edit?.originalStart);
    if (problem) errors.date = problem;
  }

  if (!draft.locationName.trim()) errors.locationName = 'Location is required.';

  if (draft.capacityMode === 'limited') {
    const value = Number(draft.capacityValue);
    if (!Number.isInteger(value) || value < 2 || value > 500) {
      errors.capacity = 'Capacity must be a number between 2 and 500.';
    } else if (edit && value < edit.goingCount) {
      errors.capacity = `${edit.goingCount} people are going, so spots can't be lower than ${edit.goingCount}.`;
    }
  }

  if (draft.organizerType === 'club' && !draft.clubName.trim()) {
    errors.clubName = 'Club name is required.';
  }

  // Already acknowledged when the event was first posted.
  if (!edit && !draft.policyAck) {
    errors.policy = 'You must acknowledge the policy before posting.';
  }

  return errors;
}
