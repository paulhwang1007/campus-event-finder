import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categories } from '../data/categories';
import { DateTimePicker, formatTime } from '../components/DateTimePicker';
import { IconArrowLeft, IconCalendar, IconChevronRight, IconMapPin, IconMinus, IconPlus } from '../components/Icon';
import { combineDateAndTime, validateEventForm, type EventDraft } from '../lib/validation';
import { formatDayHeading } from '../lib/time';
import { useAppStore } from '../store/useAppStore';
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

function isDraftTouched(draft: EventDraft): boolean {
  return (
    draft.title !== '' ||
    draft.description !== '' ||
    draft.category !== null ||
    draft.date !== null ||
    draft.locationName !== '' ||
    draft.clubName !== ''
  );
}

export function CreateEvent() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const createEvent = useAppStore((s) => s.createEvent);
  const [view, setView] = useState<'form' | 'datetime'>('form');
  const [draft, setDraft] = useState<EventDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  function update<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleBack() {
    if (isDraftTouched(draft) && !window.confirm('Discard this event?')) return;
    navigate(-1);
  }

  function handleSubmit() {
    const now = new Date();
    const formErrors = validateEventForm(draft, now);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      const firstKey = Object.keys(formErrors)[0];
      fieldRefs.current[firstKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const start = combineDateAndTime(draft.date!, draft.startTime)!;
    const end = combineDateAndTime(draft.date!, draft.endTime)!;
    const newId = createEvent({
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category!,
      organizerType: draft.organizerType,
      organizerName: draft.organizerType === 'club' ? draft.clubName.trim() : (user?.name ?? 'You'),
      start: start.toISOString(),
      end: end.toISOString(),
      locationName: draft.locationName.trim(),
      capacity: draft.capacityMode === 'limited' ? Number(draft.capacityValue) : undefined,
    });
    navigate(`/events/${newId}`);
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

  const dateTimeLabel =
    draft.date && draft.startTime && draft.endTime
      ? `${formatDayHeading(draft.date, new Date())} · ${formatTime(draft.startTime)} - ${formatTime(draft.endTime)}`
      : 'Pick a date and time';

  return (
    <div className="screen">
      <button type="button" className="create-event__back" onClick={handleBack} aria-label="Back">
        <IconArrowLeft /> Back
      </button>

      <h1 className="create-event__heading">Create event</h1>

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
          />
        </div>
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
      {errors.policy && <p className="create-event__error">{errors.policy}</p>}

      <button type="button" className="create-event__submit" onClick={handleSubmit}>
        Post event
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
