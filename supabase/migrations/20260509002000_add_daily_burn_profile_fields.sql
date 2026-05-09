alter table public.profiles
  add column if not exists gender text,
  add column if not exists date_of_birth date,
  add column if not exists height_cm integer,
  add column if not exists activity_level text;

alter table public.profiles
  drop constraint if exists profiles_gender_check;

alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or gender in ('male', 'female'));

alter table public.profiles
  drop constraint if exists profiles_activity_level_check;

alter table public.profiles
  add constraint profiles_activity_level_check
  check (
    activity_level is null
    or activity_level in ('sedentary', 'light', 'moderate', 'active')
  );
