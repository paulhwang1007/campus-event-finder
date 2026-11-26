import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { CampusEvent } from '../types';
import { Sheet } from './Sheet';

const MESSAGE_MAX = 280;

interface Props {
  event: CampusEvent;
  open: boolean;
  onClose: () => void;
}

/**
 * A note from the host to everyone who saved or joined, e.g. "Bring water". Changes to the time
 * or location go through Edit instead, which tells guests automatically.
 */
export function MessageGuestsSheet({ event, open, onClose }: Props) {
  const postUpdate = useAppStore((s) => s.postUpdate);
  const showToast = useAppStore((s) => s.showToast);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const trimmed = message.trim();

  async function send() {
    if (!trimmed) return;
    setSubmitting(true);
    const ok = await postUpdate(event.id, { type: 'note', message: trimmed });
    setSubmitting(false);
    if (ok) {
      showToast('Message sent. People who saved this event will see it.');
      setMessage('');
      onClose();
    }
  }

  return (
    <Sheet open={open} title="Message guests" onClose={onClose}>
      <p className="sheet-hint">
        Everyone who saved or joined sees this under Updates, with a new-update dot. To change the time or
        location, use Edit.
      </p>

      <label className="sheet-field">
        Message
        <textarea
          className="sheet-input"
          value={message}
          maxLength={MESSAGE_MAX}
          placeholder="e.g. Bring a water bottle, it’s going to be hot."
          onChange={(e) => setMessage(e.target.value)}
        />
        <span className="sheet-hint" aria-live="polite">
          {message.length}/{MESSAGE_MAX}
        </span>
      </label>

      <div className="sheet-actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn" disabled={!trimmed || submitting} onClick={() => void send()}>
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </div>
    </Sheet>
  );
}
