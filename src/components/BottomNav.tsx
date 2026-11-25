import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { IconBookmark, IconCompass, IconPlus, IconUser } from './Icon';
import './BottomNav.css';

const ITEMS = [
  { label: 'Discover', Icon: IconCompass, to: '/feed' },
  { label: 'Create', Icon: IconPlus, to: '/create' },
  { label: 'Interested', Icon: IconBookmark, to: '/interested' },
  { label: 'Profile', Icon: IconUser, to: '/profile' },
] as const;

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {ITEMS.map(({ label, Icon, to }) => (
        <NavLink
          key={label}
          to={to}
          className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="bottom-nav__indicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <motion.span
                className="bottom-nav__icon"
                initial={false}
                animate={isActive ? { scale: [1, 1.2, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <Icon size={20} />
              </motion.span>
              <span className="bottom-nav__label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
