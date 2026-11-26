-- Map pins: events can store the exact spot picked on a map or found by address search.
-- Run once in the Supabase SQL editor after 005_refresh_demo_events.sql.
-- (schema.sql already includes this for fresh setups.)

-- location_name stays the text people read ("Mann Library, 2nd floor"); these are where the pin goes.
alter table public.events add column if not exists location_lat double precision;
alter table public.events add column if not exists location_lng double precision;

alter table public.events drop constraint if exists events_location_coords_check;
alter table public.events add constraint events_location_coords_check check (
  (location_lat is null and location_lng is null)
  or (location_lat between -90 and 90 and location_lng between -180 and 180)
);

-- Give the seeded demo events pins at their Cornell spots (same list as src/data/places.ts).
update public.events e
set location_lat = p.lat, location_lng = p.lng
from (values
  ('Mann Library', 42.4487, -76.4763),
  ('Duffield Atrium', 42.4446, -76.4826),
  ('Noyes', 42.4462, -76.488),
  ('Willard Straight', 42.4465, -76.4856),
  ('Appel Commons', 42.4536, -76.4775),
  ('Arts Quad', 42.449, -76.484),
  ('Beebe Lake', 42.451, -76.477),
  ('Libe Slope', 42.4475, -76.486),
  ('Helen Newman', 42.4529, -76.4777),
  ('Teagle', 42.446, -76.479),
  ('Collegetown', 42.441, -76.485),
  ('Fall Creek Gorge Trail', 42.4525, -76.4825),
  ('Statler Hall', 42.4459, -76.4818),
  ('Schoellkopf Field', 42.4442, -76.4775),
  ('Olin Library', 42.4478, -76.4844),
  ('Klarman Hall', 42.4493, -76.4831),
  ('Uris Hall', 42.4471, -76.4819),
  ('Gates Hall', 42.445, -76.481)
) as p(name, lat, lng)
where e.organizer_id is null and e.location_name = p.name and e.location_lat is null;

-- The view selects e.*, so rebuild it to include the new columns (see 003 for why it's dropped first).
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

-- "Post update → Location" now also moves the pin. The parameter list changes, so drop the old version.
drop function if exists public.post_event_update(uuid, text, text, timestamptz, timestamptz, text);
create or replace function public.post_event_update(
  p_event_id uuid,
  p_type text,
  p_message text,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_location_name text default null,
  p_location_lat double precision default null,
  p_location_lng double precision default null
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
    update public.events
    set location_name = trim(p_location_name), location_lat = p_location_lat, location_lng = p_location_lng
    where id = p_event_id;
  end if;

  insert into public.event_updates (event_id, type, message)
  values (p_event_id, p_type, trim(p_message))
  returning * into result;
  return result;
end;
$$;

grant execute on function public.post_event_update(uuid, text, text, timestamptz, timestamptz, text, double precision, double precision) to authenticated;

-- Editing an event can set or move the pin too. Same reason for dropping the old version.
drop function if exists public.edit_event(uuid, text, text, text, text, text, timestamptz, timestamptz, text, int, text, jsonb);
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
  p_updates jsonb default '[]'::jsonb,
  p_location_lat double precision default null,
  p_location_lng double precision default null
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
    location_lat = p_location_lat,
    location_lng = p_location_lng,
    capacity = p_capacity,
    photo_path = p_photo_path
  where id = p_event_id;

  insert into public.event_updates (event_id, type, message)
  select p_event_id, u ->> 'type', trim(u ->> 'message')
  from jsonb_array_elements(coalesce(p_updates, '[]'::jsonb)) as u;
end;
$$;

revoke execute on function public.edit_event(uuid, text, text, text, text, text, timestamptz, timestamptz, text, int, text, jsonb, double precision, double precision) from anon, public;
grant execute on function public.edit_event(uuid, text, text, text, text, text, timestamptz, timestamptz, text, int, text, jsonb, double precision, double precision) to authenticated;
