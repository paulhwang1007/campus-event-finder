-- Profiles: graduation year instead of class year, and a length limit on bio.
-- Run once in the Supabase SQL editor after 006_event_coordinates.sql.
-- (schema.sql already includes this for fresh setups.)

alter table public.profiles add column if not exists grad_year int;

alter table public.profiles drop constraint if exists profiles_grad_year_check;
alter table public.profiles add constraint profiles_grad_year_check
  check (grad_year is null or grad_year between 1900 and 2100);

-- Convert existing class-year answers. The academic year starts in August, so in Nov 2026
-- seniors graduate in 2027. Transfer students can't be converted; they're asked next time
-- they edit their profile. class_year itself is kept (unused) so nothing is lost.
with academic as (
  select extract(year from now() at time zone 'America/New_York')::int
    + case when extract(month from now() at time zone 'America/New_York') >= 8 then 1 else 0 end
    as senior_year
)
update public.profiles p
set grad_year = a.senior_year + case p.class_year
  when 'Senior' then 0
  when 'Junior' then 1
  when 'Sophomore' then 2
  when 'First-year' then 3
end
from academic a
where p.grad_year is null and p.class_year in ('Senior', 'Junior', 'Sophomore', 'First-year');

-- Bio is optional and short. "not valid" skips re-checking existing rows.
alter table public.profiles drop constraint if exists profiles_bio_length_check;
alter table public.profiles add constraint profiles_bio_length_check
  check (bio is null or char_length(bio) <= 160) not valid;
