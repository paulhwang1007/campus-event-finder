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
