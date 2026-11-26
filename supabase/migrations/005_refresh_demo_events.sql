-- Keep demo event times fresh without re-running seed.sql.
-- Run once in the Supabase SQL editor after 004_edit_event.sql.
-- (schema.sql already includes this for fresh setups.)

-- Each seeded event remembers its offset from "seed time", e.g. +30 hours or -30 minutes
-- ("happening now"). Null for events posted in the app, which are never moved.
alter table public.events add column if not exists seed_start_offset interval;
alter table public.events add column if not exists seed_end_offset interval;

-- Existing seeded rows were all created at seed time, so their offsets can be recovered exactly.
update public.events
set seed_start_offset = start_at - created_at,
    seed_end_offset = end_at - created_at
where organizer_id is null and seed_start_offset is null;

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

-- Moves every seeded event to now() + its offset. Events keep their ids, so saves, RSVPs and
-- host updates on them survive. Seeded host updates move by the same amount, so
-- "posted 3 hours ago" stays true. Runs with elevated rights because seeded events have no host.
create or replace function public.refresh_demo_events()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Shift updates first, while start_at still holds the previous anchor time.
  update public.event_updates u
  set created_at = u.created_at + (now() - (e.start_at - e.seed_start_offset))
  from public.events e
  where u.event_id = e.id
    and e.organizer_id is null
    and e.seed_start_offset is not null;

  update public.events
  set start_at = now() + seed_start_offset,
      end_at = now() + seed_end_offset
  where organizer_id is null
    and seed_start_offset is not null
    and seed_end_offset is not null;
end;
$$;

-- Signed-in users (Reset demo) and the scheduled job (runs as the owner) may call it.
revoke execute on function public.refresh_demo_events() from anon, public;
grant execute on function public.refresh_demo_events() to authenticated;

-- Daily refresh at 13:00 UTC (9 AM Ithaca time in winter, 8 AM in summer), as a safety net.
-- If pg_cron can't be enabled from SQL on this project, enable it under
-- Database → Extensions → pg_cron, then run this file again.
do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule('refresh-demo-events', '0 13 * * *', 'select public.refresh_demo_events()');
  raise notice 'Scheduled daily demo refresh (job "refresh-demo-events").';
exception when others then
  raise notice 'Could not schedule the daily refresh (%). Enable pg_cron under Database → Extensions and run this file again. Reset demo still refreshes times.', sqlerrm;
end;
$$;
