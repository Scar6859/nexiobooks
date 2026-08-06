-- Run this in your Supabase SQL Editor

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  school text,
  initials text,
  phone text,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  topic text not null,
  condition text not null,
  listing_type text not null check (listing_type in ('sell', 'donate')),
  price numeric(10,2),
  location text not null,
  note text,
  image_urls text[] not null default '{}',
  video_url text,
  seller_initials text,
  created_at timestamptz default now(),
  constraint listings_image_urls_max check (coalesce(array_length(image_urls, 1), 0) <= 4)
);

create table if not exists public.listing_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade not null,
  buyer_id uuid references auth.users(id) on delete cascade not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'completed')),
  created_at timestamptz default now(),
  unique (listing_id, buyer_id)
);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
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

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Listings are viewable by everyone"
  on public.listings for select using (true);

create policy "Authenticated users can create listings"
  on public.listings for insert
  with check (
    auth.uid() = user_id
    and (select count(*) from public.listings l where l.user_id = auth.uid()) < 10
  );

create or replace function public.enforce_listing_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  listing_count integer;
begin
  select count(*) into listing_count
  from public.listings
  where user_id = new.user_id;

  if listing_count >= 10 then
    raise exception 'Listing limit reached. You can have at most 10 listings.';
  end if;

  return new;
end;
$$;

create trigger enforce_listing_limit
  before insert on public.listings
  for each row execute function public.enforce_listing_limit();

create policy "Users and admins can update listings"
  on public.listings for update
  using (auth.uid() = user_id or public.is_admin());

create policy "Users and admins can delete listings"
  on public.listings for delete
  using (auth.uid() = user_id or public.is_admin());

create policy "Buyers can create requests"
  on public.listing_requests for insert
  with check (auth.uid() = buyer_id);

create policy "Buyers and sellers can view requests"
  on public.listing_requests for select
  using (
    auth.uid() = buyer_id
    or auth.uid() = (select l.user_id from public.listings l where l.id = listing_id)
    or public.is_admin()
  );

create policy "Sellers and admins can update requests"
  on public.listing_requests for update
  using (
    auth.uid() = (select l.user_id from public.listings l where l.id = listing_id)
    or public.is_admin()
  );

grant select, insert, update, delete on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.listings to anon, authenticated;
grant select, insert, update, delete on public.listing_requests to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('book-images', 'book-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Anyone can view book images"
  on storage.objects for select using (bucket_id = 'book-images');

create policy "Authenticated users can upload book images"
  on storage.objects for insert
  with check (bucket_id = 'book-images' and auth.role() = 'authenticated');

create policy "Users can update own book images"
  on storage.objects for update
  using (bucket_id = 'book-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own book images"
  on storage.objects for delete
  using (bucket_id = 'book-images' and auth.uid()::text = (storage.foldername(name))[1]);

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

create policy "Participants and admins can view conversations"
  on public.conversations for select
  using (
    participant_one = auth.uid()
    or participant_two = auth.uid()
    or public.is_admin()
  );

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (
    auth.uid() = participant_one
    or auth.uid() = participant_two
    or public.is_admin()
  );

create policy "Participants and admins can view messages"
  on public.messages for select
  using (
    public.is_conversation_participant(conversation_id)
    or public.is_admin()
  );

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

-- Grant admin to designated emails (run after user signs up)
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
