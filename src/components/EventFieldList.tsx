import { format } from 'date-fns';
import { getCategory } from '../data/categories';
import { isOngoing } from '../lib/time';
import { spotsLeft } from '../store/selectors';
import type { CampusEvent } from '../types';
import './EventFieldList.css';

interface Props {
  event: CampusEvent;
  now: Date;
}

export function EventFieldList({ event, now }: Props) {
  const category = getCategory(event.category);
  const left = spotsLeft(event);
  const ongoing = isOngoing(event, now);

  return (
    <div className="event-fields">
      <span className="pill">
        {category.emoji} {category.label}
      </span>
      <h1 className="event-fields__title">{event.title}</h1>

      <div className="event-fields__organizer">
        👤 {event.organizerName}{' '}
        <span className="pill">{event.organizerType === 'club' ? 'Club' : 'Student'}</span>
      </div>

      <Field label="🕒 When">
        {ongoing && <span className="pill event-fields__now">Happening now</span>}{' '}
        {format(new Date(event.start), 'EEE MMM d, h:mm a')} – {format(new Date(event.end), 'h:mm a')}
      </Field>

      <Field label="📍 Where">
        {event.locationName}
        {event.locationNote ? ` — ${event.locationNote}` : ''}
      </Field>

      <Field label="About">{event.description}</Field>

      {event.participation && <Field label="What to know">{event.participation}</Field>}

      <Field label="Capacity">
        {event.capacity != null ? `${event.capacity} spots · ${left} left` : `${event.interestedCount} interested`}
      </Field>

      {event.accessibility && <Field label="♿ Accessibility">{event.accessibility}</Field>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="event-fields__field">
      <div className="event-fields__label">{label}</div>
      <div className="event-fields__value">{children}</div>
    </div>
  );
}
