-- Profile photos. Run once in the Supabase SQL editor after 007_profile_grad_year_bio.sql.
-- (schema.sql already includes this for fresh setups.)
-- Photos go in the existing "event-photos" bucket under the user's own folder
-- ("<user id>/avatar-<uuid>.jpg"), which migration 003's storage rules already allow.
alter table public.profiles add column if not exists avatar_path text;
