-- Only admins can create listings. Everyone else lists in person.

drop policy if exists "Authenticated users can create listings" on public.listings;
drop policy if exists "Admins can create listings" on public.listings;

create policy "Admins can create listings"
  on public.listings for insert
  with check (public.is_admin());

notify pgrst, 'reload schema';
