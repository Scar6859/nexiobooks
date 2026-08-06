-- Allow participants to delete abandoned empty chats
drop policy if exists "Participants can delete conversations" on public.conversations;
create policy "Participants can delete conversations"
  on public.conversations for delete
  using (
    participant_one = auth.uid()
    or participant_two = auth.uid()
    or public.is_admin()
  );
