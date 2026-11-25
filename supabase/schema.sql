-- Campus Event Finder schema. Run once in the Supabase SQL editor, then run seed.sql.
-- After running, enable the signup hook: Authentication → Hooks → "Before User Created"
-- → Postgres function → public.hook_before_user_created.

-- ───────────────────────── Helpers ─────────────────────────

-- True when the caller is signed in with a @cornell.edu account.
create or replace function public.is_cornell()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') ilike '%@cornell.edu';
$$;

-- ───────────────────────── Profiles ─────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  net_id      text not null unique,
  name        text not null,
  class_year  text check (class_year in ('First-year', 'Sophomore', 'Junior', 'Senior', 'Transfer')),
  major       text,
  bio         text,
  interests   text[] not null default '{}',
  onboarded_at timestamptz, -- null until the user finishes profile setup
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Cornell users can read profiles"
  on public.profiles for select to authenticated
  using (public.is_cornell());

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_cornell())
  with check (id = auth.uid());

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, net_id, name)
  values (
    new.id,
    lower(split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Signup restriction ─────────────────────────

-- "Before User Created" auth hook: reject any non-Cornell email before the account exists.
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
as $$
begin
  if coalesce(event -> 'user' ->> 'email', '') ilike '%@cornell.edu' then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Please sign in with your @cornell.edu account.'
    )
  );
end;
$$;

grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;

-- ───────────────────────── Events ─────────────────────────

create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (char_length(title) between 1 and 120),
  description       text not null default '',
  category          text not null check (category in ('sports', 'arts', 'food', 'outdoors', 'games', 'study', 'services')),
  organizer_type    text not null check (organizer_type in ('student', 'club')),
  organizer_name    text not null,
  -- null for seeded demo events whose organizers aren't real accounts
  organizer_id      uuid references public.profiles (id) on delete cascade,
  organizer_net_id  text not null,
  start_at          timestamptz not null,
  end_at            timestamptz not null,
  location_name     text not null,
  location_note     text,
  capacity          int check (capacity is null or capacity > 0),
  accessibility     text,
  participation     text,
  cancelled         boolean not null default false,
  created_at        timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists events_start_at_idx on public.events (start_at);

alter table public.events enable row level security;

create policy "Cornell users can read events"
  on public.events for select to authenticated
  using (public.is_cornell());

create policy "Cornell users can create their own events"
  on public.events for insert to authenticated
  with check (organizer_id = auth.uid() and public.is_cornell());

create policy "Organizers can update their own events"
  on public.events for update to authenticated
  using (organizer_id = auth.uid() and public.is_cornell())
  with check (organizer_id = auth.uid());

-- Fill organizer_net_id from the organizer's profile so clients can't spoof it.
create or replace function public.set_event_organizer_net_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organizer_id is not null then
    select p.net_id into new.organizer_net_id from public.profiles p where p.id = new.organizer_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_event_organizer_net_id on public.events;
create trigger set_event_organizer_net_id
  before insert or update of organizer_id on public.events
  for each row execute function public.set_event_organizer_net_id();

-- ───────────────────────── Responses (interested / passed / going) ─────────────────────────

create table if not exists public.event_responses (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  event_id    uuid not null references public.events (id) on delete cascade,
  status      text not null check (status in ('interested', 'passed', 'going')),
  created_at  timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists event_responses_event_idx on public.event_responses (event_id);

alter table public.event_responses enable row level security;

create policy "Users can read their own responses"
  on public.event_responses for select to authenticated
  using (user_id = auth.uid() and public.is_cornell());

create policy "Users can add their own responses"
  on public.event_responses for insert to authenticated
  with check (user_id = auth.uid() and public.is_cornell());

create policy "Users can change their own responses"
  on public.event_responses for update to authenticated
  using (user_id = auth.uid() and public.is_cornell())
  with check (user_id = auth.uid());

create policy "Users can remove their own responses"
  on public.event_responses for delete to authenticated
  using (user_id = auth.uid() and public.is_cornell());

-- ───────────────────────── Events + counts ─────────────────────────

-- Runs with the view owner's rights so it can count everyone's responses
-- (each user can only see their own rows directly). The is_cornell() filter
-- keeps the same access rule as the events table.
create or replace view public.events_with_counts as
  select
    e.*,
    (
      select count(*)::int
      from public.event_responses r
      where r.event_id = e.id and r.status in ('interested', 'going')
    ) as interested_count,
    (
      select count(*)::int
      from public.event_responses r
      where r.event_id = e.id and r.status = 'going'
    ) as going_count
  from public.events e
  where public.is_cornell();

revoke all on public.events_with_counts from anon, public;
grant select on public.events_with_counts to authenticated;

-- ───────────────────────── Capacity limit ─────────────────────────

-- Refuse to mark someone as going when the event is full or cancelled.
create or replace function public.enforce_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_capacity int;
  event_cancelled boolean;
  current_going int;
begin
  if new.status <> 'going' or (tg_op = 'UPDATE' and old.status = 'going') then
    return new;
  end if;

  -- Lock the event row so two people can't take the last spot at the same time.
  select capacity, cancelled into event_capacity, event_cancelled
  from public.events where id = new.event_id
  for update;

  if event_cancelled then
    raise exception 'This event was cancelled.' using errcode = 'P0001';
  end if;

  if event_capacity is not null then
    select count(*) into current_going
    from public.event_responses
    where event_id = new.event_id and status = 'going' and user_id <> new.user_id;

    if current_going >= event_capacity then
      raise exception 'This event is full.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_event_capacity on public.event_responses;
create trigger enforce_event_capacity
  before insert or update of status on public.event_responses
  for each row execute function public.enforce_event_capacity();

-- ═════════════ Host updates, reports, event photos, demo reset (same as migrations/003) ═════════════
-- ───────────────────────── Event photos ─────────────────────────

-- Path inside the "event-photos" storage bucket, e.g. "<user id>/<uuid>.jpg" or "seed/pickup-basketball-run.jpg".
alter table public.events add column if not exists photo_path text;

-- The view selects e.*, so rebuild it to pick up the new column. It has to be dropped first:
-- "create or replace view" can't insert a column before the existing count columns.
drop view if exists public.events_with_counts;
create view public.events_with_counts as
  select
    e.*,
    (
      select count(*)::int
      from public.event_responses r
      where r.event_id = e.id and r.status in ('interested', 'going')
    ) as interested_count,
    (
      select count(*)::int
      from public.event_responses r
      where r.event_id = e.id and r.status = 'going'
    ) as going_count
  from public.events e
  where public.is_cornell();

revoke all on public.events_with_counts from anon, public;
grant select on public.events_with_counts to authenticated;

-- Public bucket: anyone with the link can view a photo; only signed-in Cornell users can upload,
-- and only into a folder named after their own user id.
insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

drop policy if exists "Cornell users can upload their own event photos" on storage.objects;
create policy "Cornell users can upload their own event photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_cornell()
  );

drop policy if exists "Users can delete their own event photos" on storage.objects;
create policy "Users can delete their own event photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'event-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────────────────── Host updates ─────────────────────────

create table if not exists public.event_updates (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  type        text not null check (type in ('time', 'location', 'note')),
  message     text not null check (char_length(message) between 1 and 280),
  created_at  timestamptz not null default now()
);

create index if not exists event_updates_event_idx on public.event_updates (event_id, created_at);

alter table public.event_updates enable row level security;

drop policy if exists "Cornell users can read updates" on public.event_updates;
create policy "Cornell users can read updates"
  on public.event_updates for select to authenticated
  using (public.is_cornell());

drop policy if exists "Organizers can post updates to their events" on public.event_updates;
create policy "Organizers can post updates to their events"
  on public.event_updates for insert to authenticated
  with check (
    public.is_cornell()
    and exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid())
  );

-- Post an update and, for time or location changes, change the event in the same transaction.
-- Runs with the caller's rights, so row level security still limits it to the event's organizer.
create or replace function public.post_event_update(
  p_event_id uuid,
  p_type text,
  p_message text,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_location_name text default null
)
returns public.event_updates
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.event_updates;
begin
  if p_type = 'time' then
    if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
      raise exception 'End time must be after start time.' using errcode = 'P0001';
    end if;
    update public.events set start_at = p_start_at, end_at = p_end_at where id = p_event_id;
  elsif p_type = 'location' then
    if coalesce(trim(p_location_name), '') = '' then
      raise exception 'Enter the new location.' using errcode = 'P0001';
    end if;
    update public.events set location_name = trim(p_location_name) where id = p_event_id;
  end if;

  insert into public.event_updates (event_id, type, message)
  values (p_event_id, p_type, trim(p_message))
  returning * into result;
  return result;
end;
$$;

grant execute on function public.post_event_update(uuid, text, text, timestamptz, timestamptz, text) to authenticated;

-- ───────────────────────── Reports ─────────────────────────

create table if not exists public.event_reports (
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  event_id    uuid not null references public.events (id) on delete cascade,
  reason      text not null check (reason in ('inappropriate', 'misleading', 'unsafe', 'not_cornell', 'other')),
  note        text check (note is null or char_length(note) <= 500),
  created_at  timestamptz not null default now(),
  primary key (reporter_id, event_id)
);

alter table public.event_reports enable row level security;

drop policy if exists "Users can read their own reports" on public.event_reports;
create policy "Users can read their own reports"
  on public.event_reports for select to authenticated
  using (reporter_id = auth.uid() and public.is_cornell());

drop policy if exists "Users can file reports" on public.event_reports;
create policy "Users can file reports"
  on public.event_reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_cornell());

drop policy if exists "Users can withdraw their own reports" on public.event_reports;
create policy "Users can withdraw their own reports"
  on public.event_reports for delete to authenticated
  using (reporter_id = auth.uid() and public.is_cornell());

-- ───────────────────────── Demo reset ─────────────────────────

-- Lets "Reset demo" remove events the tester posted, so the next participant starts clean.
drop policy if exists "Organizers can delete their own events" on public.events;
create policy "Organizers can delete their own events"
  on public.events for delete to authenticated
  using (organizer_id = auth.uid() and public.is_cornell());

-- ═════════════ Edit event (same as migrations/004) ═════════════
-- Saves every field of an event and, in the same transaction, posts the given updates
-- (the app sends "Time changed from … to …" / "Location changed …" when those changed,
-- so everyone who saved the event sees the new-update dot).
--
-- Runs with elevated rights because it must count everyone's RSVPs to check the new
-- capacity (each user can only see their own responses). It therefore checks the
-- caller is a Cornell user and the event's organizer itself before changing anything.
create or replace function public.edit_event(
  p_event_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_organizer_type text,
  p_organizer_name text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_location_name text,
  p_capacity int,
  p_photo_path text,
  p_updates jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_organizer uuid;
  event_cancelled boolean;
  current_going int;
begin
  if not public.is_cornell() then
    raise exception 'Please sign in with your Cornell account.' using errcode = 'P0001';
  end if;

  -- Lock the event so nobody can join between the capacity check and the save.
  select organizer_id, cancelled into event_organizer, event_cancelled
  from public.events where id = p_event_id
  for update;

  if event_organizer is null or event_organizer <> auth.uid() then
    raise exception 'Only the host can edit this event.' using errcode = 'P0001';
  end if;
  if event_cancelled then
    raise exception 'This event was cancelled and can''t be edited.' using errcode = 'P0001';
  end if;
  if p_end_at <= p_start_at then
    raise exception 'End time must be after start time.' using errcode = 'P0001';
  end if;

  if p_capacity is not null then
    select count(*) into current_going
    from public.event_responses
    where event_id = p_event_id and status = 'going';

    if p_capacity < current_going then
      raise exception '% people are going, so spots can''t be lower than %.', current_going, current_going
        using errcode = 'P0001';
    end if;
  end if;

  update public.events set
    title = trim(p_title),
    description = trim(p_description),
    category = p_category,
    organizer_type = p_organizer_type,
    organizer_name = trim(p_organizer_name),
    start_at = p_start_at,
    end_at = p_end_at,
    location_name = trim(p_location_name),
    capacity = p_capacity,
    photo_path = p_photo_path
  where id = p_event_id;

  insert into public.event_updates (event_id, type, message)
  select p_event_id, u ->> 'type', trim(u ->> 'message')
  from jsonb_array_elements(coalesce(p_updates, '[]'::jsonb)) as u;
end;
$$;

revoke execute on function public.edit_event(uuid, text, text, text, text, text, timestamptz, timestamptz, text, int, text, jsonb) from anon, public;
grant execute on function public.edit_event(uuid, text, text, text, text, text, timestamptz, timestamptz, text, int, text, jsonb) to authenticated;
