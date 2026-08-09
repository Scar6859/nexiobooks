-- Original / regular retail price used for estimated savings.

alter table public.listings
  add column if not exists regular_price numeric(10, 2);

notify pgrst, 'reload schema';
