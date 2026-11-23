import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronRight, IconPencil, IconUser } from '../components/Icon';
import { signOut } from '../lib/supabase';
import { formatDayHeading } from '../lib/time';
import { getProfileEvents } from '../store/selectors';
import { useAppStore } from '../store/useAppStore';
import type { CampusEvent } from '../types';
import './Profile.css';

type Tab = 'going' | 'hosting' | 'attended';

export function Profile() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const events = useAppStore((s) => s.events);
  const confirmedIds = useAppStore((s) => s.confirmedIds);
  const reportedIds = useAppStore((s) => s.reportedIds);
  const [tab, setTab] = useState<Tab>('going');

  const now = useMemo(() => new Date(), [events, confirmedIds, reportedIds]);
  const { going, hosting, attended } = useMemo(
    () => getProfileEvents({ user, events, confirmedIds, reportedIds }, now),
    [user, events, confirmedIds, reportedIds, now],
  );

  const lists: Record<Tab, CampusEvent[]> = { going, hosting, attended };
  const list = lists[tab];

  return (
    <div className="screen">
      <h1 className="profile__heading">Profile</h1>

      <div className="profile__header">
        <span className="profile__avatar">
          <IconUser size={28} />
        </span>
        <div className="profile__identity">
          <span className="profile__name">{user?.name ?? 'Guest'}</span>
          <span className="profile__subtitle">
            {user?.classYear}
            {user?.major && ` · ${user.major}`}
          </span>
          {user?.bio && <span className="profile__bio">{user.bio}</span>}
        </div>
        <button type="button" className="profile__edit" aria-label="Edit profile" disabled>
          <IconPencil size={16} />
        </button>
      </div>

      <div className="profile__stats">
        <button
          type="button"
          className={`profile__stat${tab === 'going' ? ' profile__stat--active' : ''}`}
          onClick={() => setTab('going')}
        >
          <span className="profile__stat-count">{going.length}</span>
          <span className="profile__stat-label">Going</span>
        </button>
        <button
          type="button"
          className={`profile__stat${tab === 'hosting' ? ' profile__stat--active' : ''}`}
          onClick={() => setTab('hosting')}
        >
          <span className="profile__stat-count">{hosting.length}</span>
          <span className="profile__stat-label">Hosting</span>
        </button>
        <button
          type="button"
          className={`profile__stat${tab === 'attended' ? ' profile__stat--active' : ''}`}
          onClick={() => setTab('attended')}
        >
          <span className="profile__stat-count">{attended.length}</span>
          <span className="profile__stat-label">Attended</span>
        </button>
      </div>

      <div className="profile__section">
        <span className="profile__section-label">Your events</span>

        <div className="profile__tabs">
          <button
            type="button"
            className={`profile__tab${tab === 'going' ? ' profile__tab--active' : ''}`}
            onClick={() => setTab('going')}
          >
            Going
          </button>
          <button
            type="button"
            className={`profile__tab${tab === 'hosting' ? ' profile__tab--active' : ''}`}
            onClick={() => setTab('hosting')}
          >
            Hosting
          </button>
          <button
            type="button"
            className={`profile__tab${tab === 'attended' ? ' profile__tab--active' : ''}`}
            onClick={() => setTab('attended')}
          >
            Attended
          </button>
        </div>

        {list.length === 0 ? (
          <p className="profile__empty">No events yet.</p>
        ) : (
          <div className="profile__list">
            {list.map((event) => (
              <ProfileRow key={event.id} event={event} now={now} onOpen={() => navigate(`/events/${event.id}`)} />
            ))}
          </div>
        )}
      </div>

      <button type="button" className="profile__signout" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}

function ProfileRow({ event, now, onOpen }: { event: CampusEvent; now: Date; onOpen: () => void }) {
  const start = new Date(event.start);
  const dayLabel = formatDayHeading(start, now);
  const time = format(start, 'h:mm a');

  return (
    <button type="button" className="profile__row" onClick={onOpen}>
      <span className="profile__row-date">
        <span className="profile__row-month">{format(start, 'MMM').toUpperCase()}</span>
        <span className="profile__row-day">{format(start, 'd')}</span>
      </span>
      <span className="profile__row-info">
        <span className="profile__row-title">{event.title}</span>
        <span className="profile__row-subtitle">
          {dayLabel} · {time} · {event.locationName}
        </span>
      </span>
      <IconChevronRight size={16} className="profile__row-chevron" />
    </button>
  );
}
