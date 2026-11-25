-- Edit event: lets a host change their event's details in one transaction.
-- Run once in the Supabase SQL editor after 003_updates_reports_photos.sql.
-- (schema.sql already includes this for fresh setups.)

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
