import { format } from 'date-fns';
import { useState } from 'react';
import { combineDateAndTime } from '../lib/validation';
import { formatDayHeading } from '../lib/time';
import { useAppStore } from '../store/useAppStore';
import type { CampusEvent, EventUpdate, NewUpdateInput } from '../types';
import { Sheet } from './Sheet';

const MESSAGE_MAX = 280;
const PAST_GRACE_MS = 60 * 60 * 1000;

const TYPES: { id: EventUpdate['type']; label: string }[] = [
  { id: 'time', label: 'Time' },
  { id: 'location', label: 'Location' },
  { id: 'note', label: 'Note' },
];

function describeTime(start: Date, end: Date, now: Date): string {
  return `${formatDayHeading(start, now)} ${format(start, 'h:mm')}–${format(end, 'h:mm a')}`;
}

interface Props {
  event: CampusEvent;
  open: boolean;
  onClose: () => void;
}

/**
 * Lets a host tell everyone who saved the event what changed. A time or location change also
 * updates the event, and the message records the old and new values (PRD FR6.2).
 */
export function PostUpdateSheet({ event, open, onClose }: Props) {
  const postUpdate = useAppStore((s) => s.postUpdate);
  const showToast = useAppStore((s) => s.showToast);

  const oldStart = new Date(event.start);
  const oldEnd = new Date(event.end);
  const [type, setType] = useState<EventUpdate['type']>('note');
  const [date, setDate] = useState(format(oldStart, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(oldStart, 'HH:mm'));
  const [endTime, setEndTime] = useState(format(oldEnd, 'HH:mm'));
  const [location, setLocation] = useState(event.locationName);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const day = new Date(`${date}T00:00`);
  const newStart = combineDateAndTime(day, startTime);
  const newEnd = combineDateAndTime(day, endTime);
  const trimmedNote = note.trim();
  const trimmedLocation = location.trim();

  // Build the update (or the reason it can't be posted yet).
  let input: NewUpdateInput | null = null;
  let problem: string | null = null;
  if (type === 'time') {
    if (!newStart || !newEnd || Number.isNaN(day.getTime())) problem = 'Pick the new date and time.';
    else if (newEnd <= newStart) problem = 'End time must be after start time.';
    else if (newStart.getTime() < now.getTime() - PAST_GRACE_MS) problem = "The new time can't be in the past.";
    else if (newStart.getTime() === oldStart.getTime() && newEnd.getTime() === oldEnd.getTime())
      problem = "That's the same time as before.";
    else {
      const message = `Time changed from ${describeTime(oldStart, oldEnd, now)} to ${describeTime(newStart, newEnd, now)}.${trimmedNote ? ` ${trimmedNote}` : ''}`;
      input = { type, message, start: newStart.toISOString(), end: newEnd.toISOString() };
    }
  } else if (type === 'location') {
    if (!trimmedLocation) problem = 'Enter the new location.';
    else if (trimmedLocation === event.locationName) problem = "That's the same location as before.";
    else {
      const message = `Location changed from ${event.locationName} to ${trimmedLocation}.${trimmedNote ? ` ${trimmedNote}` : ''}`;
      input = { type, message, locationName: trimmedLocation };
    }
  } else if (!trimmedNote) {
    problem = 'Write a short note.';
  } else {
    input = { type, message: trimmedNote };
  }
  if (input && input.message.length > MESSAGE_MAX) {
    problem = `Keep the update under ${MESSAGE_MAX} characters (now ${input.message.length}).`;
    input = null;
  }

  async function submit() {
    if (!input) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    const ok = await postUpdate(event.id, input);
    setSubmitting(false);
    if (ok) {
      showToast('Update posted. People who saved this event will see it.');
      setNote('');
      setError(null);
      onClose();
    }
  }

  return (
    <Sheet open={open} title="Post an update" onClose={onClose}>
      <p className="sheet-hint">Everyone who saved or joined this event sees a "new update" dot.</p>

      <div className="sheet-segments" role="radiogroup" aria-label="What changed?">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={type === t.id}
            className="sheet-segment"
            onClick={() => {
              setType(t.id);
              setError(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {type === 'time' && (
        <>
          <label className="sheet-field">
            Date
            <input className="sheet-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="sheet-field__row">
            <label className="sheet-field">
              Starts
              <input
                className="sheet-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <label className="sheet-field">
              Ends
              <input className="sheet-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          </div>
        </>
      )}

      {type === 'location' && (
        <label className="sheet-field">
          New location
          <input
            className="sheet-input"
            value={location}
            maxLength={120}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
      )}

      <label className="sheet-field">
        {type === 'note' ? 'Message' : 'Add a note (optional)'}
        <textarea
          className="sheet-input"
          value={note}
          maxLength={MESSAGE_MAX}
          placeholder={type === 'note' ? 'e.g. Bring a water bottle, it’s going to be hot.' : 'e.g. Sorry for the change!'}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {input && type !== 'note' && (
        <div className="sheet-preview" aria-live="polite">
          <span className="sheet-preview__label">People will see</span>
          {input.message}
        </div>
      )}

      {error && (
        <p className="sheet-error" role="alert">
          {error}
        </p>
      )}

      <div className="sheet-actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn" disabled={submitting} onClick={() => void submit()}>
          {submitting ? 'Posting…' : 'Post update'}
        </button>
      </div>
    </Sheet>
  );
}
