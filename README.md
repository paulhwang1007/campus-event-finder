# campus-event-finder

A swipe-style app for finding casual events around Cornell. Frontend: Vite + React + Zustand. Backend: Supabase (Postgres + Google sign-in, restricted to @cornell.edu).

## Backend setup (one time)

1. **Create a Supabase project** at supabase.com.
2. **Google sign-in**
   - In Google Cloud Console → APIs & Services → Credentials, create an OAuth client ID (type: Web application).
   - Add your Supabase callback URL as an authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
   - In Supabase → Authentication → Providers → Google, enable it and paste the client ID and secret.
   - In Supabase → Authentication → URL Configuration, add `http://localhost:5173` to the redirect URLs (add your deployed URL later).
3. **Database**: in the Supabase SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`.
4. **Cornell-only signups**: Authentication → Hooks → add a "Before User Created" hook → Postgres function `public.hook_before_user_created`.
5. **Env vars**: copy `.env.example` to `.env.local` and fill in the project URL and anon key (Project Settings → API).

Then `npm install && npm run dev`.

Demo event times are relative to when `seed.sql` was run; re-run it to refresh them (this replaces only the seeded events).

## How data is stored

- `profiles`: one row per signed-in user, created automatically on first sign-in.
- `events`: all events. Seeded events have no `organizer_id`.
- `event_responses`: one row per (user, event) with status `interested`, `passed`, or `going`.
- `events_with_counts`: view the app reads from; adds `interested_count`.

Access rules (row level security) only let @cornell.edu users read data, and only let each user change their own responses and events.
