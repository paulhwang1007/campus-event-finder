import { EventImage } from './EventImage';
import { IconCalendar, IconMapPin } from './Icon';
import { formatEventTimeParts } from '../lib/time';
import { spotsLeft } from '../store/selectors';
import type { CampusEvent } from '../types';
import './EventCard.css';

interface Props {
  event: CampusEvent;
  now: Date;
}

export function EventCard({ event, now }: Props) {
  const left = spotsLeft(event);
  const time = formatEventTimeParts(event, now);

  return (
    <div className="event-card">
      <div className="event-card__body">
        <h2 className="event-card__title">{event.title}</h2>

        <div className="event-card__meta">
          <span>
            <IconCalendar />
            <span className="event-card__time-label">{time.label}</span>
            {time.range && <> · {time.range}</>}
          </span>
          <span>
            <IconMapPin /> {event.locationName}
          </span>
        </div>

        <EventImage event={event} className="event-card__image" />

        <div className="event-card__stats">
          {event.goingCount} going · {event.interestedCount} interested
          {left != null && (
            <>
              {' · '}
              <span className="event-card__spots-left">{left === 0 ? 'Full' : `${left} spots left`}</span>
            </>
          )}
        </div>

        <p className="event-card__snippet">{event.participation ?? event.description}</p>
      </div>
    </div>
  );
}
