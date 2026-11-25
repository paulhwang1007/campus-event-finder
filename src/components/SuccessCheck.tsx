import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import './SuccessCheck.css';

/** Success moment: the red circle springs in, the check draws itself, then the text fades up. */
export function SuccessCheck({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="success-check">
      <motion.span
        className="success-check__circle"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
      >
        <svg width="40" height="40" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <motion.path
            d="M4 10.5 8 14.5 16 5.5"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.25, duration: 0.35, ease: 'easeOut' }}
          />
        </svg>
      </motion.span>
      <motion.div
        className="success-check__text"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.3 }}
      >
        <h1 className="success-check__title">{title}</h1>
        {children}
      </motion.div>
    </div>
  );
}
