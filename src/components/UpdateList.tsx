import { formatDistanceToNow } from 'date-fns';
import type { EventUpdate } from '../types';
import './UpdateList.css';

const TYPE_ICON: Record<EventUpdate['type'], string> = {
  time: '🕒',
  location: '📍',
  note: '📣',
};

interface Props {
  updates: EventUpdate[];
}

export function UpdateList({ updates }: Props) {
  if (updates.length === 0) {
    return <p className="update-list__empty">No updates yet.</p>;
  }

  const sorted = [...updates].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <ul className="update-list">
      {sorted.map((u) => (
        <li key={u.id} className="update-list__item">
          <span className="update-list__icon">{TYPE_ICON[u.type]}</span>
          <div>
            <p className="update-list__message">{u.message}</p>
            <span className="update-list__time">{formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
