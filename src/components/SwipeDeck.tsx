import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { EventCard } from './EventCard';
import type { FeedCard } from '../store/selectors';
import './SwipeDeck.css';

const SWIPE_OFFSET_THRESHOLD = 120;
const SWIPE_VELOCITY_THRESHOLD = 500;
const FLY_OUT_DISTANCE = 1000;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface Props {
  cards: FeedCard[];
  now: Date;
  onSwipe: (eventId: string, action: 'save' | 'pass') => void;
  onOpen: (eventId: string) => void;
}

export function SwipeDeck({ cards, now, onSwipe, onOpen }: Props) {
  const top = cards[0];
  const next = cards[1];
  const commitRef = useRef<((action: 'save' | 'pass') => void) | null>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!top) return;
      if (e.key === 'ArrowRight') commitRef.current?.('save');
      if (e.key === 'ArrowLeft') commitRef.current?.('pass');
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [top]);

  if (!top) return null;

  return (
    <div className="swipe-deck">
      {next && (
        <div className="swipe-deck__card swipe-deck__card--back">
          <EventCard event={next.event} isOutsideInterests={next.isOutsideInterests} now={now} />
        </div>
      )}
      <TopCard
        key={top.event.id}
        card={top}
        now={now}
        onCommit={(action) => onSwipe(top.event.id, action)}
        onOpen={() => onOpen(top.event.id)}
        commitRef={commitRef}
      />
      {/* Siblings of the draggable card, not children: Framer Motion's drag listener is
          attached natively to the draggable element, so a click here never passes through it. */}
      <div className="swipe-deck__buttons">
        <button
          type="button"
          aria-label="Pass on this event"
          className="swipe-deck__button swipe-deck__button--pass"
          onClick={() => commitRef.current?.('pass')}
        >
          ✕
        </button>
        <button
          type="button"
          aria-label="Mark this event as interested"
          className="swipe-deck__button swipe-deck__button--save"
          onClick={() => commitRef.current?.('save')}
        >
          ✓
        </button>
      </div>
    </div>
  );
}

interface TopCardProps {
  card: FeedCard;
  now: Date;
  onCommit: (action: 'save' | 'pass') => void;
  onOpen: () => void;
  commitRef: React.RefObject<((action: 'save' | 'pass') => void) | null>;
}

function TopCard({ card, now, onCommit, onOpen, commitRef }: TopCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const saveOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);
  const committed = useRef(false);

  function commit(action: 'save' | 'pass') {
    if (committed.current) return;
    committed.current = true;
    const reduced = prefersReducedMotion();
    const target = action === 'save' ? FLY_OUT_DISTANCE : -FLY_OUT_DISTANCE;
    animate(x, target, { duration: reduced ? 0 : 0.25, ease: 'easeOut' }).then(() => onCommit(action));
  }

  commitRef.current = commit;

  function handleDragEnd(_e: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    if (info.offset.x > SWIPE_OFFSET_THRESHOLD || info.velocity.x > SWIPE_VELOCITY_THRESHOLD) {
      commit('save');
    } else if (info.offset.x < -SWIPE_OFFSET_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY_THRESHOLD) {
      commit('pass');
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }

  return (
    <motion.div
      className="swipe-deck__card swipe-deck__card--top"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      onTap={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`${card.event.title}. Press enter to view details, left arrow to pass, right arrow to save.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
    >
      <motion.span className="swipe-deck__label swipe-deck__label--save" style={{ opacity: saveOpacity }}>
        INTERESTED
      </motion.span>
      <motion.span className="swipe-deck__label swipe-deck__label--pass" style={{ opacity: passOpacity }}>
        PASS
      </motion.span>
      <EventCard event={card.event} isOutsideInterests={card.isOutsideInterests} now={now} />
    </motion.div>
  );
}
