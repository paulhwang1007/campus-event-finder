import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateSeedEvents } from '../data/seedEvents';
import type { CampusEvent, User } from '../types';

const DEFAULT_USER: User = {
  netId: 'test123',
  name: 'Test User',
  classYear: 'Sophomore',
  interests: ['food', 'games', 'outdoors'],
  verified: true,
};

interface AppState {
  user: User | null;
  events: CampusEvent[];
  savedIds: string[];
  passedIds: string[];
  reportedIds: string[];
  lastSeenUpdateAt: Record<string, string>;

  swipe: (eventId: string, action: 'save' | 'pass') => void;
  toggleSaved: (eventId: string) => void;
  markUpdatesSeen: (eventId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: DEFAULT_USER,
      events: generateSeedEvents(new Date()),
      savedIds: [],
      passedIds: [],
      reportedIds: [],
      lastSeenUpdateAt: {},

      swipe: (eventId, action) => {
        const { savedIds, passedIds, events } = get();
        if (action === 'save') {
          if (savedIds.includes(eventId)) return;
          set({
            savedIds: [...savedIds, eventId],
            events: events.map((e) =>
              e.id === eventId ? { ...e, interestedCount: e.interestedCount + 1 } : e,
            ),
          });
        } else {
          if (passedIds.includes(eventId)) return;
          set({ passedIds: [...passedIds, eventId] });
        }
      },

      toggleSaved: (eventId) => {
        const { savedIds, events } = get();
        const isSaved = savedIds.includes(eventId);
        set({
          savedIds: isSaved ? savedIds.filter((id) => id !== eventId) : [...savedIds, eventId],
          events: events.map((e) =>
            e.id === eventId
              ? { ...e, interestedCount: e.interestedCount + (isSaved ? -1 : 1) }
              : e,
          ),
        });
      },

      markUpdatesSeen: (eventId) => {
        const event = get().events.find((e) => e.id === eventId);
        if (!event || event.updates.length === 0) return;
        const latest = event.updates[event.updates.length - 1];
        set({
          lastSeenUpdateAt: { ...get().lastSeenUpdateAt, [eventId]: latest.createdAt },
        });
      },
    }),
    {
      name: 'swipe-demo-v1',
      version: 1,
    },
  ),
);
