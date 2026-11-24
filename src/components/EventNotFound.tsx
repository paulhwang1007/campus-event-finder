import { useNavigate } from 'react-router-dom';
import './EventNotFound.css';

export function EventNotFound() {
  const navigate = useNavigate();
  return (
    <div className="screen event-not-found">
      <h1 className="event-not-found__heading">Event not found</h1>
      <p className="event-not-found__text">This event was removed or doesn't exist.</p>
      <button type="button" className="event-not-found__cta" onClick={() => navigate('/feed')}>
        Back to Discover
      </button>
    </div>
  );
}
