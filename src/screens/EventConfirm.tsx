import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EventNotFound } from '../components/EventNotFound';
import { IconArrowLeft, IconCalendar, IconMapPin, IconX } from '../components/Icon';
import { formatEventTimeParts } from '../lib/time';
import { isFull, isPast, spotsLeft } from '../store/selectors';
import { useAppStore } from '../store/useAppStore';
import { SuccessCheck } from '../components/SuccessCheck';
import './EventConfirm.css';

export function EventConfirm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const events = useAppStore((s) => s.events);
  const user = useAppStore((s) => s.user);
  const confirmedIds = useAppStore((s) => s.confirmedIds);
  const confirmAttendance = useAppStore((s) => s.confirmAttendance);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const event = events.find((e) => e.id === id);
  const now = useMemo(() => new Date(), [events]);

  if (!event) return <EventNotFound />;

  if (confirmed) {
    return (
      <div className="screen event-confirm__success">
        <button
          type="button"
          className="event-confirm__close"
          aria-label="Close"
          onClick={() => navigate(-1)}
        >
          <IconX size={18} />
        </button>
        <SuccessCheck title="You're going!">
          <p className="event-confirm__success-subtext">Find it anytime under Interested.</p>
          <button type="button" className="btn" onClick={() => navigate('/interested')}>
            See my events
          </button>
        </SuccessCheck>
      </div>
    );
  }

  const left = spotsLeft(event);
  const time = formatEventTimeParts(event, now);
  // While saving, the optimistic update already marks us as going; don't treat that as a blocker.
  const alreadyGoing = confirmedIds.includes(event.id) && !submitting;
  const blocker = event.cancelled
    ? 'This event was cancelled.'
    : isPast(event, now)
      ? 'This event has already ended.'
      : user != null && event.organizerNetId === user.netId
        ? "You're hosting this event."
        : alreadyGoing
          ? "You're already going to this event."
          : isFull(event)
            ? 'This event is full.'
            : null;

  return (
    <div className="screen">
      <button type="button" className="event-confirm__back" onClick={() => navigate(-1)} aria-label="Back">
        <IconArrowLeft /> Back
      </button>

      <div className="event-confirm__card">
        <h1 className="event-confirm__title">{event.title}</h1>

        <div className="event-confirm__stats">
          {event.interestedCount} interested · {event.goingCount} going
          {left != null && (
            <>
              {' · '}
              <span className="event-confirm__spots-left">{left === 0 ? 'Full' : `${left} spots left`}</span>
            </>
          )}
        </div>

        <div className="event-confirm__meta">
          <span>
            <IconCalendar />
            <span className="event-confirm__time-label">{time.label}</span>
            {time.range && <> · {time.range}</>}
          </span>
          <span>
            <IconMapPin /> {event.locationName}
          </span>
        </div>

        <p className="event-confirm__snippet">{event.participation ?? event.description}</p>
      </div>

      {blocker ? (
        <p className="event-confirm__blocker">{blocker}</p>
      ) : (
        <button
          type="button"
          className="btn event-confirm__cta"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            const ok = await confirmAttendance(event.id);
            setSubmitting(false);
            // On failure the store shows an error toast (e.g. the last spot was just taken).
            if (ok) setConfirmed(true);
          }}
        >
          {submitting ? 'Confirming…' : 'Confirm attendance'}
        </button>
      )}
    </div>
  );
}
