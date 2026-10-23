# TRD: Campus Event Discovery Prototype (v0.1)

Companion to `PRD.md`. This prototype is **frontend-only with local mock data**. It should be built so that a real backend and a design system can be swapped in later without rewriting screens.

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite + React 18 + TypeScript** | Fast setup; easy for teammates to run |
| Routing | **React Router v6** | Simple screen-based navigation |
| State | **Zustand** with the `persist` middleware (localStorage) | Small API; data persists across refreshes for testing |
| Swipe | **framer-motion** (`drag="x"`) | Swipe gestures with minimal code; buttons as a fallback |
| Styling | Plain CSS with CSS variables in `src/styles/tokens.css` | Minimal for now; the design brief will replace the token values later |
| Dates | **date-fns** | Relative time formatting ("Today 7 PM", "Happening now") |
| IDs | `crypto.randomUUID()` | No dependency needed |
| Lint/format | ESLint + Prettier (Vite defaults) | |

**Do not add:** a backend, auth libraries, a UI component library (MUI, Chakra, etc.), Tailwind, or a CSS-in-JS library. Keep styling swappable through tokens.

**Target viewport:** mobile-first at 390×844. On desktop, center the app in a phone-width column (max-width 430px).

## 2. Project Structure

```
src/
  main.tsx
  App.tsx                 # router + layout
  styles/
    tokens.css            # colors, spacing, radius, font. ONLY place for raw values
    global.css
  types.ts                # all domain types
  data/
    categories.ts         # 7 categories (id, label, emoji)
    seedEvents.ts         # seed generator using relative times
  store/
    useAppStore.ts        # Zustand store + persist
    selectors.ts          # feed ordering, filtering, search (pure functions)
  lib/
    time.ts               # formatEventTime, isOngoing, isPast
    validation.ts         # NetID regex, event form validation
  components/
    EventCard.tsx
    SwipeDeck.tsx
    CategoryChips.tsx
    EventFieldList.tsx    # the consistent details layout
    UpdateList.tsx
    BottomNav.tsx
    Button.tsx, TextField.tsx, Modal.tsx, EmptyState.tsx
  screens/
    onboarding/Welcome.tsx, VerifyNetId.tsx, ProfileSetup.tsx, PickInterests.tsx
    Feed.tsx
    EventDetails.tsx
    CreateEvent.tsx
    Saved.tsx
    AllEvents.tsx
    Profile.tsx           # includes My Events + Reset demo
    PostUpdate.tsx        # can be a modal instead
    Report.tsx            # can be a modal instead
```

## 3. Data Model (`types.ts`)

```ts
export type CategoryId =
  | 'sports' | 'arts' | 'food' | 'outdoors' | 'games' | 'study' | 'services';

export type ClassYear = 'First-year' | 'Sophomore' | 'Junior' | 'Senior' | 'Transfer';

export interface User {
  netId: string;           // e.g. "abc123"
  name: string;
  classYear: ClassYear;
  interests: CategoryId[]; // length >= 1
  verified: boolean;       // always true after onboarding (simulated)
}

export type OrganizerType = 'student' | 'club';

export interface EventUpdate {
  id: string;
  type: 'time' | 'location' | 'note';
  message: string;         // <= 280 chars
  createdAt: string;       // ISO
}

export interface CampusEvent {
  id: string;
  title: string;           // <= 60
  description: string;     // <= 500
  category: CategoryId;
  organizerType: OrganizerType;
  organizerName: string;   // student display name or club name
  organizerNetId: string;  // who posted it (determines edit rights)
  start: string;           // ISO
  end: string;             // ISO
  locationName: string;    // "Libe Slope"
  locationNote?: string;   // "near the bottom, by the bench"
  capacity?: number;       // undefined = no limit
  interestedCount: number; // seeded number; +1 when the current user saves
  accessibility?: string;
  participation?: string;  // what to bring, skill level
  updates: EventUpdate[];
  cancelled: boolean;
  createdAt: string;
}

export type ReportReason = 'inappropriate' | 'misleading' | 'unsafe' | 'not_cornell' | 'other';

export interface Report {
  id: string;
  eventId: string;
  reason: ReportReason;
  note?: string;
  createdAt: string;
}
```

## 4. Store (`useAppStore.ts`)

Persisted under the localStorage key `swipe-demo-v1`.

```ts
interface AppState {
  user: User | null;
  events: CampusEvent[];
  savedIds: string[];
  passedIds: string[];
  reportedIds: string[];
  reports: Report[];
  lastSeenUpdateAt: Record<string, string>; // eventId -> ISO of last viewed update
  lastSwipe?: { eventId: string; action: 'save' | 'pass' }; // for undo

  // actions
  completeOnboarding(user: Omit<User, 'verified'>): void;
  updateInterests(ids: CategoryId[]): void;
  swipe(eventId: string, action: 'save' | 'pass'): void;
  undoSwipe(): void;
  toggleSaved(eventId: string): void;
  createEvent(input: NewEventInput): string;   // returns id
  postUpdate(eventId: string, u: { type; message; newStart?; newEnd?; newLocationName?; newLocationNote? }): void;
  cancelEvent(eventId: string): void;          // adds a "Cancelled" note update
  reportEvent(eventId: string, reason: ReportReason, note?: string): void;
  markUpdatesSeen(eventId: string): void;
  resetPasses(): void;
  resetDemo(): void;                           // clears everything and reseeds
}
```

**Seeding:** on first load, or when `events` is empty, call `generateSeedEvents(new Date())`. Seed events store offsets (e.g., `startOffsetHours: -0.5, durationHours: 2`) and convert them to ISO strings at generation time, so the demo is always fresh. `resetDemo()` regenerates from the current time.

**Version safety:** if the persisted shape is invalid (e.g., after a schema change), clear storage and reseed. Use the Zustand persist `version` option with a migrate function that returns the initial state.

## 5. Selectors (`selectors.ts`): pure and unit-testable

- `isPast(e, now)`: `end < now` or `cancelled` (cancelled events still appear in Saved with a label)
- `isOngoing(e, now)`: `start <= now < end`
- `getFeed(state, now, categoryFilter)`:
  1. Remove past and cancelled events, plus anything in saved, passed, or reported, plus events the user organized.
  2. Apply the category filter if one is set.
  3. Split into events matching the user's interests and the rest. Sort each by `start` ascending, with ongoing events first.
  4. Return the matching group followed by the rest, tagging each with `isOutsideInterests`.
- `getSaved(state, now)`: returns `{ upcoming, past }` and excludes reported events
- `hasUnreadUpdate(state, eventId)`: true if the latest update's `createdAt` is later than `lastSeenUpdateAt[eventId]`
- `searchEvents(state, now, query, category?)`: case-insensitive match on title and description, excluding past and reported events
- `spotsLeft(e)`: `capacity - interestedCount`, or null if there is no capacity

## 6. Validation (`validation.ts`)

- NetID: `/^[a-z]{2,3}[0-9]{1,5}$/i`
- Event form: required fields, title ≤ 60, description ≤ 500, `end > start`, `start >= now - 60min`, capacity is an integer from 2 to 500 when provided, policy checkbox checked
- Return `Record<field, errorMessage>` so the UI can show inline errors.

## 7. Routes

| Path | Screen | Guard |
|---|---|---|
| `/welcome` | Welcome | Redirect to `/feed` if a user exists |
| `/onboarding/verify` | NetID entry + fake verify (~1.2 s spinner) | |
| `/onboarding/profile` | Name + class year | |
| `/onboarding/interests` | Pick interests | |
| `/feed` | Discovery Feed | Requires user |
| `/events` | All Events + search (P1) | Requires user |
| `/events/:id` | Event Details | Requires user |
| `/events/:id/update` | Post update (organizer only) | Requires user + organizer |
| `/events/:id/report` | Report | Requires user |
| `/create` | Create Event | Requires user |
| `/saved` | Saved | Requires user |
| `/profile` | Profile, edit interests, My Events, Reset demo | Requires user |

`RequireUser` wrapper: if there is no user, redirect to `/welcome`. Bottom nav (on main screens only): **Feed · Events · ＋ Create · Saved · Profile**.

## 8. Swipe Deck Behavior

- Render the top 2 cards stacked, so the next card is visible behind the current one.
- Use `drag="x"` on the top card. If the offset exceeds ±120px or the velocity exceeds 500 when released, fling the card off-screen and fire `swipe()`. Otherwise snap back.
- Rotate the card slightly while dragging (±10°) and fade in "INTERESTED" or "PASS" labels.
- ✕ and ✓ buttons trigger the same fling animation. Support keyboard shortcuts on desktop: ← passes, → saves.
- A tap that doesn't drag opens the details page. Distinguish the two with the drag-distance threshold.
- Accessibility: buttons have `aria-label`s, and the card is focusable with Enter opening details. Respect `prefers-reduced-motion` by skipping the fling animation.

## 9. Styling Contract (for the future design brief)

- All colors, spacing, radii, font families, and shadows live as CSS variables in `tokens.css`. Components must reference variables, never raw hex or px values (except 0 and 1px borders).
- Keep components presentational and screens thin, so restyling means editing tokens and component CSS only.
- Use a neutral grayscale palette with one accent color (e.g., `--color-accent: #B31B1B` as a Cornell-red placeholder). Use system fonts.

## 10. Testing

- **Vitest** unit tests for `selectors.ts`, `validation.ts`, and `time.ts`. Feed ordering and filtering are the most important to cover.
- Manual QA checklist: see Implementation Plan, Phase 6.
- No E2E framework for v0.1.

## 11. Future Backend Seam (not built now)

The store actions are the only place that mutates data. Later, these can call an API (e.g., Supabase or Firebase) with the same signatures. Real NetID auth would replace `completeOnboarding`. Reports would go to a moderation queue. Organizer updates would trigger push or email notifications.

## 12. Commands

```
npm create vite@latest swipe -- --template react-ts
npm i react-router-dom zustand framer-motion date-fns
npm i -D vitest
npm run dev      # local
npm run build    # static build, deployable to Vercel/Netlify/GitHub Pages for testing
```
