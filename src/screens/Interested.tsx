import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryChips } from '../components/CategoryChips';
import { IconBookmark } from '../components/Icon';
import { InterestedCard } from '../components/InterestedCard';
import { getInterested, hasUnreadUpdate } from '../store/selectors';
import { useAppStore } from '../store/useAppStore';
import type { CampusEvent, CategoryId } from '../types';
import './Interested.css';

const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.04, duration: 0.25 } }),
  exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2 } },
};

export function Interested() {
  const navigate = useNavigate();
  const events = useAppStore((s) => s.events);
  const savedIds = useAppStore((s) => s.savedIds);
  const confirmedIds = useAppStore((s) => s.confirmedIds);
  const reportedIds = useAppStore((s) => s.reportedIds);
  const lastSeenUpdateAt = useAppStore((s) => s.lastSeenUpdateAt);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const showToast = useAppStore((s) => s.showToast);
  const [category, setCategory] = useState<CategoryId | 'all'>('all');

  const now = useMemo(() => new Date(), [events, savedIds, confirmedIds, reportedIds]);
  const { going, interested } = useMemo(
    () => getInterested({ events, savedIds, confirmedIds, reportedIds }, now),
    [events, savedIds, confirmedIds, reportedIds, now],
  );

  const byCategory = (list: CampusEvent[]) =>
    category === 'all' ? list : list.filter((e) => e.category === category);
  const goingShown = byCategory(going);
  const savedShown = byCategory(interested);

  const isEmpty = going.length === 0 && interested.length === 0;

  async function remove(event: CampusEvent) {
    if (await toggleSaved(event.id)) {
      showToast('Removed from Interested', {
        action: { label: 'Undo', onClick: () => void toggleSaved(event.id) },
      });
    }
  }

  function renderSection(title: string, list: CampusEvent[], isGoing: boolean) {
    if (list.length === 0) return null;
    return (
      <section className="interested__section" aria-label={title}>
        <h2 className="interested__section-title">
          {title} <span className="interested__count">{list.length}</span>
        </h2>
        <ul className="interested__list">
          <AnimatePresence initial={true}>
            {list.map((event, i) => (
              <motion.li
                key={event.id}
                layout
                custom={i}
                variants={listItem}
                initial="hidden"
                animate="show"
                exit="exit"
                className="interested__item"
              >
                <InterestedCard
                  event={event}
                  now={now}
                  isGoing={isGoing}
                  hasUpdate={hasUnreadUpdate(event, lastSeenUpdateAt)}
                  onOpen={() => navigate(`/events/${event.id}`)}
                  onJoin={() => navigate(`/events/${event.id}/confirm`)}
                  onRemove={() => void remove(event)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    );
  }

  return (
    <div className="screen screen--main">
      <h1 className="page-heading">Interested<br />Events</h1>

      {isEmpty ? (
        <div className="interested__empty">
          <span className="interested__empty-icon">
            <IconBookmark size={22} />
          </span>
          <p className="interested__empty-title">Nothing saved yet</p>
          <p>Swipe right on events you like in Discover and they'll show up here.</p>
          <button type="button" className="btn" onClick={() => navigate('/feed')}>
            Go to Discover
          </button>
        </div>
      ) : (
        <>
          <CategoryChips value={category} onChange={setCategory} />

          {goingShown.length === 0 && savedShown.length === 0 ? (
            <p className="interested__none">No saved events in this category.</p>
          ) : (
            <>
              {renderSection('Going', goingShown, true)}
              {renderSection('Saved', savedShown, false)}
              <p className="interested__hint">Swipe a row left to remove it</p>
            </>
          )}
        </>
      )}
    </div>
  );
}
