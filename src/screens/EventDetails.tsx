import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCategory } from '../data/categories';
import { EventFieldList } from '../components/EventFieldList';
import { IconArrowLeft, IconCheck } from '../components/Icon';
import { JoinConfirmModal } from '../components/JoinConfirmModal';
import { UpdateList } from '../components/UpdateList';
import { spotsLeft } from '../store/selectors';
import { useAppStore } from '../store/useAppStore';
import './EventDetails.css';

export function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const events = useAppStore((s) => s.events);
  const savedIds = useAppStore((s) => s.savedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const markUpdatesSeen = useAppStore((s) => s.markUpdatesSeen);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const event = events.find((e) => e.id === id);
  const now = useMemo(() => new Date(), [events]);
  const isSaved = id ? savedIds.includes(id) : false;

  useEffect(() => {
    if (id) markUpdatesSeen(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!event) {
    return (
      <div className="screen">
        <button type="button" className="event-details__back" onClick={() => navigate(-1)}>
          <IconArrowLeft /> Back
        </button>
        <p>Event not found.</p>
      </div>
    );
  }

  const category = getCategory(event.category);
  const CategoryIcon = category.icon;
  const left = spotsLeft(event);

  return (
    <>
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
          <div className="event-details__organizer">
            {event.organizerName}{' '}
            <span className="pill">{event.organizerType === 'club' ? 'Club' : 'Student'}</span>
          </div>
          <div className="event-details__stats">
            {event.interestedCount} interested
            {left != null && (
              <>
                {' · '}
                <span className="event-details__spots-left">{left} spots left</span>
              </>
            )}
          </div>
        </div>

        <EventFieldList event={event} now={now} />

        <div className="event-details__updates">
          <h2 className="event-details__updates-heading">Updates</h2>
          <UpdateList updates={event.updates} />
        </div>

        <button
          type="button"
          disabled={event.cancelled}
          className={`event-details__toggle${isSaved ? ' event-details__toggle--saved' : ''}`}
          onClick={() => (isSaved ? toggleSaved(event.id) : setShowJoinModal(true))}
        >
          {isSaved ? (
            <>
              <IconCheck size={16} /> Joined
            </>
          ) : (
            'Join event'
          )}
        </button>
      </div>

      {showJoinModal && <JoinConfirmModal event={event} onClose={() => setShowJoinModal(false)} />}
    </>
  );
}
