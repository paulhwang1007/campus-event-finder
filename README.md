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

Demo event times stay fresh on their own: `refresh_demo_events()` (migration 005) moves them relative to now every day at 9 AM Ithaca time, and whenever someone presses Reset demo. Run `seed.sql` once; re-running it is only needed to restore the original demo events (it replaces only the seeded events and their updates). The daily job needs the `pg_cron` extension; the migration enables it, or turn it on under Database → Extensions.

## Event photos

- Events posted in the app upload a photo from the Create form. It is resized to at most 1600px in the browser before upload.
- Seeded demo events have no photos and show their category placeholder.

## Maps

Hosts pick a location in a map picker: search a Cornell spot (from `src/data/places.ts`) or any Ithaca address (Photon, a free OpenStreetMap geocoder), or tap/drag a pin, then name it ("Mann Library, 2nd floor"). The pin is saved in `location_lat`/`location_lng` (migration 006), and Event Details shows a map at that spot with walking directions. Events without a pin fall back to matching a known Cornell place name, then to an "Open in Maps" link. The picker's map library loads only when the picker opens. Known-place coordinates are approximate; correct them in `places.ts`.

Hosts see their own events in the Swipe view, marked "Your event". Swiping either way just moves past them (this replaces PRD FR4.5, which hid them).

## Deploying (Vercel or Netlify)

1. Import the repo, keep the defaults (build command `npm run build`, output directory `dist`).
2. Add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. In Supabase → Authentication → URL Configuration, set the **Site URL** to the deployed URL and add `https://your-app.vercel.app/**` to the redirect URLs (optionally `https://*.vercel.app/**` for preview deployments).

`vercel.json` and `public/_redirects` send every path to `index.html`, so links like `/events/<id>` work on refresh.

## Running usability tests

Profile → **Reset demo** clears the signed-in account's swipes, RSVPs and reports, deletes events it posted, and moves the demo events' times to now, so the next participant starts from the seed state with events "happening now". Use a dedicated test account. (Moving demo times affects everyone using the app, which is fine for a prototype.)

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
