-- Add available column to listings.
-- When a request is accepted the listing is taken down (available = false).
-- It comes back (available = true) if the request is later declined or reset.
alter table public.listings
  add column if not exists available boolean not null default true;
