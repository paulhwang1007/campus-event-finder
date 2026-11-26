import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CategoryChips } from '../components/CategoryChips';
import { EventList } from '../components/EventList';
import { IconCheck } from '../components/Icon';
import { SwipeDeck } from '../components/SwipeDeck';
import { useAppStore } from '../store/useAppStore';
import { getFeed } from '../store/selectors';
import type { CategoryId } from '../types';
import './Feed.css';

export function Feed() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'list' ? 'list' : 'swipe';
  const user = useAppStore((s) => s.user);
  const events = useAppStore((s) => s.events);
  const savedIds = useAppStore((s) => s.savedIds);
  const passedIds = useAppStore((s) => s.passedIds);
  const reportedIds = useAppStore((s) => s.reportedIds);
  const swipe = useAppStore((s) => s.swipe);
  const resetPassed = useAppStore((s) => s.resetPassed);

  const now = useMemo(() => new Date(), [events, savedIds, passedIds, reportedIds]);

  const cards = useMemo(
    () => getFeed({ user, events, savedIds, passedIds, reportedIds }, now, category),
    [user, events, savedIds, passedIds, reportedIds, now, category],
  );

  return (
    <div className={`screen screen--main${view === 'swipe' ? ' screen--fixed' : ''}`}>
      <div className="feed__header">
        <h1 className="page-heading">Discover<br />Events</h1>
        <ViewToggle
          value={view}
          onChange={(next) => setParams(next === 'list' ? { view: 'list' } : {}, { replace: true })}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          className="feed__view"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
        >
          {view === 'list' ? (
            <>
              <CategoryChips value={category} onChange={setCategory} />
              <EventList category={category} now={now} />
            </>
          ) : (
            <>
              <CategoryChips value={category} onChange={setCategory} />

              {cards.length > 0 ? (
                <SwipeDeck
                  cards={cards}
                  now={now}
                  onSwipe={(eventId, action) => {
                    // Moving past your own event in either direction just skips it, quietly.
                    const isOwn = cards.find((c) => c.event.id === eventId)?.isOwn;
                    if (isOwn) swipe(eventId, 'pass', { silent: true });
                    else swipe(eventId, action);
                  }}
                  onOpen={(eventId) => navigate(`/events/${eventId}`)}
                  onJoinEvent={(event) => navigate(`/events/${event.id}/confirm`)}
                />
              ) : (
                <EmptyState
                  filtered={category !== 'all'}
                  onReset={passedIds.length > 0 ? resetPassed : undefined}
                  onSeeInterested={() => navigate('/interested')}
                  onHost={() => navigate('/create')}
                />
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

type View = 'swipe' | 'list';

function ViewToggle({ value, onChange }: { value: View; onChange: (view: View) => void }) {
  return (
    <div className="feed__toggle" role="radiogroup" aria-label="How to browse events">
      {(['swipe', 'list'] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={`feed__toggle-option${value === option ? ' feed__toggle-option--active' : ''}`}
          onClick={() => onChange(option)}
        >
          {value === option && (
            <motion.span
              layoutId="feed-view-toggle"
              className="feed__toggle-indicator"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          <span className="feed__toggle-label">{option === 'swipe' ? 'Swipe' : 'List'}</span>
        </button>
      ))}
    </div>
  );
}

function EmptyState({
  filtered,
  onReset,
  onSeeInterested,
  onHost,
}: {
  filtered: boolean;
  onReset?: () => void;
  onSeeInterested: () => void;
  onHost: () => void;
}) {
  return (
    <div className="feed__empty">
      <span className="feed__empty-icon">
        <IconCheck size={20} />
      </span>
      <p>You're all caught up</p>
      {filtered && <p>Try "All" categories.</p>}
      <div className="feed__empty-actions">
        <button type="button" className="feed__empty-btn feed__empty-btn--primary" onClick={onSeeInterested}>
          See Interested
        </button>
        <button type="button" className="feed__empty-btn" onClick={onHost}>
          Host something
        </button>
        {onReset && (
          <button type="button" className="feed__reset" onClick={onReset}>
            Show passed events again
          </button>
        )}
      </div>
    </div>
  );
}
