import { NavLink } from 'react-router-dom';
import { IconBookmark, IconCompass, IconPlus, IconUser } from './Icon';
import './BottomNav.css';

const ITEMS = [
  { label: 'Discover', Icon: IconCompass, to: '/feed' },
  { label: 'Create', Icon: IconPlus, to: null },
  { label: 'Interested', Icon: IconBookmark, to: null },
  { label: 'Profile', Icon: IconUser, to: null },
] as const;

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {ITEMS.map(({ label, Icon, to }) =>
        to ? (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ) : (
          <span key={label} className="bottom-nav__item bottom-nav__item--disabled" aria-disabled="true">
            <Icon size={20} />
            <span>{label}</span>
          </span>
        ),
      )}
    </nav>
  );
}
