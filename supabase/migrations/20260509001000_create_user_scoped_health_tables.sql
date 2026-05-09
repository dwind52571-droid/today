create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight numeric(5, 1) not null check (weight >= 20 and weight <= 400),
  created_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity text,
  unit text,
  calories integer not null check (calories >= 0),
  created_at timestamptz not null default now()
);

alter table public.meals
  add column if not exists quantity text,
  add column if not exists unit text;

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity text not null,
  duration integer not null check (duration > 0),
  calories_burned integer not null check (calories_burned >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  goal_weight numeric(5, 1),
  language text not null default 'en' check (language in ('en', 'zh')),
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_unique unique (user_id)
);

create index if not exists weights_user_created_at_idx
  on public.weights (user_id, created_at desc);

create index if not exists meals_user_created_at_idx
  on public.meals (user_id, created_at desc);

create index if not exists workouts_user_created_at_idx
  on public.workouts (user_id, created_at desc);

alter table public.weights enable row level security;
alter table public.meals enable row level security;
alter table public.workouts enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users can select their weights" on public.weights;
drop policy if exists "Users can insert their weights" on public.weights;
drop policy if exists "Users can update their weights" on public.weights;
drop policy if exists "Users can delete their weights" on public.weights;
drop policy if exists "Users can select their meals" on public.meals;
drop policy if exists "Users can insert their meals" on public.meals;
drop policy if exists "Users can update their meals" on public.meals;
drop policy if exists "Users can delete their meals" on public.meals;
drop policy if exists "Users can select their workouts" on public.workouts;
drop policy if exists "Users can insert their workouts" on public.workouts;
drop policy if exists "Users can update their workouts" on public.workouts;
drop policy if exists "Users can delete their workouts" on public.workouts;
drop policy if exists "Users can select their profile" on public.profiles;
drop policy if exists "Users can insert their profile" on public.profiles;
drop policy if exists "Users can update their profile" on public.profiles;
drop policy if exists "Users can delete their profile" on public.profiles;

create policy "Users can select their weights"
  on public.weights for select
  using (auth.uid() = user_id);

create policy "Users can insert their weights"
  on public.weights for insert
  with check (auth.uid() = user_id);

create policy "Users can update their weights"
  on public.weights for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their weights"
  on public.weights for delete
  using (auth.uid() = user_id);

create policy "Users can select their meals"
  on public.meals for select
  using (auth.uid() = user_id);

create policy "Users can insert their meals"
  on public.meals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their meals"
  on public.meals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their meals"
  on public.meals for delete
  using (auth.uid() = user_id);

create policy "Users can select their workouts"
  on public.workouts for select
  using (auth.uid() = user_id);

create policy "Users can insert their workouts"
  on public.workouts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their workouts"
  on public.workouts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their workouts"
  on public.workouts for delete
  using (auth.uid() = user_id);

create policy "Users can select their profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their profile"
  on public.profiles for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop table if exists public.current_weights;
