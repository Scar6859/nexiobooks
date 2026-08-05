-- Optional video for each listing
alter table public.listings
  add column if not exists video_url text;
