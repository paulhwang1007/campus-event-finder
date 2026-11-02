import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryChips } from '../components/CategoryChips';
import { IconCheck } from '../components/Icon';
import { JoinConfirmModal } from '../components/JoinConfirmModal';
import { SwipeDeck } from '../components/SwipeDeck';
import { useAppStore } from '../store/useAppStore';
import { getFeed } from '../store/selectors';
import type { CampusEvent, CategoryId } from '../types';
import './Feed.css';

export function Feed() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [joinEvent, setJoinEvent] = useState<CampusEvent | null>(null);
  const user = useAppStore((s) => s.user);
  const events = useAppStore((s) => s.events);
  const savedIds = useAppStore((s) => s.savedIds);
  const passedIds = useAppStore((s) => s.passedIds);
  const reportedIds = useAppStore((s) => s.reportedIds);
  const swipe = useAppStore((s) => s.swipe);
  const resetDemo = useAppStore((s) => s.resetDemo);

  const now = useMemo(() => new Date(), [events, savedIds, passedIds, reportedIds]);

  const cards = useMemo(
    () => getFeed({ user, events, savedIds, passedIds, reportedIds }, now, category),
    [user, events, savedIds, passedIds, reportedIds, now, category],
  );

  return (
    <>
      <div className="screen">
        <h1 className="feed__heading">Discover Events</h1>
        <CategoryChips value={category} onChange={setCategory} />

        {cards.length > 0 ? (
          <SwipeDeck
            cards={cards}
            now={now}
            onSwipe={(eventId, action) => swipe(eventId, action)}
            onOpen={(eventId) => navigate(`/events/${eventId}`)}
            onJoinEvent={setJoinEvent}
          />
        ) : (
          <EmptyState filtered={category !== 'all'} onReset={resetDemo} />
        )}
      </div>

      {/* Sibling of .screen, not nested inside it: .screen has overflow-y:auto, which
          would clip this absolutely-positioned overlay even though it's sized against #root. */}
      {joinEvent && <JoinConfirmModal event={joinEvent} onClose={() => setJoinEvent(null)} />}
    </>
  );
}

function EmptyState({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return (
    <div className="feed__empty">
      <span className="feed__empty-icon">
        <IconCheck size={20} />
      </span>
      <p>You're all caught up</p>
      {filtered && <p>Try "All" categories.</p>}
      <button type="button" className="feed__reset" onClick={onReset}>
        Reset demo
      </button>
    </div>
  );
}
