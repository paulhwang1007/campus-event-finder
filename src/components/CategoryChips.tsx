import { motion } from 'framer-motion';
import { useId } from 'react';
import { categories } from '../data/categories';
import type { CategoryId } from '../types';
import './CategoryChips.css';

interface Props {
  value: CategoryId | 'all';
  onChange: (value: CategoryId | 'all') => void;
}

export function CategoryChips({ value, onChange }: Props) {
  // Scope the sliding highlight to this chip row, so two rows never share one indicator.
  const indicatorId = useId();
  return (
    <div className="category-chips" role="tablist" aria-label="Filter by category">
      <Chip label="All" active={value === 'all'} indicatorId={indicatorId} onClick={() => onChange('all')} />
      {categories.map((c) => (
        <Chip
          key={c.id}
          label={c.label}
          active={value === c.id}
          indicatorId={indicatorId}
          onClick={() => onChange(c.id)}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  active,
  indicatorId,
  onClick,
}: {
  label: string;
  active: boolean;
  indicatorId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`category-chip${active ? ' category-chip--active' : ''}`}
      onClick={(e) => {
        e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
        onClick();
      }}
    >
      {active && (
        <motion.span
          layoutId={`chip-${indicatorId}`}
          className="category-chip__indicator"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      )}
      <span className="category-chip__label">{label}</span>
    </button>
  );
}
