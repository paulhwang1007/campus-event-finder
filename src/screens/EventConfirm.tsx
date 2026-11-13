import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconArrowLeft, IconCalendar, IconCheck, IconMapPin, IconX } from '../components/Icon';
import { formatEventTimeParts } from '../lib/time';
import { spotsLeft } from '../store/selectors';
import { useAppStore } from '../store/useAppStore';
import './EventConfirm.css';

export function EventConfirm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const events = useAppStore((s) => s.events);
  const confirmAttendance = useAppStore((s) => s.confirmAttendance);
  const [confirmed, setConfirmed] = useState(false);

  const event = events.find((e) => e.id === id);
  const now = useMemo(() => new Date(), [events]);

  if (!event) {
    return (
      <div className="screen">
        <button type="button" className="event-confirm__back" onClick={() => navigate(-1)}>
          <IconArrowLeft /> Back
        </button>
        <p>Event not found.</p>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="screen event-confirm__success">
        <button
          type="button"
          className="event-confirm__close"
          aria-label="Close"
          onClick={() => navigate('/feed')}
        >
          <IconX size={18} />
        </button>
        <span className="event-confirm__success-icon">
          <IconCheck size={32} />
        </span>
        <h1 className="event-confirm__success-heading">Registration confirmed</h1>
        <p className="event-confirm__success-subtext">Details sent to the host</p>
      </div>
    );
  }

  const left = spotsLeft(event);
  const time = formatEventTimeParts(event, now);

  return (
    <div className="screen">
      <button type="button" className="event-confirm__back" onClick={() => navigate(-1)} aria-label="Back">
        <IconArrowLeft /> Back
      </button>

      <div className="event-confirm__card">
        <h1 className="event-confirm__title">{event.title}</h1>

        <div className="event-confirm__stats">
          {event.interestedCount} interested
          {left != null && (
            <>
              {' · '}
              <span className="event-confirm__spots-left">{left} spots left</span>
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

      <button
        type="button"
        className="event-confirm__cta"
        onClick={() => {
          confirmAttendance(event.id);
          setConfirmed(true);
        }}
      >
        Confirm attendance
      </button>
    </div>
  );
}
