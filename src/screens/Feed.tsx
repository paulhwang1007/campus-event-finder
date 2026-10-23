import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryChips } from '../components/CategoryChips';
import { SwipeDeck } from '../components/SwipeDeck';
import { useAppStore } from '../store/useAppStore';
import { getFeed } from '../store/selectors';
import type { CategoryId } from '../types';
import './Feed.css';

export function Feed() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const user = useAppStore((s) => s.user);
  const events = useAppStore((s) => s.events);
  const savedIds = useAppStore((s) => s.savedIds);
  const passedIds = useAppStore((s) => s.passedIds);
  const reportedIds = useAppStore((s) => s.reportedIds);
  const swipe = useAppStore((s) => s.swipe);

  const now = useMemo(() => new Date(), [events, savedIds, passedIds, reportedIds]);

  const cards = useMemo(
    () => getFeed({ user, events, savedIds, passedIds, reportedIds }, now, category),
    [user, events, savedIds, passedIds, reportedIds, now, category],
  );

  return (
    <div className="screen">
      <h1 className="feed__heading">Discover</h1>
      <CategoryChips value={category} onChange={setCategory} />

      {cards.length > 0 ? (
        <SwipeDeck
          cards={cards}
          now={now}
          onSwipe={(eventId, action) => swipe(eventId, action)}
          onOpen={(eventId) => navigate(`/events/${eventId}`)}
        />
      ) : (
        <EmptyState filtered={category !== 'all'} />
      )}
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="feed__empty">
      <p>You're all caught up 🎉</p>
      {filtered && <p>Try "All" categories.</p>}
    </div>
  );
}
