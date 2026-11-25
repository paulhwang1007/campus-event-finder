-- Host updates, reports, event photos, and demo reset.
-- Run once in the Supabase SQL editor on a database set up before this file existed.
-- (schema.sql already includes these changes for fresh setups.) Then re-run seed.sql.

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
