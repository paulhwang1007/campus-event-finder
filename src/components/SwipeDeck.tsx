import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { EventCard } from './EventCard';
import { IconChevronLeft, IconChevronRight } from './Icon';
import { isFull, type FeedCard } from '../store/selectors';
import type { CampusEvent } from '../types';
import './SwipeDeck.css';

/** Drag this far (about a third of the card) to commit a swipe… */
const SWIPE_OFFSET_THRESHOLD = 100;
/** …or flick at least this fast (px/s), as long as the card moved a little in that direction. */
const SWIPE_VELOCITY_THRESHOLD = 400;
const FLICK_MIN_OFFSET = 30;
/** A touch only counts as a tap (open details) if the finger stayed this still and lifted this fast. */
const TAP_MAX_MOVEMENT = 8;
const TAP_MAX_MS = 500;
const FLY_OUT_DISTANCE = 1000;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface Props {
  cards: FeedCard[];
  now: Date;
  onSwipe: (eventId: string, action: 'save' | 'pass') => void;
  onOpen: (eventId: string) => void;
  onJoinEvent: (event: CampusEvent) => void;
}

export function SwipeDeck({ cards, now, onSwipe, onOpen, onJoinEvent }: Props) {
  const top = cards[0];
  const next = cards[1];
  const commitRef = useRef<((action: 'save' | 'pass') => void) | null>(null);
  // Shared with the back card so it grows into place as the top card is dragged away.
  const x = useMotionValue(0);
  const dragProgress = useTransform(x, (v) => Math.min(Math.abs(v) / 150, 1));
  const backScale = useTransform(dragProgress, [0, 1], [0.95, 1]);
  const backY = useTransform(dragProgress, [0, 1], [12, 0]);
  const backOpacity = useTransform(dragProgress, [0, 1], [0.55, 1]);

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
      <div className="swipe-deck__stack">
        {next && (
          <motion.div
            key={next.event.id}
            className="swipe-deck__card swipe-deck__card--back"
            style={{ scale: backScale, y: backY, opacity: backOpacity }}
          >
            <EventCard event={next.event} isOutsideInterests={next.isOutsideInterests} now={now} />
          </motion.div>
        )}
        <TopCard
          key={top.event.id}
          card={top}
          now={now}
          x={x}
          onCommit={(action) => onSwipe(top.event.id, action)}
          onOpen={() => onOpen(top.event.id)}
          commitRef={commitRef}
        />

        {/* Siblings of the draggable card, not children: Framer Motion's drag listener is
            attached natively to the draggable element, so a click here never passes through it. */}
        <button
          type="button"
          aria-label="Pass on this event"
          className="no-press swipe-deck__chevron swipe-deck__chevron--left"
          onClick={() => commitRef.current?.('pass')}
        >
          <IconChevronLeft size={18} />
        </button>
        <button
          type="button"
          aria-label="Mark this event as interested"
          className="no-press swipe-deck__chevron swipe-deck__chevron--right"
          onClick={() => commitRef.current?.('save')}
        >
          <IconChevronRight size={18} />
        </button>
      </div>

      <div className="swipe-deck__actions">
        <p className="swipe-deck__hint">Swipe left to skip or right to save</p>
        <button
          type="button"
          className="btn swipe-deck__join"
          onClick={() => onJoinEvent(top.event)}
          disabled={isFull(top.event)}
        >
          {isFull(top.event) ? 'Event full' : 'Join event'}
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
  x: MotionValue<number>;
}

function TopCard({ card, now, onCommit, onOpen, commitRef, x }: TopCardProps) {
  // Each new top card starts centered (the previous one left x off-screen).
  useLayoutEffect(() => {
    x.set(0);
  }, [x]);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  // Labels reach full strength at the commit threshold, so "fully shown" means "let go to swipe".
  const saveOpacity = useTransform(x, [15, SWIPE_OFFSET_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_OFFSET_THRESHOLD, -15], [1, 0]);
  const saveScale = useTransform(x, [15, SWIPE_OFFSET_THRESHOLD], [0.7, 1]);
  const passScale = useTransform(x, [-SWIPE_OFFSET_THRESHOLD, -15], [1, 0.7]);
  // A light wash over the whole card, so the direction reads even while the label is small.
  const saveTint = useTransform(x, [0, SWIPE_OFFSET_THRESHOLD], [0, 0.16]);
  const passTint = useTransform(x, [-SWIPE_OFFSET_THRESHOLD, 0], [0.16, 0]);
  const committed = useRef(false);
  const pointerStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const dragged = useRef(false);

  function commit(action: 'save' | 'pass') {
    if (committed.current) return;
    committed.current = true;
    const reduced = prefersReducedMotion();
    const target = action === 'save' ? FLY_OUT_DISTANCE : -FLY_OUT_DISTANCE;
    animate(x, target, { duration: reduced ? 0 : 0.25, ease: 'easeOut' }).then(() => onCommit(action));
  }

  commitRef.current = commit;

  function handleDragEnd(_e: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    const { x: offset } = info.offset;
    const { x: velocity } = info.velocity;
    if (offset > SWIPE_OFFSET_THRESHOLD || (velocity > SWIPE_VELOCITY_THRESHOLD && offset > FLICK_MIN_OFFSET)) {
      commit('save');
    } else if (offset < -SWIPE_OFFSET_THRESHOLD || (velocity < -SWIPE_VELOCITY_THRESHOLD && offset < -FLICK_MIN_OFFSET)) {
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
      whileDrag={{ cursor: 'grabbing' }}
      initial={{ scale: 0.98 }}
      animate={{ scale: 1 }}
      onDragEnd={handleDragEnd}
      // Our own tap check instead of framer's onTap, which could also fire at the end of a short
      // swipe and open the details page. Any drag, or more than a few pixels of movement, is not a tap.
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };
        dragged.current = false;
      }}
      onDragStart={() => {
        dragged.current = true;
      }}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
      onPointerUp={(e) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (!start || dragged.current || committed.current) return;
        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        if (moved <= TAP_MAX_MOVEMENT && Date.now() - start.time <= TAP_MAX_MS) onOpen();
      }}
      role="button"
      tabIndex={0}
      aria-label={`${card.event.title}. Press enter to view details, left arrow to pass, right arrow to save.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
    >
      <motion.span className="swipe-deck__tint swipe-deck__tint--save" style={{ opacity: saveTint }} />
      <motion.span className="swipe-deck__tint swipe-deck__tint--pass" style={{ opacity: passTint }} />
      <motion.span className="swipe-deck__label swipe-deck__label--save" style={{ opacity: saveOpacity, scale: saveScale, rotate: -8 }}>
        INTERESTED
      </motion.span>
      <motion.span className="swipe-deck__label swipe-deck__label--pass" style={{ opacity: passOpacity, scale: passScale, rotate: 8 }}>
        PASS
      </motion.span>
      <EventCard event={card.event} isOutsideInterests={card.isOutsideInterests} now={now} />
    </motion.div>
  );
}
