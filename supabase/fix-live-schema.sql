-- Paste into Supabase SQL Editor and run once:
-- https://supabase.com/dashboard/project/qbjicdrathvdgphzwogk/sql/new
-- Fixes listing create/edit against the older live schema.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.listings
  add column if not exists image_urls text[] not null default '{}';

alter table public.listings
  add column if not exists video_url text;

alter table public.listings
  add column if not exists regular_price numeric(10, 2);

alter table public.listings
  add column if not exists status text not null default 'live';

alter table public.listings
  add column if not exists submitted_by uuid references auth.users(id) on delete set null;

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
drop policy if exists "Admins can create listings" on public.listings;
drop policy if exists "Users can submit pending listings" on public.listings;
create policy "Users can submit pending listings"
  on public.listings for insert
  with check (
    public.is_admin()
    or (
      auth.uid() = user_id
      and coalesce(submitted_by, auth.uid()) = auth.uid()
      and coalesce(status, 'pending') = 'pending'
      and available = false
    )
  );

drop policy if exists "Users and admins can update listings" on public.listings;
create policy "Users and admins can update listings"
  on public.listings for update
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users and admins can delete listings" on public.listings;
create policy "Users and admins can delete listings"
  on public.listings for delete
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Listings are viewable by everyone" on public.listings;
drop policy if exists "Listings are viewable" on public.listings;
create policy "Listings are viewable"
  on public.listings for select
  using (
    public.is_admin()
    or auth.uid() = user_id
    or auth.uid() = submitted_by
    or coalesce(status, 'live') = 'live'
  );

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
insert into public.profiles (id, full_name, school, initials, phone)
select
  u.id,
  nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
  nullif(trim(u.raw_user_meta_data->>'school'), ''),
  nullif(
    upper(left(regexp_replace(trim(u.raw_user_meta_data->>'full_name'), '\s+', '', 'g'), 2)),
    ''
  ),
  nullif(trim(u.raw_user_meta_data->>'phone'), '')
from auth.users u
on conflict (id) do update set
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  school = coalesce(public.profiles.school, excluded.school),
  initials = coalesce(public.profiles.initials, excluded.initials),
  phone = coalesce(public.profiles.phone, excluded.phone);

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

-- Avatar storage + messaging
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_one uuid not null references auth.users(id) on delete cascade,
  participant_two uuid not null references auth.users(id) on delete cascade,
  listing_request_id uuid references public.listing_requests(id) on delete set null,
  created_at timestamptz default now(),
  constraint conversations_distinct_participants check (participant_one <> participant_two),
  constraint conversations_ordered_pair check (participant_one < participant_two),
  unique (participant_one, participant_two)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_conversation_participant(conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv_id
      and (c.participant_one = auth.uid() or c.participant_two = auth.uid())
  );
$$;

create or replace function public.get_primary_admin_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = 'oscarshao28@gmail.com' limit 1;
$$;

create or replace function public.get_admin_id_for_school(school text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id
  from auth.users
  where lower(email) = case
    when lower(coalesce(school, '')) like '%herricks%' then 'sonichenry214@gmail.com'
    else 'oscarshao28@gmail.com'
  end
  limit 1;
$$;

drop policy if exists "Participants and admins can view conversations" on public.conversations;
create policy "Participants and admins can view conversations"
  on public.conversations for select
  using (
    participant_one = auth.uid()
    or participant_two = auth.uid()
    or public.is_admin()
  );

drop policy if exists "Authenticated users can create conversations" on public.conversations;
create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (
    auth.uid() = participant_one
    or auth.uid() = participant_two
    or public.is_admin()
  );

drop policy if exists "Participants can delete conversations" on public.conversations;
create policy "Participants can delete conversations"
  on public.conversations for delete
  using (
    participant_one = auth.uid()
    or participant_two = auth.uid()
    or public.is_admin()
  );

-- Live message updates in the chat UI
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

drop policy if exists "Participants and admins can view messages" on public.messages;
create policy "Participants and admins can view messages"
  on public.messages for select
  using (
    public.is_conversation_participant(conversation_id)
    or public.is_admin()
  );

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and (
      public.is_conversation_participant(conversation_id)
      or public.is_admin()
    )
  );

grant select, insert, update, delete on public.conversations to anon, authenticated;
grant select, insert, update, delete on public.messages to anon, authenticated;
grant execute on function public.get_primary_admin_id() to anon, authenticated;
grant execute on function public.get_admin_id_for_school(text) to anon, authenticated;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

notify pgrst, 'reload schema';
