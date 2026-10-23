import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EventFieldList } from '../components/EventFieldList';
import { UpdateList } from '../components/UpdateList';
import { useAppStore } from '../store/useAppStore';
import './EventDetails.css';

export function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const events = useAppStore((s) => s.events);
  const savedIds = useAppStore((s) => s.savedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const markUpdatesSeen = useAppStore((s) => s.markUpdatesSeen);

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
        <button type="button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <p>Event not found.</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <button type="button" onClick={() => navigate(-1)} aria-label="Back">
        ← Back
      </button>

      {event.cancelled && <div className="event-details__cancelled">This event was cancelled.</div>}

      <EventFieldList event={event} now={now} />

      <div className="event-details__updates">
        <h2 className="event-details__updates-heading">Updates</h2>
        <UpdateList updates={event.updates} />
      </div>

      <button
        type="button"
        disabled={event.cancelled}
        className={`event-details__toggle${isSaved ? ' event-details__toggle--saved' : ''}`}
        onClick={() => toggleSaved(event.id)}
      >
        {isSaved ? '✓ Saved' : "I'm interested"}
      </button>
    </div>
  );
}
