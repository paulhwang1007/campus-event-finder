import { getCategory } from '../data/categories';
import { IconCalendar, IconCheck, IconMapPin, IconX } from './Icon';
import { formatEventTimeParts } from '../lib/time';
import { isFull, spotsLeft } from '../store/selectors';
import type { CampusEvent } from '../types';
import './InterestedCard.css';

interface Props {
  event: CampusEvent;
  now: Date;
  isGoing: boolean;
  onOpen: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onRemove: () => void;
}

export function InterestedCard({ event, now, isGoing, onOpen, onJoin, onLeave, onRemove }: Props) {
  const category = getCategory(event.category);
  const CategoryIcon = category.icon;
  const left = spotsLeft(event);
  const time = formatEventTimeParts(event, now);

  return (
    <div className="interested-card">
      <button
        type="button"
        className="interested-card__remove"
        aria-label={`Remove ${event.title}`}
        onClick={onRemove}
      >
        <IconX size={14} />
      </button>

      <div
        className="interested-card__body"
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onOpen();
        }}
      >
        <span className="interested-card__pills">
          <span className="pill interested-card__category-pill">{category.label}</span>
          {event.cancelled && <span className="pill interested-card__cancelled-pill">Cancelled</span>}
        </span>

        <h3 className="interested-card__title">{event.title}</h3>

        <div className="interested-card__meta">
          <span>
            <IconCalendar />
            <span className="interested-card__time-label">{time.label}</span>
            {time.range && <> · {time.range}</>}
          </span>
          <span>
            <IconMapPin /> {event.locationName}
          </span>
        </div>

        <div className="interested-card__organizer">
          {event.organizerName}{' '}
          <span className="pill">{event.organizerType === 'club' ? 'Club' : 'Student'}</span>
        </div>

        <div className="interested-card__image" style={{ background: category.gradient }}>
          <CategoryIcon size={36} className="interested-card__image-icon" />
        </div>

        <div className="interested-card__stats">
          {event.interestedCount} interested
          {left != null && (
            <>
              {' · '}
              <span className="interested-card__spots-left">{left === 0 ? 'Full' : `${left} spots left`}</span>
            </>
          )}
        </div>

        <p className="interested-card__snippet">{event.participation ?? event.description}</p>
      </div>

      {isGoing ? (
        <button
          type="button"
          className="interested-card__cta interested-card__cta--going"
          onClick={onLeave}
          disabled={event.cancelled}
          aria-label={`You're going to ${event.title}. Tap if you can't make it.`}
        >
          <IconCheck size={16} /> Going · Can't make it?
        </button>
      ) : (
        <button
          type="button"
          className="interested-card__cta"
          onClick={onJoin}
          disabled={event.cancelled || isFull(event)}
        >
          {event.cancelled ? 'Cancelled' : isFull(event) ? 'Event full' : 'Join event'}
        </button>
      )}
    </div>
  );
}
