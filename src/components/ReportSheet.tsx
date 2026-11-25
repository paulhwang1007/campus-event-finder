import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { CampusEvent, ReportReason } from '../types';
import { Sheet } from './Sheet';

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'inappropriate', label: 'Inappropriate' },
  { id: 'misleading', label: 'Misleading or spam' },
  { id: 'unsafe', label: 'Unsafe' },
  { id: 'not_cornell', label: 'Not a Cornell student event' },
  { id: 'other', label: 'Other' },
];

interface Props {
  event: CampusEvent;
  open: boolean;
  onClose: () => void;
  /** Called after the report is saved, e.g. to leave the now-hidden event. */
  onReported: () => void;
}

export function ReportSheet({ event, open, onClose, onReported }: Props) {
  const reportEvent = useAppStore((s) => s.reportEvent);
  const showToast = useAppStore((s) => s.showToast);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!reason) return;
    setSubmitting(true);
    const ok = await reportEvent(event.id, reason, note);
    setSubmitting(false);
    if (ok) {
      onClose();
      showToast("Thanks for reporting. We've hidden this event for you.");
      onReported();
    }
  }

  return (
    <Sheet open={open} title="Report event" onClose={onClose}>
      <p className="sheet-hint">
        What's wrong with “{event.title}”? It will be hidden from your feed and lists.
      </p>

      <fieldset className="sheet-options">
        <legend className="sheet-hint">Reason</legend>
        {REASONS.map((r) => (
          <label key={r.id} className="sheet-option">
            <input
              type="radio"
              name="report-reason"
              value={r.id}
              checked={reason === r.id}
              onChange={() => setReason(r.id)}
            />
            {r.label}
          </label>
        ))}
      </fieldset>

      <label className="sheet-field">
        Anything else? (optional)
        <textarea
          className="sheet-input"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <div className="sheet-actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn" disabled={!reason || submitting} onClick={() => void submit()}>
          {submitting ? 'Sending…' : 'Report'}
        </button>
      </div>
    </Sheet>
  );
}
