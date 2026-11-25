import { animate, AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventRow } from '../components/EventRow';
import { IconCalendar, IconChevronRight, IconPencil, IconPlus } from '../components/Icon';
import { getCategory } from '../data/categories';
import { signOut } from '../lib/supabase';
import { formatDayHeading } from '../lib/time';
import { getProfileEvents, spotsLeft } from '../store/selectors';
import { useAppStore } from '../store/useAppStore';
import type { CampusEvent } from '../types';
import './Profile.css';

type Tab = 'going' | 'hosting' | 'attended';

const TABS: { id: Tab; label: string }[] = [
  { id: 'going', label: 'Going' },
  { id: 'hosting', label: 'Hosting' },
  { id: 'attended', label: 'Attended' },
];

function initials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Profile() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const events = useAppStore((s) => s.events);
  const confirmedIds = useAppStore((s) => s.confirmedIds);
  const reportedIds = useAppStore((s) => s.reportedIds);
  const [tab, setTab] = useState<Tab>('going');

  const now = useMemo(() => new Date(), [events, confirmedIds, reportedIds]);
  const lists = useMemo(
    () => getProfileEvents({ user, events, confirmedIds, reportedIds }, now),
    [user, events, confirmedIds, reportedIds, now],
  );
  const list = lists[tab];
  const subtitle = [user?.classYear, user?.major].filter(Boolean).join(' · ');

  return (
    <div className="screen screen--main">
      <h1 className="page-heading">Profile</h1>

      <div className="profile__header">
        <button
          type="button"
          className="profile__avatar"
          aria-label="Edit profile"
          onClick={() => navigate('/profile/edit')}
        >
          <span className="profile__initials">{initials(user?.name)}</span>
          <span className="profile__avatar-edit">
            <IconPencil size={12} />
          </span>
        </button>
        <div className="profile__identity">
          <span className="profile__name">{user?.name ?? 'Guest'}</span>
          {subtitle && <span className="profile__subtitle">{subtitle}</span>}
          {user?.bio && <span className="profile__bio">{user.bio}</span>}
        </div>
      </div>

      {user && user.interests.length > 0 && (
        <div className="profile__interests" aria-label="Interests">
          {user.interests.map((id) => (
            <span key={id} className="pill">
              {getCategory(id).label}
            </span>
          ))}
        </div>
      )}

      <div className="profile__stats" role="tablist" aria-label="Your events">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`profile__stat${tab === id ? ' profile__stat--active' : ''}`}
            onClick={() => setTab(id)}
          >
            <CountUp value={lists[id].length} className="profile__stat-count" />
            <span className="profile__stat-label">{label}</span>
            {tab === id && (
              <motion.span
                layoutId="profile-tab-indicator"
                className="profile__stat-indicator"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          role="tabpanel"
          className="profile__list"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {list.length === 0 ? (
            <EmptyTab tab={tab} />
          ) : (
            list.map((event) => (
              <ProfileRow
                key={event.id}
                event={event}
                tab={tab}
                now={now}
                onOpen={() => navigate(`/events/${event.id}`)}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>

      <section className="profile__account" aria-label="Account">
        <h2 className="profile__section-label">Account</h2>
        <div className="profile__account-list">
          <button type="button" className="profile__account-item" onClick={() => navigate('/profile/edit')}>
            Edit profile <IconChevronRight size={16} />
          </button>
          <button
            type="button"
            className="profile__account-item profile__account-item--danger"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}

function ProfileRow({
  event,
  tab,
  now,
  onOpen,
}: {
  event: CampusEvent;
  tab: Tab;
  now: Date;
  onOpen: () => void;
}) {
  const start = new Date(event.start);
  const day = formatDayHeading(start, now);
  const soon = tab !== 'attended' && (day === 'Today' || day === 'Tomorrow');
  const left = spotsLeft(event);

  let status: React.ReactNode = null;
  if (tab === 'hosting') {
    status = (
      <>
        {event.cancelled ? (
          <span className="event-row__tone-danger">Cancelled</span>
        ) : (
          <>
            <span className="event-row__tone-going">{event.goingCount} going</span>
            {left != null && <> · {left === 0 ? 'Full' : `${left} spots left`}</>}
          </>
        )}
      </>
    );
  }

  return (
    <EventRow
      start={start}
      title={event.title}
      subtitle={
        <>
          {soon ? <span className="profile__soon">{day}</span> : day} · {format(start, 'h:mm a')} ·{' '}
          {event.locationName}
        </>
      }
      status={status}
      highlight={soon && day === 'Today'}
      muted={tab === 'attended'}
      onOpen={onOpen}
    />
  );
}

function EmptyTab({ tab }: { tab: Tab }) {
  const navigate = useNavigate();
  const copy = {
    going: { text: "You haven't joined any upcoming events.", cta: 'Find events', to: '/feed', Icon: IconCalendar },
    hosting: { text: "You're not hosting anything yet.", cta: 'Host an event', to: '/create', Icon: IconPlus },
    attended: { text: 'Events you went to will show up here.', cta: null, to: null, Icon: IconCalendar },
  }[tab];

  return (
    <div className="profile__empty">
      <span className="profile__empty-icon">
        <copy.Icon size={20} />
      </span>
      <p>{copy.text}</p>
      {copy.cta && copy.to && (
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate(copy.to)}>
          {copy.cta}
        </button>
      )}
    </div>
  );
}

/** Animates a number up from 0 the first time it renders, then to each new value. */
function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(shown, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);

  return (
    <span className={className} aria-label={String(value)}>
      {shown}
    </span>
  );
}
