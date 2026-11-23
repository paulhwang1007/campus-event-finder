# Backend plan: Supabase + Cornell-only Google login

## Context
The app is a Vite + React 19 + TS SPA whose data lives entirely in a persisted Zustand store (`src/store/useAppStore.ts`) seeded from `src/data/seedEvents.ts`, with a hardcoded user `test123`. We need a real backend for the core features: **list events**, **save interested / passed per user**, and **create event** (so events are shared). Access must be limited to the Cornell community via **OAuth with a @cornell.edu account**.

## Stack: Supabase (hosted Postgres + auto REST API + Auth)
- No server code: frontend uses `@supabase/supabase-js` directly; security enforced by Postgres Row Level Security (RLS).
- Fits the existing SPA; one new dependency. Free tier is enough. Already named as the intended backend in `Cornell Event App Implementation Plan.md`.
- **Login: Supabase's built-in Google OAuth provider.** Cornell NetIDs have Google Workspace accounts (`netid@cornell.edu`), so "Sign in with Google" + a cornell.edu restriction works without Cornell IT involvement. (Microsoft/Azure via Cornell's tenant is the alternative but typically needs IT approval for the app registration — not worth it for now.)

## Enforcing Cornell-only (3 layers)
1. **UI hint**: `signInWithOAuth({ provider: 'google', options: { queryParams: { hd: 'cornell.edu' } } })` — only shows Cornell accounts in Google's picker. This is a hint, not security.
2. **Block signup server-side**: Supabase "Before User Created" auth hook (a Postgres function) rejects any email not ending in `@cornell.edu`, so non-Cornell users never get an account.
3. **RLS backstop**: policies also check `auth.jwt()->>'email' like '%@cornell.edu'`.

## Data model (`supabase/schema.sql`)
- `profiles`: id uuid pk → auth.users, net_id (email prefix), name (from Google), class_year, major, bio, interests text[], created_at. Auto-created by a trigger on new auth user. Maps to existing `User` type (`verified` = true for everyone, since cornell.edu is enforced).
- `events`: id uuid pk, title, description, category (check on the 7 `CategoryId`s), organizer_type, organizer_name, organizer_id → profiles, start_at, end_at, location_name, location_note, capacity, accessibility, participation, cancelled, created_at.
- `event_responses`: user_id, event_id, status `'interested' | 'passed' | 'going'`, created_at; **pk (user_id, event_id)**. Replaces `savedIds` / `passedIds` / `confirmedIds`.
- `events_with_counts` view: events + `interested_count` (responses with status interested/going) + organizer net_id — replaces the denormalized `interestedCount`.
- `event_updates` deferred (keep `updates: []`).
- **RLS**: events readable by signed-in Cornell users; insert/update only where `organizer_id = auth.uid()`. event_responses and profiles: users read/write only their own rows (profiles readable by all signed-in users for organizer display).
- `supabase/seed.sql`: port `seedEvents.ts` templates (using `now() + interval` offsets), owned by a placeholder seed organizer profile.

## Frontend changes
- `src/lib/supabase.ts` (new): client from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (`.env.local`, gitignored; add `.env.example`).
- `src/lib/api.ts` (new): `fetchEvents`, `fetchMyResponses`, `fetchProfile`, `updateProfile`, `setResponse(eventId, status)`, `clearResponse`, `createEvent`; maps snake_case rows ↔ existing `CampusEvent`/`User` types so `src/types.ts` and components stay unchanged.
- `src/screens/Login.tsx` (new): single "Sign in with Cornell Google" button, styled with existing tokens.
- `src/App.tsx`: auth gate — listen to `supabase.auth.onAuthStateChange`; no session → `Login`; session → `load()` then render routes. Show a loading state meanwhile.
- `src/store/useAppStore.ts`: keep state shape and action names so screens and `selectors.ts` don't change. `user` comes from `profiles` (`netId` = uid-backed net_id so the `organizerNetId` checks in selectors keep working). Add `load()`. Make `swipe`, `toggleSaved`, `confirmAttendance`, `createEvent` **optimistic** (update local state, call API, revert on error). Remove `persist` for server data; keep `lastSeenUpdateAt` / `reportedIds` local. Replace `resetDemo` with `signOut`.
- `src/screens/CreateEvent.tsx`: await the now-async `createEvent` before navigating.
- `src/screens/Profile.tsx`: add a sign-out button; profile fields read from DB (editing class year/interests can come later — defaults until then).

## One-time setup (manual)
1. Create a Supabase project.
2. Google Cloud Console: create an OAuth client (Web), add Supabase's callback URL as authorized redirect; paste client ID/secret into Supabase → Auth → Providers → Google.
3. Supabase → Auth → URL config: add `http://localhost:5173` (and the deployed URL later) as redirect URLs.
4. Run `schema.sql` (includes the before-user-created hook function), enable the hook in Auth → Hooks, then run `seed.sql`.
5. Put URL + anon key in `.env.local`.

## Verification
- `npm test` — existing selector/time/validation tests still pass.
- `npm run dev`: unauthenticated → login screen. Sign in with a cornell.edu Google account → feed shows seeded events; a `profiles` row is created.
- Try a personal gmail → signup rejected, no user row created.
- Swipe right/left → rows in `event_responses`; refresh / sign out + back in keeps Interested page state; counts update.
- Second Cornell account in another browser: separate saves, sees events created by the first.
