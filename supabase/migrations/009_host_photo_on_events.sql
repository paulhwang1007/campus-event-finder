-- Show the host's profile photo on their events.
-- Run once in the Supabase SQL editor after 008_profile_photo.sql.
-- (schema.sql already includes this for fresh setups.)

-- Same view as before, plus the host's photo path. Profiles are already readable by every
-- Cornell user, so this exposes nothing new. Dropped first because a column is added.
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
    ) as going_count,
    (select p.avatar_path from public.profiles p where p.id = e.organizer_id) as organizer_avatar_path
  from public.events e
  where public.is_cornell();

revoke all on public.events_with_counts from anon, public;
grant select on public.events_with_counts to authenticated;
