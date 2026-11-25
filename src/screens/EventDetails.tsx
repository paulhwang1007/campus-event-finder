import { motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCategory } from '../data/categories';
import { EventFieldList } from '../components/EventFieldList';
import { EventNotFound } from '../components/EventNotFound';
import { IconArrowLeft, IconBookmark, IconCheck } from '../components/Icon';
import { UpdateList } from '../components/UpdateList';
import { isFull, isPast, spotsLeft } from '../store/selectors';
import { useAppStore } from '../store/useAppStore';
import type { CampusEvent } from '../types';
import './EventDetails.css';

export function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const events = useAppStore((s) => s.events);
  const savedIds = useAppStore((s) => s.savedIds);
  const confirmedIds = useAppStore((s) => s.confirmedIds);
  const markUpdatesSeen = useAppStore((s) => s.markUpdatesSeen);

  const event = events.find((e) => e.id === id);
  const now = useMemo(() => new Date(), [events]);

  useEffect(() => {
    if (id) markUpdatesSeen(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!event) return <EventNotFound />;

  const category = getCategory(event.category);
  const CategoryIcon = category.icon;
  const left = spotsLeft(event);
  const isHost = user != null && event.organizerNetId === user.netId;

  return (
    <div className="screen">
      <button type="button" className="event-details__back" onClick={() => navigate(-1)} aria-label="Back">
        <IconArrowLeft /> Back
      </button>

      {event.cancelled && <div className="event-details__cancelled">This event was cancelled.</div>}

      <div className="event-details__banner" style={{ background: category.gradient }}>
        <CategoryIcon size={48} className="event-details__banner-icon" />
      </div>

      <div className="event-details__hero">
        <span className="pill event-details__category-pill">{category.label}</span>
        <h1 className="event-details__title">{event.title}</h1>
        <div className="event-details__stats">
          {event.interestedCount} interested · {event.goingCount} going
          {left != null && (
            <>
              {' · '}
              <span className="event-details__spots-left">{left === 0 ? 'Full' : `${left} spots left`}</span>
            </>
          )}
        </div>
      </div>

      <EventFieldList event={event} now={now} />

      <div className="event-details__host">
        <span className="event-details__host-avatar" aria-hidden="true">
          {event.organizerName.trim().charAt(0).toUpperCase()}
        </span>
        <span className="event-details__host-info">
          <span className="event-details__host-label">{isHost ? 'Hosted by you' : 'Host'}</span>
          <span className="event-details__host-name">{event.organizerName}</span>
        </span>
        <span className="pill">{event.organizerType === 'club' ? 'Club' : 'Student'}</span>
      </div>

      <div className="event-details__updates">
        <h2 className="event-details__updates-heading">Updates</h2>
        <UpdateList updates={event.updates} />
      </div>

      {isHost ? (
        <HostActions event={event} />
      ) : (
        <AttendeeActions
          event={event}
          isSaved={savedIds.includes(event.id)}
          isGoing={confirmedIds.includes(event.id)}
          isOver={isPast(event, now)}
        />
      )}
    </div>
  );
}

function AttendeeActions({
  event,
  isSaved,
  isGoing,
  isOver,
}: {
  event: CampusEvent;
  isSaved: boolean;
  isGoing: boolean;
  isOver: boolean;
}) {
  const navigate = useNavigate();
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const leaveEvent = useAppStore((s) => s.leaveEvent);
  const showToast = useAppStore((s) => s.showToast);
  const locked = event.cancelled || isOver;

  if (isGoing) {
    return (
      <div className="event-details__actions">
        <span className="event-details__status">
          <IconCheck size={16} /> You're going
        </span>
        <button
          type="button"
          className="event-details__btn event-details__btn--secondary"
          disabled={locked}
          onClick={async () => {
            if (await leaveEvent(event.id)) showToast("You're no longer going. It's still in Interested.");
          }}
        >
          Can't make it
        </button>
      </div>
    );
  }

  const full = isFull(event);
  return (
    <div className="event-details__actions">
      <button
        type="button"
        className={`event-details__btn event-details__btn--secondary${isSaved ? ' event-details__btn--saved' : ''}`}
        disabled={locked}
        aria-pressed={isSaved}
        onClick={async () => {
          const ok = await toggleSaved(event.id);
          if (ok) showToast(isSaved ? 'Removed from Interested' : 'Saved to Interested');
        }}
      >
        <motion.span
          key={isSaved ? 'saved' : 'unsaved'}
          className="event-details__save-icon"
          initial={{ scale: isSaved ? 0.4 : 1 }}
          animate={{ scale: isSaved ? [0.4, 1.3, 1] : 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <IconBookmark size={16} className={isSaved ? 'event-details__bookmark--filled' : undefined} />
        </motion.span>
        {isSaved ? 'Saved' : 'Interested'}
      </button>
      <button
        type="button"
        className="event-details__btn"
        disabled={locked || full}
        onClick={() => navigate(`/events/${event.id}/confirm`)}
      >
        {full ? 'Event full' : 'Join event'}
      </button>
    </div>
  );
}

function HostActions({ event }: { event: CampusEvent }) {
  const cancelEvent = useAppStore((s) => s.cancelEvent);
  const showToast = useAppStore((s) => s.showToast);

  return (
    <div className="event-details__actions">
      <span className="event-details__status">You're hosting</span>
      {!event.cancelled && (
        <button
          type="button"
          className="event-details__btn event-details__btn--danger"
          onClick={async () => {
            if (!window.confirm('Cancel this event? Everyone who saved it will see it as cancelled.')) return;
            if (await cancelEvent(event.id)) showToast('Event cancelled');
          }}
        >
          Cancel event
        </button>
      )}
    </div>
  );
}
