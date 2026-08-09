-- Remove the per-user listing limit (trigger + RLS count check).

drop trigger if exists enforce_listing_limit on public.listings;
drop function if exists public.enforce_listing_limit();

drop policy if exists "Authenticated users can create listings" on public.listings;
create policy "Authenticated users can create listings"
  on public.listings for insert
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
