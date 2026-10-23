import { categories } from '../data/categories';
import type { CategoryId } from '../types';
import './CategoryChips.css';

interface Props {
  value: CategoryId | 'all';
  onChange: (value: CategoryId | 'all') => void;
}

export function CategoryChips({ value, onChange }: Props) {
  return (
    <div className="category-chips" role="tablist" aria-label="Filter by category">
      <Chip label="All" active={value === 'all'} onClick={() => onChange('all')} />
      {categories.map((c) => (
        <Chip
          key={c.id}
          label={`${c.emoji} ${c.label}`}
          active={value === c.id}
          onClick={() => onChange(c.id)}
        />
      ))}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`category-chip${active ? ' category-chip--active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
