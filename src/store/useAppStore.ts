import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../lib/api';
import type { CampusEvent, NewEventInput, User } from '../types';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Server-backed fields that an optimistic update may need to roll back. */
type Snapshot = Pick<AppState, 'events' | 'savedIds' | 'passedIds' | 'confirmedIds'>;

interface AppState {
  status: LoadStatus;
  error: string | null;
  user: User | null;
  events: CampusEvent[];
  savedIds: string[]; // 'interested' or 'going'
  passedIds: string[];
  confirmedIds: string[]; // 'going'
  // Local-only (not stored on the server yet):
  reportedIds: string[];
  lastSeenUpdateAt: Record<string, string>;

  load: () => Promise<void>;
  clear: () => void;
  swipe: (eventId: string, action: 'save' | 'pass') => void;
  toggleSaved: (eventId: string) => void;
  confirmAttendance: (eventId: string) => void;
  resetPassed: () => void;
  markUpdatesSeen: (eventId: string) => void;
  createEvent: (input: NewEventInput) => Promise<string>;
}

function bumpCount(events: CampusEvent[], eventId: string, delta: number): CampusEvent[] {
  return events.map((e) =>
    e.id === eventId ? { ...e, interestedCount: Math.max(0, e.interestedCount + delta) } : e,
  );
}

const EMPTY_SERVER_STATE = {
  user: null,
  events: [],
  savedIds: [],
  passedIds: [],
  confirmedIds: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      /** Apply a local change right away, then sync it; undo the change if the request fails. */
      function optimistic(patch: Partial<Snapshot>, request: () => Promise<void>) {
        const { events, savedIds, passedIds, confirmedIds } = get();
        const before: Snapshot = { events, savedIds, passedIds, confirmedIds };
        set(patch);
        request().catch((err: unknown) => {
          console.error('Failed to save change, reverting', err);
          set(before);
        });
      }

      return {
        status: 'idle',
        error: null,
        ...EMPTY_SERVER_STATE,
        reportedIds: [],
        lastSeenUpdateAt: {},

        load: async () => {
          set({ status: 'loading', error: null });
          try {
            const [user, events, responses] = await Promise.all([
              api.fetchProfile(),
              api.fetchEvents(),
              api.fetchMyResponses(),
            ]);
            set({
              status: 'ready',
              user,
              events,
              savedIds: responses.filter((r) => r.status !== 'passed').map((r) => r.eventId),
              passedIds: responses.filter((r) => r.status === 'passed').map((r) => r.eventId),
              confirmedIds: responses.filter((r) => r.status === 'going').map((r) => r.eventId),
            });
          } catch (err) {
            console.error('Failed to load data', err);
            set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
          }
        },

        clear: () => set({ status: 'idle', error: null, ...EMPTY_SERVER_STATE }),

        swipe: (eventId, action) => {
          const { savedIds, passedIds, events } = get();
          if (action === 'save') {
            if (savedIds.includes(eventId)) return;
            optimistic(
              {
                savedIds: [...savedIds, eventId],
                passedIds: passedIds.filter((id) => id !== eventId),
                events: bumpCount(events, eventId, 1),
              },
              () => api.setResponse(eventId, 'interested'),
            );
          } else {
            if (passedIds.includes(eventId) || savedIds.includes(eventId)) return;
            optimistic({ passedIds: [...passedIds, eventId] }, () => api.setResponse(eventId, 'passed'));
          }
        },

        toggleSaved: (eventId) => {
          const { savedIds, passedIds, confirmedIds, events } = get();
          if (savedIds.includes(eventId)) {
            optimistic(
              {
                savedIds: savedIds.filter((id) => id !== eventId),
                confirmedIds: confirmedIds.filter((id) => id !== eventId),
                events: bumpCount(events, eventId, -1),
              },
              () => api.clearResponse(eventId),
            );
          } else {
            optimistic(
              {
                savedIds: [...savedIds, eventId],
                passedIds: passedIds.filter((id) => id !== eventId),
                events: bumpCount(events, eventId, 1),
              },
              () => api.setResponse(eventId, 'interested'),
            );
          }
        },

        confirmAttendance: (eventId) => {
          const { savedIds, passedIds, confirmedIds, events } = get();
          if (confirmedIds.includes(eventId)) return;
          const alreadySaved = savedIds.includes(eventId);
          optimistic(
            {
              savedIds: alreadySaved ? savedIds : [...savedIds, eventId],
              passedIds: passedIds.filter((id) => id !== eventId),
              confirmedIds: [...confirmedIds, eventId],
              events: alreadySaved ? events : bumpCount(events, eventId, 1),
            },
            () => api.setResponse(eventId, 'going'),
          );
        },

        resetPassed: () => {
          optimistic({ passedIds: [] }, () => api.clearPassedResponses());
        },

        markUpdatesSeen: (eventId) => {
          const event = get().events.find((e) => e.id === eventId);
          if (!event || event.updates.length === 0) return;
          const latest = event.updates[event.updates.length - 1];
          set({
            lastSeenUpdateAt: { ...get().lastSeenUpdateAt, [eventId]: latest.createdAt },
          });
        },

        createEvent: async (input) => {
          const event = await api.createEvent(input);
          set({ events: [...get().events, event] });
          return event.id;
        },
      };
    },
    {
      name: 'campus-events-local-v2',
      version: 2,
      // Everything else comes from the server on each load.
      partialize: (s) => ({ reportedIds: s.reportedIds, lastSeenUpdateAt: s.lastSeenUpdateAt }),
    },
  ),
);
