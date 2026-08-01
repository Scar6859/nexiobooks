-- Max 10 listings per user

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

drop trigger if exists enforce_listing_limit on public.listings;
create trigger enforce_listing_limit
  before insert on public.listings
  for each row execute function public.enforce_listing_limit();

drop policy if exists "Authenticated users can create listings" on public.listings;
create policy "Authenticated users can create listings"
  on public.listings for insert
  with check (
    auth.uid() = user_id
    and (select count(*) from public.listings l where l.user_id = auth.uid()) < 10
  );
