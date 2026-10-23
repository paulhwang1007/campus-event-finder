import type { Category } from '../types';

export const categories: Category[] = [
  { id: 'sports', label: 'Sports & Active', emoji: '🏀' },
  { id: 'arts', label: 'Arts & Creative', emoji: '🎨' },
  { id: 'food', label: 'Food & Hangouts', emoji: '🍕' },
  { id: 'outdoors', label: 'Outdoors', emoji: '🌄' },
  { id: 'games', label: 'Games & Movies', emoji: '🎮' },
  { id: 'study', label: 'Study & Chill', emoji: '📚' },
  { id: 'services', label: 'Student Services', emoji: '📸' },
];

export function getCategory(id: Category['id']): Category {
  const category = categories.find((c) => c.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}
