import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryChips } from '../components/CategoryChips';
import { IconCheck } from '../components/Icon';
import { InterestedCard } from '../components/InterestedCard';
import { JoinConfirmModal } from '../components/JoinConfirmModal';
import { getInterested, isOngoing } from '../store/selectors';
import { useAppStore } from '../store/useAppStore';
import type { CampusEvent, CategoryId } from '../types';
import './Interested.css';

export function Interested() {
  const navigate = useNavigate();
  const events = useAppStore((s) => s.events);
  const savedIds = useAppStore((s) => s.savedIds);
  const confirmedIds = useAppStore((s) => s.confirmedIds);
  const reportedIds = useAppStore((s) => s.reportedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [joinEvent, setJoinEvent] = useState<CampusEvent | null>(null);

  const now = useMemo(() => new Date(), [events, savedIds, confirmedIds, reportedIds]);
  const { going, interested } = useMemo(
    () => getInterested({ events, savedIds, confirmedIds, reportedIds }, now),
    [events, savedIds, confirmedIds, reportedIds, now],
  );

  const confirmedSet = useMemo(() => new Set(confirmedIds), [confirmedIds]);

  const list = useMemo(() => {
    const merged = [...going, ...interested].sort((a, b) => {
      const aOngoing = isOngoing(a, now);
      const bOngoing = isOngoing(b, now);
      if (aOngoing !== bOngoing) return aOngoing ? -1 : 1;
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
    return category === 'all' ? merged : merged.filter((e) => e.category === category);
  }, [going, interested, category, now]);

  const isEmpty = going.length === 0 && interested.length === 0;

  return (
    <>
      <div className="screen">
        <h1 className="interested__heading">Interested Events</h1>

        {isEmpty ? (
          <div className="interested__empty">
            <span className="interested__empty-icon">
              <IconCheck size={20} />
            </span>
            <p>Nothing saved yet.</p>
            <p>Swipe right on something you like on Discover.</p>
            <button type="button" className="interested__empty-cta" onClick={() => navigate('/feed')}>
              Go to Discover
            </button>
          </div>
        ) : (
          <>
            <CategoryChips value={category} onChange={setCategory} />

            <div className="interested__list">
              {list.map((event) => (
                <InterestedCard
                  key={event.id}
                  event={event}
                  now={now}
                  isGoing={confirmedSet.has(event.id)}
                  onOpen={() => navigate(`/events/${event.id}`)}
                  onJoin={() => setJoinEvent(event)}
                  onLeave={() => toggleSaved(event.id)}
                  onRemove={() => toggleSaved(event.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sibling of .screen, not nested inside it: .screen has overflow-y:auto, which
          would clip this absolutely-positioned overlay even though it's sized against #root. */}
      {joinEvent && <JoinConfirmModal event={joinEvent} onClose={() => setJoinEvent(null)} />}
    </>
  );
}
