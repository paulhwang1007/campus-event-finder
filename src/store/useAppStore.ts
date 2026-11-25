import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../lib/api';
import { updatesForEdit } from '../lib/updateMessages';
import type {
  CampusEvent,
  EventEditInput,
  NewEventInput,
  NewUpdateInput,
  PhotoChange,
  ProfileInput,
  ReportReason,
  User,
} from '../types';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Server-backed fields that an optimistic update may need to roll back. */
type Snapshot = Pick<AppState, 'events' | 'savedIds' | 'passedIds' | 'confirmedIds' | 'reportedIds'>;

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
  action?: { label: string; onClick: () => void };
}

interface AppState {
  status: LoadStatus;
  error: string | null;
  lastLoadedAt: number | null;
  user: User | null;
  events: CampusEvent[];
  savedIds: string[]; // 'interested' or 'going'
  passedIds: string[];
  confirmedIds: string[]; // 'going'
  reportedIds: string[];
  toast: Toast | null;
  // Local-only (kept on this device):
  lastSeenUpdateAt: Record<string, string>;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;

  swipe: (eventId: string, action: 'save' | 'pass') => void;
  undoSwipe: (eventId: string) => void;
  toggleSaved: (eventId: string) => Promise<boolean>;
  confirmAttendance: (eventId: string) => Promise<boolean>;
  leaveEvent: (eventId: string) => Promise<boolean>;
  resetPassed: () => void;
  markUpdatesSeen: (eventId: string) => void;

  /** Uploads the photo first (if any), then creates the event. Resolves to the new event's id. */
  createEvent: (input: NewEventInput, photo?: Blob | null) => Promise<string>;
  cancelEvent: (eventId: string) => Promise<boolean>;
  /** Host edit. Time or location changes also post an update so people who saved it are told. */
  editEvent: (eventId: string, input: EventEditInput, photo: PhotoChange) => Promise<boolean>;
  postUpdate: (eventId: string, input: NewUpdateInput) => Promise<boolean>;
  reportEvent: (eventId: string, reason: ReportReason, note?: string) => Promise<boolean>;
  resetDemo: () => Promise<boolean>;
  updateProfile: (input: ProfileInput) => Promise<void>;

  showToast: (message: string, options?: { tone?: Toast['tone']; action?: Toast['action'] }) => void;
  hideToast: () => void;
}

function bumpCounts(
  events: CampusEvent[],
  eventId: string,
  delta: { interested?: number; going?: number },
): CampusEvent[] {
  return events.map((e) =>
    e.id === eventId
      ? {
          ...e,
          interestedCount: Math.max(0, e.interestedCount + (delta.interested ?? 0)),
          goingCount: Math.max(0, e.goingCount + (delta.going ?? 0)),
        }
      : e,
  );
}

function without(ids: string[], id: string): string[] {
  return ids.filter((x) => x !== id);
}

/** Errors raised on purpose by the database (e.g. "This event is full.") are safe to show as-is. */
function friendlyError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  if (e?.code === 'P0001' && e.message) return e.message;
  return "Couldn't save that. Check your connection and try again.";
}

const EMPTY_SERVER_STATE = {
  user: null,
  events: [],
  savedIds: [],
  passedIds: [],
  confirmedIds: [],
  reportedIds: [],
  lastLoadedAt: null,
};

let toastId = 0;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      /**
       * Apply a local change right away, then sync it. If the request fails, undo the
       * change and show an error toast. Resolves to whether the save succeeded.
       */
      async function optimistic(patch: Partial<Snapshot>, request: () => Promise<void>): Promise<boolean> {
        const { events, savedIds, passedIds, confirmedIds, reportedIds } = get();
        const before: Snapshot = { events, savedIds, passedIds, confirmedIds, reportedIds };
        set(patch);
        try {
          await request();
          return true;
        } catch (err) {
          console.error('Failed to save change, reverting', err);
          set(before);
          get().showToast(friendlyError(err), { tone: 'error' });
          return false;
        }
      }

      async function fetchAll() {
        const [user, events, responses, reportedIds] = await Promise.all([
          api.fetchProfile(),
          api.fetchEvents(),
          api.fetchMyResponses(),
          api.fetchMyReportedIds(),
        ]);
        return {
          user,
          events,
          savedIds: responses.filter((r) => r.status !== 'passed').map((r) => r.eventId),
          passedIds: responses.filter((r) => r.status === 'passed').map((r) => r.eventId),
          confirmedIds: responses.filter((r) => r.status === 'going').map((r) => r.eventId),
          reportedIds,
          lastLoadedAt: Date.now(),
        };
      }

      return {
        status: 'idle',
        error: null,
        ...EMPTY_SERVER_STATE,
        toast: null,
        lastSeenUpdateAt: {},

        load: async () => {
          set({ status: 'loading', error: null });
          try {
            set({ status: 'ready', ...(await fetchAll()) });
          } catch (err) {
            console.error('Failed to load data', err);
            // Supabase errors are plain objects with a message, not Error instances.
            const message = (err as { message?: string })?.message ?? String(err);
            set({ status: 'error', error: message });
          }
        },

        /** Re-fetch in the background without showing the loading screen. */
        refresh: async () => {
          if (get().status !== 'ready') return;
          try {
            set(await fetchAll());
          } catch (err) {
            console.error('Background refresh failed', err);
          }
        },

        clear: () => set({ status: 'idle', error: null, toast: null, ...EMPTY_SERVER_STATE }),

        swipe: (eventId, action) => {
          const { savedIds, passedIds, events, showToast, undoSwipe } = get();
          const undo = { label: 'Undo', onClick: () => undoSwipe(eventId) };
          if (action === 'save') {
            if (savedIds.includes(eventId)) return;
            showToast('Saved to Interested', { action: undo });
            void optimistic(
              {
                savedIds: [...savedIds, eventId],
                passedIds: without(passedIds, eventId),
                events: bumpCounts(events, eventId, { interested: 1 }),
              },
              () => api.setResponse(eventId, 'interested'),
            );
          } else {
            if (passedIds.includes(eventId) || savedIds.includes(eventId)) return;
            showToast('Passed', { action: undo });
            void optimistic({ passedIds: [...passedIds, eventId] }, () => api.setResponse(eventId, 'passed'));
          }
        },

        undoSwipe: (eventId) => {
          const { savedIds, passedIds, confirmedIds, events, hideToast } = get();
          hideToast();
          if (confirmedIds.includes(eventId)) return; // joined since swiping; leave that alone
          const wasSaved = savedIds.includes(eventId);
          if (!wasSaved && !passedIds.includes(eventId)) return;
          void optimistic(
            {
              savedIds: without(savedIds, eventId),
              passedIds: without(passedIds, eventId),
              events: wasSaved ? bumpCounts(events, eventId, { interested: -1 }) : events,
            },
            () => api.clearResponse(eventId),
          );
        },

        toggleSaved: (eventId) => {
          const { savedIds, passedIds, confirmedIds, events } = get();
          if (savedIds.includes(eventId)) {
            const wasGoing = confirmedIds.includes(eventId);
            return optimistic(
              {
                savedIds: without(savedIds, eventId),
                confirmedIds: without(confirmedIds, eventId),
                events: bumpCounts(events, eventId, { interested: -1, going: wasGoing ? -1 : 0 }),
              },
              () => api.clearResponse(eventId),
            );
          }
          return optimistic(
            {
              savedIds: [...savedIds, eventId],
              passedIds: without(passedIds, eventId),
              events: bumpCounts(events, eventId, { interested: 1 }),
            },
            () => api.setResponse(eventId, 'interested'),
          );
        },

        confirmAttendance: async (eventId) => {
          const { savedIds, passedIds, confirmedIds, events } = get();
          if (confirmedIds.includes(eventId)) return true;
          const alreadySaved = savedIds.includes(eventId);
          return optimistic(
            {
              savedIds: alreadySaved ? savedIds : [...savedIds, eventId],
              passedIds: without(passedIds, eventId),
              confirmedIds: [...confirmedIds, eventId],
              events: bumpCounts(events, eventId, { interested: alreadySaved ? 0 : 1, going: 1 }),
            },
            () => api.setResponse(eventId, 'going'),
          );
        },

        /** Going → back to just Interested. */
        leaveEvent: async (eventId) => {
          const { confirmedIds, events } = get();
          if (!confirmedIds.includes(eventId)) return true;
          return optimistic(
            {
              confirmedIds: without(confirmedIds, eventId),
              events: bumpCounts(events, eventId, { going: -1 }),
            },
            () => api.setResponse(eventId, 'interested'),
          );
        },

        resetPassed: () => {
          void optimistic({ passedIds: [] }, () => api.clearPassedResponses());
        },

        markUpdatesSeen: (eventId) => {
          const event = get().events.find((e) => e.id === eventId);
          if (!event || event.updates.length === 0) return;
          const latest = event.updates[event.updates.length - 1];
          set({
            lastSeenUpdateAt: { ...get().lastSeenUpdateAt, [eventId]: latest.createdAt },
          });
        },

        createEvent: async (input, photo) => {
          const photoPath = photo ? await api.uploadEventPhoto(photo) : undefined;
          try {
            const event = await api.createEvent({ ...input, photoPath });
            set({ events: [...get().events, event] });
            return event.id;
          } catch (err) {
            // Don't leave an orphaned photo behind if the event itself failed to save.
            if (photoPath) void api.deleteEventPhoto(photoPath).catch(() => {});
            throw err;
          }
        },

        cancelEvent: async (eventId) => {
          const { events } = get();
          return optimistic(
            { events: events.map((e) => (e.id === eventId ? { ...e, cancelled: true } : e)) },
            () => api.cancelEvent(eventId),
          );
        },

        editEvent: async (eventId, input, photo) => {
          const before = get().events.find((e) => e.id === eventId);
          if (!before) return false;

          let uploadedPath: string | null = null;
          try {
            if (photo.kind === 'replace') uploadedPath = await api.uploadEventPhoto(photo.photo);
            const photoPath =
              photo.kind === 'replace' ? uploadedPath : photo.kind === 'remove' ? null : (before.photoPath ?? null);
            const updates = updatesForEdit(before, input, new Date());
            const fresh = await api.editEvent(eventId, input, photoPath, updates);

            const { events, lastSeenUpdateAt } = get();
            const latest = fresh.updates[fresh.updates.length - 1];
            set({
              events: events.map((e) => (e.id === eventId ? fresh : e)),
              // The host made these changes, so the updates aren't "new" to them.
              lastSeenUpdateAt:
                updates.length > 0 && latest ? { ...lastSeenUpdateAt, [eventId]: latest.createdAt } : lastSeenUpdateAt,
            });

            // Only now that the save worked, delete the photo that was replaced or removed.
            if (photo.kind !== 'keep' && before.photoPath) void api.deleteEventPhoto(before.photoPath).catch(() => {});
            return true;
          } catch (err) {
            console.error('Failed to save event changes', err);
            if (uploadedPath) void api.deleteEventPhoto(uploadedPath).catch(() => {});
            get().showToast(friendlyError(err), { tone: 'error' });
            return false;
          }
        },

        postUpdate: async (eventId, input) => {
          try {
            const update = await api.postEventUpdate(eventId, input);
            const { events, lastSeenUpdateAt } = get();
            set({
              events: events.map((e) => {
                if (e.id !== eventId) return e;
                const changed =
                  input.type === 'time'
                    ? { start: input.start, end: input.end }
                    : input.type === 'location'
                      ? { locationName: input.locationName }
                      : {};
                return { ...e, ...changed, updates: [...e.updates, update] };
              }),
              // The host wrote it, so it isn't "new" to them.
              lastSeenUpdateAt: { ...lastSeenUpdateAt, [eventId]: update.createdAt },
            });
            return true;
          } catch (err) {
            console.error('Failed to post update', err);
            get().showToast(friendlyError(err), { tone: 'error' });
            return false;
          }
        },

        reportEvent: (eventId, reason, note) => {
          const { reportedIds } = get();
          if (reportedIds.includes(eventId)) return Promise.resolve(true);
          return optimistic({ reportedIds: [...reportedIds, eventId] }, () =>
            api.reportEvent(eventId, reason, note),
          );
        },

        resetDemo: async () => {
          try {
            await api.resetDemo();
          } catch (err) {
            console.error('Demo reset failed', err);
            get().showToast(friendlyError(err), { tone: 'error' });
            return false;
          }
          set({ lastSeenUpdateAt: {} });
          await get().load();
          get().showToast('Demo reset. Everything is back to the starting state.');
          return true;
        },

        updateProfile: async (input) => {
          const user = await api.updateProfile(input);
          set({ user });
        },

        showToast: (message, options) => {
          set({ toast: { id: ++toastId, message, tone: options?.tone ?? 'info', action: options?.action } });
        },

        hideToast: () => set({ toast: null }),
      };
    },
    {
      name: 'campus-events-local-v2',
      version: 3,
      // Reports moved to the server in v3; only "seen updates" stay on this device.
      migrate: (persisted) => ({
        lastSeenUpdateAt: (persisted as { lastSeenUpdateAt?: Record<string, string> })?.lastSeenUpdateAt ?? {},
      }),
      // Everything else comes from the server on each load.
      partialize: (s) => ({ lastSeenUpdateAt: s.lastSeenUpdateAt }),
    },
  ),
);
