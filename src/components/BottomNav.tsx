import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const ITEMS = [
  { label: 'Discover', icon: '🧭', to: '/feed' },
  { label: 'Create', icon: '＋', to: null },
  { label: 'Interested', icon: '🔖', to: null },
  { label: 'Profile', icon: '👤', to: null },
] as const;

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {ITEMS.map((item) =>
        item.to ? (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ) : (
          <span key={item.label} className="bottom-nav__item bottom-nav__item--disabled" aria-disabled="true">
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </span>
        ),
      )}
    </nav>
  );
}
