-- Pending student listing submissions + school-based admin routing.

alter table public.listings
  add column if not exists status text not null default 'live';

alter table public.listings
  add column if not exists submitted_by uuid references auth.users(id) on delete set null;

update public.listings
set status = 'live'
where status is null or status = '';

alter table public.listings
  drop constraint if exists listings_status_check;

alter table public.listings
  add constraint listings_status_check
  check (status in ('pending', 'live', 'declined'));

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

grant execute on function public.get_admin_id_for_school(text) to anon, authenticated;

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

notify pgrst, 'reload schema';
