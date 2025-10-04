create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'ななし',
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_display_name on public.user_profiles(lower(display_name));

create or replace function public.set_user_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row
  execute function public.set_user_profiles_updated_at();

alter table public.user_profiles enable row level security;

create policy "Users can view their profile" on public.user_profiles
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their profile" on public.user_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their profile" on public.user_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
