import { format, startOfDay } from 'date-fns';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { categories } from '../data/categories';
import { PLACES } from '../data/places';
import { EventNotFound } from '../components/EventNotFound';
import { DateTimePicker, formatTime } from '../components/DateTimePicker';
import {
  IconArrowLeft,
  IconCalendar,
  IconChevronRight,
  IconMapPin,
  IconMinus,
  IconPlus,
  IconCamera,
  IconX,
} from '../components/Icon';
import { preparePhoto } from '../lib/image';
import { combineDateAndTime, validateEventForm, type EditContext, type EventDraft } from '../lib/validation';
import { formatDayHeading, isPast } from '../lib/time';
import type { CampusEvent, PhotoChange } from '../types';
import { useAppStore } from '../store/useAppStore';
import { SuccessCheck } from '../components/SuccessCheck';
import './CreateEvent.css';

const EMPTY_DRAFT: EventDraft = {
  title: '',
  description: '',
  category: null,
  date: null,
  startTime: '',
  endTime: '',
  locationName: '',
  capacityMode: 'unlimited',
  capacityValue: '10',
  organizerType: 'student',
  clubName: '',
  policyAck: false,
};

/** The form filled in from an existing event, for editing. */
function draftFromEvent(event: CampusEvent): EventDraft {
  const start = new Date(event.start);
  return {
    title: event.title,
    description: event.description,
    category: event.category,
    date: startOfDay(start),
    startTime: format(start, 'HH:mm'),
    endTime: format(new Date(event.end), 'HH:mm'),
    locationName: event.locationName,
    capacityMode: event.capacity != null ? 'limited' : 'unlimited',
    capacityValue: String(event.capacity ?? 10),
    organizerType: event.organizerType,
    clubName: event.organizerType === 'club' ? event.organizerName : '',
    policyAck: true,
  };
}

function draftsDiffer(a: EventDraft, b: EventDraft): boolean {
  return (Object.keys(a) as (keyof EventDraft)[]).some((key) => {
    const x = a[key];
    const y = b[key];
    if (x instanceof Date || y instanceof Date) return (x as Date | null)?.getTime() !== (y as Date | null)?.getTime();
    return x !== y;
  });
}

export function CreateEvent() {
  return <EventForm />;
}

/** /events/:id/edit: only the host, and only while the event is still on. */
export function EditEvent() {
  const { id } = useParams();
  const user = useAppStore((s) => s.user);
  const event = useAppStore((s) => s.events.find((e) => e.id === id));
  if (!event) return <EventNotFound />;
  const isHost = user != null && event.organizerNetId === user.netId;
  if (!isHost || event.cancelled || isPast(event, new Date())) return <Navigate to={`/events/${event.id}`} replace />;
  return <EventForm key={event.id} event={event} />;
}

/** The Create form, which also edits an existing event when given one. */
function EventForm({ event }: { event?: CampusEvent }) {
  const isEdit = event != null;
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const createEvent = useAppStore((s) => s.createEvent);
  const editEvent = useAppStore((s) => s.editEvent);
  const showToast = useAppStore((s) => s.showToast);
  const initialDraft = useMemo(() => (event ? draftFromEvent(event) : EMPTY_DRAFT), [event]);
  const [view, setView] = useState<'form' | 'datetime' | 'success'>('form');
  const [draft, setDraft] = useState<EventDraft>(initialDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [postedId, setPostedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  /** Editing: the host removed the event's existing photo. */
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const existingPhoto = !photo && !photoRemoved ? event?.photoUrl : undefined;
  const shownPhoto = photoPreview ?? existingPhoto ?? null;
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Free the preview's object URL when it changes or the form unmounts.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    setPreparingPhoto(true);
    try {
      const prepared = await preparePhoto(file);
      setPhoto(prepared);
      setPhotoPreview(URL.createObjectURL(prepared));
      setPhotoRemoved(false);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Couldn't use that photo.");
    } finally {
      setPreparingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (isEdit) setPhotoRemoved(true);
  }

  function update<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const hasChanges = draftsDiffer(draft, initialDraft) || photo != null || photoRemoved;

  function handleBack() {
    if (hasChanges && !window.confirm(isEdit ? 'Discard your changes?' : 'Discard this event?')) return;
    navigate(-1);
  }

  async function handleSubmit() {
    if (submitting) return;
    const now = new Date();
    const editContext: EditContext | undefined = event
      ? { originalStart: new Date(event.start), goingCount: event.goingCount }
      : undefined;
    const formErrors = validateEventForm(draft, now, editContext);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      const firstKey = Object.keys(formErrors)[0];
      fieldRefs.current[firstKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const start = combineDateAndTime(draft.date!, draft.startTime)!;
    const end = combineDateAndTime(draft.date!, draft.endTime)!;
    const timeUnchanged =
      event != null &&
      draft.date?.getTime() === initialDraft.date?.getTime() &&
      draft.startTime === initialDraft.startTime &&
      draft.endTime === initialDraft.endTime;
    const input = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category!,
      organizerType: draft.organizerType,
      organizerName: draft.organizerType === 'club' ? draft.clubName.trim() : (user?.name ?? 'You'),
      // An untouched time keeps the exact original value (the form only shows minutes).
      start: timeUnchanged ? event.start : start.toISOString(),
      end: timeUnchanged ? event.end : end.toISOString(),
      locationName: draft.locationName.trim(),
      capacity: draft.capacityMode === 'limited' ? Number(draft.capacityValue) : undefined,
    };

    if (event) {
      const photoChange: PhotoChange = photo
        ? { kind: 'replace', photo }
        : photoRemoved
          ? { kind: 'remove' }
          : { kind: 'keep' };
      setSubmitting(true);
      const ok = await editEvent(event.id, input, photoChange);
      setSubmitting(false);
      if (ok) {
        showToast('Changes saved');
        navigate(`/events/${event.id}`, { replace: true });
      }
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const newId = await createEvent(input, photo);
      setPostedId(newId);
      setView('success');
    } catch (err) {
      console.error('Failed to create event', err);
      setSubmitError("Couldn't post your event. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (view === 'datetime') {
    return (
      <DateTimePicker
        initialDate={draft.date}
        initialStart={draft.startTime}
        initialEnd={draft.endTime}
        onBack={() => setView('form')}
        onConfirm={(date, start, end) => {
          setDraft((d) => ({ ...d, date, startTime: start, endTime: end }));
          setView('form');
        }}
      />
    );
  }

  if (view === 'success') {
    return (
      <div className="screen create-event__success">
        <SuccessCheck title="Event posted">
          <p className="create-event__success-subtext">It's live on Discover now.</p>
          <button type="button" className="btn" onClick={() => navigate(`/events/${postedId}`)}>
            View event
          </button>
        </SuccessCheck>
      </div>
    );
  }

  const dateTimeLabel =
    draft.date && draft.startTime && draft.endTime
      ? `${formatDayHeading(draft.date, new Date())} · ${formatTime(draft.startTime)} - ${formatTime(draft.endTime)}`
      : 'Pick a date and time';

  return (
    <div className="screen">
      <button type="button" className="create-event__back" onClick={handleBack} aria-label="Back">
        <IconArrowLeft /> Back
      </button>

      <h1 className="page-heading">{isEdit ? 'Edit event' : 'Create event'}</h1>
      {isEdit && (
        <p className="create-event__edit-hint">
          Changing the time or location posts an update, so everyone who saved this event is told.
        </p>
      )}

      <Field label="Event name" error={errors.title} refEl={(el) => (fieldRefs.current.title = el)}>
        <input
          type="text"
          className="create-event__input"
          value={draft.title}
          onChange={(e) => update('title', e.target.value)}
          maxLength={60}
        />
      </Field>

      <Field label="Category" error={errors.category} refEl={(el) => (fieldRefs.current.category = el)}>
        <div className="create-event__chip-row">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`create-event__chip${draft.category === c.id ? ' create-event__chip--active' : ''}`}
              onClick={() => update('category', c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Date and time" error={errors.date} refEl={(el) => (fieldRefs.current.date = el)}>
        <button type="button" className="create-event__date-button" onClick={() => setView('datetime')}>
          <IconCalendar />
          <span>{dateTimeLabel}</span>
          <IconChevronRight size={16} />
        </button>
      </Field>

      <Field label="Location" error={errors.locationName} refEl={(el) => (fieldRefs.current.locationName = el)}>
        <div className="create-event__input-icon">
          <IconMapPin />
          <input
            type="text"
            className="create-event__input create-event__input--with-icon"
            value={draft.locationName}
            onChange={(e) => update('locationName', e.target.value)}
            list="create-event-places"
            autoComplete="off"
          />
          <datalist id="create-event-places">
            {PLACES.map((place) => (
              <option key={place.name} value={place.name} />
            ))}
          </datalist>
        </div>
      </Field>

      <Field label="Photo (optional)" error={photoError ?? undefined}>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="create-event__photo-input"
          id="create-event-photo"
          onChange={(e) => void handlePhoto(e.target.files?.[0])}
        />
        {shownPhoto ? (
          <div className="create-event__photo-preview">
            <img src={shownPhoto} alt={photoPreview ? 'Selected event photo' : 'Current event photo'} />
            <div className="create-event__photo-actions">
              <label htmlFor="create-event-photo" className="create-event__photo-change">
                Change
              </label>
              <button type="button" className="create-event__photo-remove" aria-label="Remove photo" onClick={removePhoto}>
                <IconX size={14} />
              </button>
            </div>
          </div>
        ) : (
          <label htmlFor="create-event-photo" className="create-event__photo-drop">
            <IconCamera size={22} />
            <span>{preparingPhoto ? 'Preparing photo…' : 'Add a photo'}</span>
            <span className="create-event__photo-hint">Events with photos get noticed more</span>
          </label>
        )}
      </Field>

      <Field label="Spots" error={errors.capacity} refEl={(el) => (fieldRefs.current.capacity = el)}>
        <div className="create-event__spots-row">
          {draft.capacityMode === 'limited' ? (
            <div className="create-event__stepper">
              <button
                type="button"
                aria-label="Decrease spots"
                onClick={() => update('capacityValue', String(Math.max(2, Number(draft.capacityValue) - 1)))}
              >
                <IconMinus size={14} />
              </button>
              <span>{draft.capacityValue}</span>
              <button
                type="button"
                aria-label="Increase spots"
                onClick={() => update('capacityValue', String(Math.min(500, Number(draft.capacityValue) + 1)))}
              >
                <IconPlus size={14} />
              </button>
            </div>
          ) : (
            <div className="create-event__stepper create-event__stepper--disabled">No limit</div>
          )}
          <button
            type="button"
            className="create-event__limit-toggle"
            onClick={() => update('capacityMode', draft.capacityMode === 'limited' ? 'unlimited' : 'limited')}
          >
            {draft.capacityMode === 'limited' ? 'Set no limit' : 'Set a limit'}
          </button>
        </div>
      </Field>

      <Field label="Posting as">
        <div className="create-event__chip-row">
          <button
            type="button"
            className={`create-event__chip${draft.organizerType === 'student' ? ' create-event__chip--active' : ''}`}
            onClick={() => update('organizerType', 'student')}
          >
            Me (Student)
          </button>
          <button
            type="button"
            className={`create-event__chip${draft.organizerType === 'club' ? ' create-event__chip--active' : ''}`}
            onClick={() => update('organizerType', 'club')}
          >
            A club
          </button>
        </div>
      </Field>

      {draft.organizerType === 'club' && (
        <Field label="Club name" error={errors.clubName} refEl={(el) => (fieldRefs.current.clubName = el)}>
          <input
            type="text"
            className="create-event__input"
            value={draft.clubName}
            onChange={(e) => update('clubName', e.target.value)}
          />
        </Field>
      )}

      <Field label="About" error={errors.description} refEl={(el) => (fieldRefs.current.description = el)}>
        <textarea
          className="create-event__textarea"
          value={draft.description}
          onChange={(e) => update('description', e.target.value)}
          maxLength={500}
          rows={4}
        />
      </Field>

      {!isEdit && (
        <label
          className="create-event__policy"
          ref={(el) => {
            fieldRefs.current.policy = el;
          }}
        >
          <input
            type="checkbox"
            checked={draft.policyAck}
            onChange={(e) => update('policyAck', e.target.checked)}
          />
          <span>I understand Cornell's space reservation and conduct policies.</span>
        </label>
      )}
      {errors.policy && <p className="create-event__error">{errors.policy}</p>}

      {submitError && <p className="create-event__error">{submitError}</p>}
      <button type="button" className="create-event__submit" onClick={handleSubmit} disabled={submitting}>
        {isEdit ? (submitting ? 'Saving…' : 'Save changes') : submitting ? 'Posting…' : 'Post event'}
      </button>
    </div>
  );
}

function Field({
  label,
  error,
  refEl,
  children,
}: {
  label: string;
  error?: string;
  refEl?: (el: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <div className="create-event__field" ref={refEl}>
      <span className="create-event__label">{label}</span>
      {children}
      {error && <p className="create-event__error">{error}</p>}
    </div>
  );
}
