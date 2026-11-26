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
    const start = combineDateAndTime(draft.date, draft.startTime);
    const end = combineDateAndTime(draft.date, draft.endTime);
    if (!start || !end) {
      errors.date = 'Pick a date and time.';
    } else if (end <= start) {
      errors.date = 'End time must be after start time.';
    } else if (
      start.getTime() < now.getTime() - PAST_GRACE_MS &&
      !(edit && Math.floor(start.getTime() / 60000) === Math.floor(edit.originalStart.getTime() / 60000))
    ) {
      errors.date = "Start time can't be in the past.";
    }
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
