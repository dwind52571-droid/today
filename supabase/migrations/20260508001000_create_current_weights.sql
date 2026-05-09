create table if not exists public.current_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(5, 1) not null check (weight_kg >= 20 and weight_kg <= 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint current_weights_user_unique unique (user_id)
);

alter table public.current_weights enable row level security;

create policy "Users can read their current weight"
  on public.current_weights
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their current weight"
  on public.current_weights
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their current weight"
  on public.current_weights
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_current_weights_updated_at on public.current_weights;

create trigger set_current_weights_updated_at
  before update on public.current_weights
  for each row
  execute function public.set_updated_at();
