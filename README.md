# campus-event-finder

A swipe-style app for finding casual events around Cornell. Frontend: Vite + React + Zustand. Backend: Supabase (Postgres + Google sign-in, restricted to @cornell.edu).

## Backend setup (one time)

1. **Create a Supabase project** at supabase.com.
2. **Google sign-in**
   - In Google Cloud Console → APIs & Services → Credentials, create an OAuth client ID (type: Web application).
   - Add your Supabase callback URL as an authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
   - In Supabase → Authentication → Providers → Google, enable it and paste the client ID and secret.
   - In Supabase → Authentication → URL Configuration, add `http://localhost:5173/**` to the redirect URLs. Once deployed, also add `https://<your-app>.vercel.app/**` and set the **Site URL** to the deployed URL. Supabase sends people to the Site URL whenever the page they signed in from isn't on the redirect list, which is why a localhost Site URL makes the deployed sign-in land on localhost.
3. **Database**: in the Supabase SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`.
   - Already set up with an older `schema.sql`? Run each file in `supabase/migrations/` you haven't run yet, in order, instead of re-running `schema.sql`. Then re-run `seed.sql`.
   - This also creates the public **event-photos** storage bucket.
4. **Cornell-only signups**: Authentication → Hooks → add a "Before User Created" hook → Postgres function `public.hook_before_user_created`.
5. **Env vars**: copy `.env.example` to `.env.local` and fill in the project URL and anon key (Project Settings → API).

Then `npm install && npm run dev`.

Demo event times are relative to when `seed.sql` was run; re-run it to refresh them (this replaces only the seeded events and their updates).

## Event photos

- Events posted in the app upload a photo from the Create form. It is resized to at most 1600px in the browser before upload.
- Seeded events each look for `seed/<event-name>.jpg` in the `event-photos` bucket. The file names are listed in [`supabase/seed-photos.md`](supabase/seed-photos.md). Until a file is uploaded, the app shows the category placeholder.

## Maps

Event Details shows a small OpenStreetMap preview when the location matches a known Cornell spot in `src/data/places.ts` (e.g. "Mann Library, 2nd floor" matches Mann Library). Other locations get an "Open in Maps" search link. The Create/Edit form suggests the known places. Coordinates are approximate; add or correct places there.

## Deploying (Vercel or Netlify)

1. Import the repo, keep the defaults (build command `npm run build`, output directory `dist`).
2. Add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. In Supabase → Authentication → URL Configuration, set the **Site URL** to the deployed URL and add `https://your-app.vercel.app/**` to the redirect URLs (optionally `https://*.vercel.app/**` for preview deployments).

`vercel.json` and `public/_redirects` send every path to `index.html`, so links like `/events/<id>` work on refresh.

## Running usability tests

Profile → **Reset demo** clears the signed-in account's swipes, RSVPs and reports, and deletes events it posted, so the next participant starts from the seed state. Use a dedicated test account.

## How data is stored

- `profiles`: one row per signed-in user, created automatically on first sign-in. `onboarded_at` is set once they finish profile setup.
- `events`: all events. Seeded events have no `organizer_id`. `photo_path` points into the `event-photos` bucket.
- `event_responses`: one row per (user, event) with status `interested`, `passed`, or `going`.
- `event_updates`: host updates (time, location, or note). Hosts post them through the `post_event_update` function, which also changes the event's time or location in the same transaction.
- Hosts edit events through the `edit_event` function (migration 004). It checks the caller is the host, refuses spots below the number already going, and posts "Time changed…" / "Location changed…" updates in the same transaction.
- `event_reports`: one row per (reporter, event). Reported events are hidden from the reporter only; there's no moderation queue yet.
- `events_with_counts`: view the app reads from; adds `interested_count` (interested + going) and `going_count`.
- A trigger on `event_responses` refuses "going" when the event is full or cancelled, so capacity holds even if two people join at once.

Access rules (row level security) only let @cornell.edu users read data, and only let each user change their own responses and events.
