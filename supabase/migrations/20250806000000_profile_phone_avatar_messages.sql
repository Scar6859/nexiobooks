-- Profile phone + avatar, avatars storage, and direct messages

alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

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

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

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
    select 1
    from public.conversations c
    where c.id = conv_id
      and (c.participant_one = auth.uid() or c.participant_two = auth.uid())
  );
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

create or replace function public.get_primary_admin_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id
  from auth.users
  where lower(email) = 'oscarshao28@gmail.com'
  limit 1;
$$;

grant execute on function public.get_primary_admin_id() to anon, authenticated;

notify pgrst, 'reload schema';
