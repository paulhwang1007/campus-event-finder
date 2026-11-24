-- Flow improvements: onboarding flag, going count, capacity limit.
-- Run once in the Supabase SQL editor on a database set up with the original schema.sql.
-- (schema.sql already includes these changes for fresh setups.)

-- Onboarding: null until the user finishes profile setup.
alter table public.profiles add column if not exists onboarded_at timestamptz;

-- Add going_count to the view the app reads from.
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
