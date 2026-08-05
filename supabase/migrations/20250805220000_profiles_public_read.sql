-- Allow browsing sellers' names on listings, and backfill from auth metadata.

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

grant select, insert, update, delete on public.profiles to anon, authenticated;

insert into public.profiles (id, full_name, school, initials)
select
  u.id,
  nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
  nullif(trim(u.raw_user_meta_data->>'school'), ''),
  nullif(
    upper(
      left(split_part(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), ' ', 1), 1) ||
      left(split_part(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), ' ', 2), 1)
    ),
    ''
  )
from auth.users u
on conflict (id) do update set
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  school = coalesce(public.profiles.school, excluded.school),
  initials = coalesce(public.profiles.initials, excluded.initials);
