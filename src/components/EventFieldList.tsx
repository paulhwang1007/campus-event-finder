import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { IconAccessibility, IconCalendar, IconMapPin } from './Icon';
import { isOngoing } from '../lib/time';
import type { CampusEvent } from '../types';
import './EventFieldList.css';

interface Props {
  event: CampusEvent;
  now: Date;
}

export function EventFieldList({ event, now }: Props) {
  const ongoing = isOngoing(event, now);

  return (
    <div className="event-fields">
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
