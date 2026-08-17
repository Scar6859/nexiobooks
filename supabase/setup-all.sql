-- Run this entire file once in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qbjicdrathvdgphzwogk/sql/new
--
-- Required for multi-image + video listings (adds image_urls / video_url).

-- === Contact requests (Request button) ===
create table if not exists public.listing_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade not null,
  buyer_id uuid references auth.users(id) on delete cascade not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'completed')),
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

grant select, insert, update, delete on public.listing_requests to anon, authenticated;

-- === Profile / listing columns ===
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.listings add column if not exists image_urls text[] not null default '{}';
alter table public.listings add column if not exists video_url text;
alter table public.listings add column if not exists regular_price numeric(10, 2);
alter table public.listings add column if not exists status text not null default 'live';
alter table public.listings add column if not exists submitted_by uuid references auth.users(id) on delete set null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'image_url'
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
end $$;

-- === Remove per-user listing limit ===
drop trigger if exists enforce_listing_limit on public.listings;
drop function if exists public.enforce_listing_limit();

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

-- Refresh API schema cache
notify pgrst, 'reload schema';
