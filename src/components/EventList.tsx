import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatEventTimeParts } from '../lib/time';
import { groupEventsByDay, searchEvents, spotsLeft } from '../store/selectors';
import { useAppStore } from '../store/useAppStore';
import type { CampusEvent, CategoryId } from '../types';
import { EventRow } from './EventRow';
import { IconBookmark, IconCheck, IconX } from './Icon';
import './EventList.css';

interface Props {
  category: CategoryId | 'all';
  now: Date;
}

/** Every upcoming and ongoing event, grouped by day, with keyword search (PRD F8). */
export function EventList({ category, now }: Props) {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const events = useAppStore((s) => s.events);
  const savedIds = useAppStore((s) => s.savedIds);
  const passedIds = useAppStore((s) => s.passedIds);
  const confirmedIds = useAppStore((s) => s.confirmedIds);
  const reportedIds = useAppStore((s) => s.reportedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const showToast = useAppStore((s) => s.showToast);
  const [query, setQuery] = useState('');

  const groups = useMemo(
    () => groupEventsByDay(searchEvents({ user, events, savedIds, passedIds, reportedIds }, now, query, category), now),
    [user, events, savedIds, passedIds, reportedIds, now, query, category],
  );

  const saved = new Set(savedIds);
  const going = new Set(confirmedIds);
  let rowIndex = 0;

  return (
    <div className="event-list">
      <div className="event-list__search">
        <input
          type="search"
          className="event-list__search-input"
          placeholder="Search events"
          aria-label="Search events by name or description"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="no-press event-list__search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
            <IconX size={14} />
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="event-list__empty">
          {query.trim() ? (
            <>
              <p>No events match “{query.trim()}”.</p>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setQuery('')}>
                Clear search
              </button>
            </>
          ) : category !== 'all' ? (
            <p>Nothing coming up in this category.</p>
          ) : (
            <>
              <p>No upcoming events yet.</p>
              <button type="button" className="btn btn--sm" onClick={() => navigate('/create')}>
                Host something
              </button>
            </>
          )}
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="event-list__group" aria-label={group.label}>
            <h2 className={`event-list__day${group.key === 'now' ? ' event-list__day--now' : ''}`}>{group.label}</h2>
            <ul className="event-list__rows">
              {group.events.map((event) => {
                const i = rowIndex++;
                return (
                  <motion.li
                    key={event.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.03, duration: 0.22 }}
                  >
                    <ListRow
                      event={event}
                      now={now}
                      isHosting={user != null && event.organizerNetId === user.netId}
                      isGoing={going.has(event.id)}
                      isSaved={saved.has(event.id)}
                      onOpen={() => navigate(`/events/${event.id}`)}
                      onToggleSave={async () => {
                        const wasSaved = saved.has(event.id);
                        if (await toggleSaved(event.id)) {
                          showToast(wasSaved ? 'Removed from Interested' : 'Saved to Interested');
                        }
                      }}
                    />
                  </motion.li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function ListRow({
  event,
  now,
  isHosting,
  isGoing,
  isSaved,
  onOpen,
  onToggleSave,
}: {
  event: CampusEvent;
  now: Date;
  isHosting: boolean;
  isGoing: boolean;
  isSaved: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
}) {
  const time = formatEventTimeParts(event, now);
  const left = spotsLeft(event);

  let status;
  if (isGoing) {
    status = (
      <span className="event-row__tone-going">
        <IconCheck size={12} /> Going
      </span>
    );
  } else if (isHosting) {
    status = <span className="event-row__tone-going">Hosting · {event.goingCount} going</span>;
  } else {
    status = (
      <>
        {isSaved && (
          <>
            <span className="event-row__tone-going">Saved</span>
            <span aria-hidden="true">·</span>
          </>
        )}
        <span>{event.goingCount} going</span>
        {left != null && left <= 5 && (
          <>
            <span aria-hidden="true">·</span>
            <span className={left === 0 ? 'event-row__tone-danger' : 'event-row__tone-urgent'}>
              {left === 0 ? 'Full' : `${left} spots left`}
            </span>
          </>
        )}
      </>
    );
  }

  return (
    <EventRow
      start={new Date(event.start)}
      title={event.title}
      subtitle={
        <>
          {time.range ?? 'Now'} · {event.locationName}
        </>
      }
      status={status}
      highlight={time.label === 'Happening now'}
      onOpen={onOpen}
      // Going and hosting rows just open the event; un-saving there would also drop the RSVP.
      trailing={
        isGoing || isHosting ? undefined : (
          <motion.button
            type="button"
            className={`event-list__save${isSaved ? ' event-list__save--on' : ''}`}
            aria-label={isSaved ? `Remove ${event.title} from Interested` : `Save ${event.title} to Interested`}
            aria-pressed={isSaved}
            onClick={onToggleSave}
            whileTap={{ scale: 0.85 }}
          >
            <motion.span
              key={isSaved ? 'on' : 'off'}
              initial={{ scale: isSaved ? 0.5 : 1 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              style={{ display: 'flex' }}
            >
              <IconBookmark size={18} />
            </motion.span>
          </motion.button>
        )
      }
    />
  );
}
