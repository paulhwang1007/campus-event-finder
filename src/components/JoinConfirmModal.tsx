import { useMemo, useState } from 'react';
import { IconCalendar, IconCheck, IconMapPin, IconX } from './Icon';
import { formatEventTimeParts } from '../lib/time';
import { spotsLeft } from '../store/selectors';
import { useAppStore } from '../store/useAppStore';
import type { CampusEvent } from '../types';
import './JoinConfirmModal.css';

interface Props {
  event: CampusEvent;
  onClose: () => void;
}

export function JoinConfirmModal({ event, onClose }: Props) {
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const [confirmed, setConfirmed] = useState(false);
  const now = useMemo(() => new Date(), []);

  const left = spotsLeft(event);
  const time = formatEventTimeParts(event, now);

  return (
    <div className="join-modal__backdrop" onClick={onClose}>
      <div className="join-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="join-modal__close" aria-label="Close" onClick={onClose}>
          <IconX size={18} />
        </button>

        {confirmed ? (
          <div className="join-modal__success">
            <span className="join-modal__success-icon">
              <IconCheck size={32} />
            </span>
            <h2 className="join-modal__success-heading">Registration confirmed</h2>
            <p className="join-modal__success-subtext">Details sent to the host</p>
          </div>
        ) : (
          <>
            <h2 className="join-modal__title">{event.title}</h2>

            <div className="join-modal__stats">
              {event.interestedCount} interested
              {left != null && (
                <>
                  {' · '}
                  <span className="join-modal__spots-left">{left} spots left</span>
                </>
              )}
            </div>

            <div className="join-modal__meta">
              <span>
                <IconCalendar />
                <span className="join-modal__time-label">{time.label}</span>
                {time.range && <> · {time.range}</>}
              </span>
              <span>
                <IconMapPin /> {event.locationName}
              </span>
            </div>

            <p className="join-modal__snippet">{event.participation ?? event.description}</p>

            <button
              type="button"
              className="join-modal__cta"
              onClick={() => {
                toggleSaved(event.id);
                setConfirmed(true);
              }}
            >
              Confirm attendance
            </button>
          </>
        )}
      </div>
    </div>
  );
}
