import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { getCategory } from '../data/categories';
import { IconAccessibility, IconCalendar, IconMapPin, IconUser } from './Icon';
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
  const CategoryIcon = category.icon;

  return (
    <div className="event-fields">
      <span className="pill">
        <CategoryIcon size={14} /> {category.label}
      </span>
      <h1 className="event-fields__title">{event.title}</h1>

      <div className="event-fields__organizer">
        <IconUser size={14} /> {event.organizerName}{' '}
        <span className="pill">{event.organizerType === 'club' ? 'Club' : 'Student'}</span>
      </div>

      <Field icon={<IconCalendar size={14} />} label="When">
        {ongoing && <span className="pill event-fields__now">Happening now</span>}{' '}
        {format(new Date(event.start), 'EEE MMM d, h:mm a')} – {format(new Date(event.end), 'h:mm a')}
      </Field>

      <Field icon={<IconMapPin size={14} />} label="Where">
        {event.locationName}
        {event.locationNote ? ` — ${event.locationNote}` : ''}
      </Field>

      <Field label="About">{event.description}</Field>

      {event.participation && <Field label="What to know">{event.participation}</Field>}

      <Field label="Capacity">
        {event.capacity != null ? `${event.capacity} spots · ${left} left` : `${event.interestedCount} interested`}
      </Field>

      {event.accessibility && (
        <Field icon={<IconAccessibility size={14} />} label="Accessibility">
          {event.accessibility}
        </Field>
      )}
    </div>
  );
}

function Field({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="event-fields__field">
      <div className="event-fields__label">
        {icon} {label}
      </div>
      <div className="event-fields__value">{children}</div>
    </div>
  );
}
