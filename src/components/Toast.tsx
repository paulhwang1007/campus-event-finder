import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import './Toast.css';

const VISIBLE_MS = 4000;

/** Shows the store's current toast above the bottom nav and hides it after a few seconds. */
export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const hideToast = useAppStore((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(hideToast, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      className={`toast${toast.tone === 'error' ? ' toast--error' : ''}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
    >
      <span className="toast__message">{toast.message}</span>
      {toast.action && (
        <button type="button" className="toast__action" onClick={toast.action.onClick}>
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
