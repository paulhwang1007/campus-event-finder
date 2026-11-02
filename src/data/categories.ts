import {
  IconBasketball,
  IconBook,
  IconCamera,
  IconGamepad,
  IconMountain,
  IconPalette,
  IconUtensils,
} from '../components/Icon';
import type { Category } from '../types';

function gradient(token: string): string {
  return `linear-gradient(135deg, var(${token}) 0%, color-mix(in srgb, var(${token}) 65%, black) 100%)`;
}

export const categories: Category[] = [
  { id: 'sports', label: 'Sports & Active', icon: IconBasketball, gradient: gradient('--color-primary') },
  { id: 'arts', label: 'Arts & Creative', icon: IconPalette, gradient: gradient('--color-secondary') },
  { id: 'food', label: 'Food & Hangouts', icon: IconUtensils, gradient: gradient('--color-highlight') },
  { id: 'outdoors', label: 'Outdoors', icon: IconMountain, gradient: gradient('--color-accent-4') },
  { id: 'games', label: 'Games & Movies', icon: IconGamepad, gradient: gradient('--color-focus') },
  { id: 'study', label: 'Study & Chill', icon: IconBook, gradient: gradient('--color-neutral') },
  { id: 'services', label: 'Student Services', icon: IconCamera, gradient: gradient('--color-danger') },
];

export function getCategory(id: Category['id']): Category {
  const category = categories.find((c) => c.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}
