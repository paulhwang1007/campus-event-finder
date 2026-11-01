import type { Category } from '../types';

function gradient(token: string): string {
  return `linear-gradient(135deg, var(${token}) 0%, color-mix(in srgb, var(${token}) 65%, black) 100%)`;
}

export const categories: Category[] = [
  { id: 'sports', label: 'Sports & Active', emoji: '🏀', gradient: gradient('--color-primary') },
  { id: 'arts', label: 'Arts & Creative', emoji: '🎨', gradient: gradient('--color-secondary') },
  { id: 'food', label: 'Food & Hangouts', emoji: '🍕', gradient: gradient('--color-highlight') },
  { id: 'outdoors', label: 'Outdoors', emoji: '🌄', gradient: gradient('--color-accent-4') },
  { id: 'games', label: 'Games & Movies', emoji: '🎮', gradient: gradient('--color-focus') },
  { id: 'study', label: 'Study & Chill', emoji: '📚', gradient: gradient('--color-neutral') },
  { id: 'services', label: 'Student Services', emoji: '📸', gradient: gradient('--color-danger') },
];

export function getCategory(id: Category['id']): Category {
  const category = categories.find((c) => c.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}
