import { AnimatePresence, motion } from 'framer-motion';
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

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className={`toast${toast.tone === 'error' ? ' toast--error' : ''}`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          <span className="toast__message">{toast.message}</span>
          {toast.action && (
            <button type="button" className="toast__action" onClick={toast.action.onClick}>
              {toast.action.label}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
