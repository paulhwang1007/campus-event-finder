import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { IconChevronRight } from './Icon';
import './EventRow.css';

interface Props {
  start: Date;
  title: string;
  /** Second line, e.g. "5:00–8:00 PM · Jessup Courts". */
  subtitle: ReactNode;
  /** Optional third line for status such as "✓ Going" or "2 spots left". */
  status?: ReactNode;
  /** Shown at the right edge. Defaults to a chevron. Use an action button here, never inside the row. */
  trailing?: ReactNode;
  /** Small red dot on the date block, e.g. for unseen host updates. */
  badge?: boolean;
  /** Greyed out, for events that already happened. */
  muted?: boolean;
  /** Solid red date block, for events happening today. */
  highlight?: boolean;
  onOpen: () => void;
  ariaLabel?: string;
}

/** Compact list row: date block, title, one or two info lines, and an optional action on the right. */
export function EventRow({
  start,
  title,
  subtitle,
  status,
  trailing,
  badge,
  muted,
  highlight,
  onOpen,
  ariaLabel,
}: Props) {
  const classes = ['event-row', muted && 'event-row--muted', highlight && 'event-row--highlight']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <button type="button" className="event-row__main" onClick={onOpen} aria-label={ariaLabel}>
        <span className="event-row__date" aria-hidden="true">
          <span className="event-row__month">{format(start, 'MMM').toUpperCase()}</span>
          <span className="event-row__day">{format(start, 'd')}</span>
          {badge && <span className="event-row__badge" />}
        </span>
        <span className="event-row__info">
          <span className="event-row__title">{title}</span>
          <span className="event-row__subtitle">{subtitle}</span>
          {status && <span className="event-row__status">{status}</span>}
        </span>
        {trailing === undefined && <IconChevronRight size={16} className="event-row__chevron" />}
      </button>
      {trailing !== undefined && <div className="event-row__trailing">{trailing}</div>}
    </div>
  );
}
