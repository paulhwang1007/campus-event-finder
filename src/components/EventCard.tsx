import { getCategory } from '../data/categories';
import { IconCalendar, IconMapPin, IconSparkle } from './Icon';
import { formatEventTimeParts } from '../lib/time';
import { spotsLeft } from '../store/selectors';
import type { CampusEvent } from '../types';
import './EventCard.css';

interface Props {
  event: CampusEvent;
  isOutsideInterests?: boolean;
  now: Date;
}

export function EventCard({ event, isOutsideInterests, now }: Props) {
  const category = getCategory(event.category);
  const left = spotsLeft(event);
  const CategoryIcon = category.icon;
  const time = formatEventTimeParts(event, now);

  return (
    <div className="event-card">
      <div className="event-card__body">
        <div className="event-card__top">
          <span className="pill event-card__category-pill">{category.label}</span>
          {isOutsideInterests && (
            <span className="pill event-card__new">
              <IconSparkle /> Something new
            </span>
          )}
        </div>

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

        <div className="event-card__organizer">
          {event.organizerName}{' '}
          <span className="pill">{event.organizerType === 'club' ? 'Club' : 'Student'}</span>
        </div>

        <div className="event-card__image" style={{ background: category.gradient }}>
          <CategoryIcon size={40} className="event-card__image-icon" />
        </div>

        <div className="event-card__stats">
          {event.interestedCount} interested
          {left != null && (
            <>
              {' · '}
              <span className="event-card__spots-left">{left} spots left</span>
            </>
          )}
        </div>

        <p className="event-card__snippet">{event.participation ?? event.description}</p>
      </div>
    </div>
  );
}
