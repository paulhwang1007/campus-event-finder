import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { EventRow } from './EventRow';
import { IconCheck, IconX } from './Icon';
import { formatEventTimeParts } from '../lib/time';
import { isFull, spotsLeft } from '../store/selectors';
import type { CampusEvent } from '../types';
import './InterestedCard.css';

const REMOVE_THRESHOLD = -96;

interface Props {
  event: CampusEvent;
  now: Date;
  isGoing: boolean;
  hasUpdate: boolean;
  onOpen: () => void;
  onJoin: () => void;
  onRemove: () => void;
}

/**
 * One saved event on the Interested page. Shows only what helps you follow up
 * (when, where, your status, urgency); everything else lives on the event page.
 * Swipe left (or use the ✕) to remove it.
 */
export function InterestedCard({ event, now, isGoing, hasUpdate, onOpen, onJoin, onRemove }: Props) {
  const x = useMotionValue(0);
  const revealOpacity = useTransform(x, [-80, -16], [1, 0]);
  const dragged = useRef(false);

  const time = formatEventTimeParts(event, now);
  const left = spotsLeft(event);
  const full = isFull(event);
  const isSoon = time.label === 'Happening now' || time.label === 'Today';

  function remove() {
    animate(x, -480, { duration: 0.2, ease: 'easeIn' }).then(onRemove);
  }

  const day = (
    <span key="day" className={isSoon ? 'interested-card__soon' : undefined}>
      {time.label}
    </span>
  );

  // Your status first, then urgency; fall back to turnout when there's nothing urgent.
  const statusParts: React.ReactNode[] = [];
  if (isGoing) {
    statusParts.push(
      <span key="going" className="event-row__tone-going">
        <IconCheck size={12} /> Going
      </span>,
    );
  }
  if (full) {
    statusParts.push(
      <span key="full" className="event-row__tone-danger">
        Full
      </span>,
    );
  } else if (left != null && left <= 5) {
    statusParts.push(
      <span key="spots" className="event-row__tone-urgent">
        {left} spots left
      </span>,
    );
  }
  if (statusParts.length === 0) statusParts.push(<span key="count">{event.goingCount} going</span>);

  // Line 2: day + status. Line 3: time + place.
  const dayAndStatus = [day, ...statusParts].flatMap((part, i) =>
    i === 0 ? [part] : [<span key={`sep-${i}`} aria-hidden="true">·</span>, part],
  );
  const timeAndPlace = (
    <>
      {time.range && (
        <>
          <span className="interested-card__time">{time.range}</span>
          <span aria-hidden="true">·</span>
        </>
      )}
      <span className="interested-card__location">{event.locationName}</span>
    </>
  );

  return (
    <div className="interested-card">
      <motion.div className="interested-card__reveal" style={{ opacity: revealOpacity }} aria-hidden="true">
        Remove
      </motion.div>

      <motion.div
        className="interested-card__slide"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.9, right: 0.05 }}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={(_e, info) => {
          if (info.offset.x < REMOVE_THRESHOLD || info.velocity.x < -600) remove();
          else animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
          // Let the click that ends a drag be swallowed below, then re-enable taps.
          window.setTimeout(() => (dragged.current = false), 0);
        }}
        onClickCapture={(e) => {
          if (dragged.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        <EventRow
          start={new Date(event.start)}
          title={event.title}
          subtitle={<span className="interested-card__line">{dayAndStatus}</span>}
          status={timeAndPlace}
          highlight={isSoon}
          badge={hasUpdate}
          onOpen={onOpen}
          ariaLabel={`${event.title}${hasUpdate ? ', has a new update' : ''}. Open details.`}
          trailing={
            isGoing ? undefined : (
              <button type="button" className="btn btn--sm" onClick={onJoin} disabled={full}>
                {full ? 'Full' : 'Join'}
              </button>
            )
          }
        />
      </motion.div>

      <button
        type="button"
        className="no-press interested-card__remove"
        aria-label={`Remove ${event.title} from Interested`}
        onClick={remove}
      >
        <IconX size={12} />
      </button>
    </div>
  );
}
