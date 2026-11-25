import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from './Icon';
import './Sheet.css';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom sheet that slides up over the current screen. Escape or tapping the backdrop closes it. */
export function Sheet({ open, title, onClose, children }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Focus the first field (or the panel) once it's on screen.
    const timer = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button:not(.sheet__close)');
      (first ?? panelRef.current)?.focus();
    }, 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const root = document.getElementById('root');
  if (!root) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="sheet__backdrop" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={panelRef}
            className="sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          >
            <span className="sheet__grabber" aria-hidden="true" />
            <div className="sheet__header">
              <h2 id={titleId} className="sheet__title">
                {title}
              </h2>
              <button type="button" className="sheet__close" aria-label="Close" onClick={onClose}>
                <IconX size={16} />
              </button>
            </div>
            <div className="sheet__body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    root,
  );
}
