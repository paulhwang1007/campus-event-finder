import { getCategory } from '../data/categories';
import { IconCalendar, IconMapPin, IconSparkle } from './Icon';
import { formatEventTime } from '../lib/time';
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

  return (
    <div className="event-card">
      <div className="event-card__image" style={{ background: category.gradient }}>
        <CategoryIcon size={48} className="event-card__image-icon" />
      </div>

      <div className="event-card__body">
        <div className="event-card__top">
          <span className="pill">{category.label}</span>
          {isOutsideInterests && (
            <span className="pill event-card__new">
              <IconSparkle /> Something new
            </span>
          )}
        </div>

        <h2 className="event-card__title">{event.title}</h2>

        <div className="event-card__meta">
          <span>
            <IconCalendar /> {formatEventTime(event, now)}
          </span>
          <span>
            <IconMapPin /> {event.locationName}
          </span>
          <span>
            {event.organizerName}{' '}
            <span className="pill">{event.organizerType === 'club' ? 'Club' : 'Student'}</span>
          </span>
        </div>

        <div className="event-card__stats">
          {event.interestedCount} interested
          {left != null && ` · ${left} spots left`}
        </div>
      </div>
    </div>
  );
}
