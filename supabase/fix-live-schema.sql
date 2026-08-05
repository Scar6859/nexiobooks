-- Paste into Supabase SQL Editor and run once:
-- https://supabase.com/dashboard/project/qbjicdrathvdgphzwogk/sql/new
-- Fixes listing create/edit against the older live schema.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.listings
  add column if not exists image_urls text[] not null default '{}';

alter table public.listings
  add column if not exists video_url text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listings'
      and column_name = 'image_url'
  ) then
    begin
      alter table public.listings alter column image_url drop not null;
    exception when others then
      null;
    end;

    update public.listings
    set image_urls = array[image_url]
    where image_url is not null
      and image_url <> ''
      and image_urls = '{}';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listings'
      and column_name = 'book_type'
  ) then
    begin
      alter table public.listings alter column book_type drop not null;
    exception when others then
      null;
    end;
  end if;
end $$;

create table if not exists public.listing_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade not null,
  buyer_id uuid references auth.users(id) on delete cascade not null,
  message text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'completed')),
  created_at timestamptz default now(),
  unique (listing_id, buyer_id)
);

alter table public.listing_requests enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

drop policy if exists "Authenticated users can create listings" on public.listings;
create policy "Authenticated users can create listings"
  on public.listings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users and admins can update listings" on public.listings;
create policy "Users and admins can update listings"
  on public.listings for update
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users and admins can delete listings" on public.listings;
create policy "Users and admins can delete listings"
  on public.listings for delete
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Listings are viewable by everyone" on public.listings;
create policy "Listings are viewable by everyone"
  on public.listings for select
  using (true);

drop policy if exists "Buyers can create requests" on public.listing_requests;
create policy "Buyers can create requests"
  on public.listing_requests for insert
  with check (auth.uid() = buyer_id);

drop policy if exists "Buyers and sellers can view requests" on public.listing_requests;
create policy "Buyers and sellers can view requests"
  on public.listing_requests for select
  using (
    auth.uid() = buyer_id
    or auth.uid() = (select l.user_id from public.listings l where l.id = listing_id)
    or public.is_admin()
  );

drop policy if exists "Sellers and admins can update requests" on public.listing_requests;
create policy "Sellers and admins can update requests"
  on public.listing_requests for update
  using (
    auth.uid() = (select l.user_id from public.listings l where l.id = listing_id)
    or public.is_admin()
  );

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
grant select, insert, update, delete on public.listings to anon, authenticated;
grant select, insert, update, delete on public.listing_requests to anon, authenticated;

-- Backfill profiles from auth metadata (signup often couldn't write profiles
-- before email confirmation because RLS requires a session).
insert into public.profiles (id, full_name, school, initials)
select
  u.id,
  nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
  nullif(trim(u.raw_user_meta_data->>'school'), ''),
  nullif(
    upper(left(regexp_replace(trim(u.raw_user_meta_data->>'full_name'), '\s+', '', 'g'), 2)),
    ''
  )
from auth.users u
on conflict (id) do update set
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  school = coalesce(public.profiles.school, excluded.school),
  initials = coalesce(public.profiles.initials, excluded.initials);

-- Designate platform admins (can remove/edit any listing)
update public.profiles set is_admin = true
where id in (
  select id from auth.users
  where email in ('oscarshao28@gmail.com', 'sonichenry214@gmail.com')
);

insert into public.profiles (id, full_name, is_admin)
select id, coalesce(raw_user_meta_data->>'full_name', 'Admin'), true
from auth.users
where email in ('oscarshao28@gmail.com', 'sonichenry214@gmail.com')
on conflict (id) do update set is_admin = true;

notify pgrst, 'reload schema';
