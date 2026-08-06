import type { SupabaseClient } from "@supabase/supabase-js";

export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function getPrimaryAdminId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_primary_admin_id");
  if (!error && data) return data as string;

  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_admin", true)
    .limit(1);

  return admins?.[0]?.id ?? null;
}

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  userA: string,
  userB: string,
  listingRequestId?: string | null,
): Promise<{ id: string } | { error: string }> {
  if (userA === userB) {
    return { error: "Cannot start a conversation with yourself." };
  }

  const [participant_one, participant_two] = orderedPair(userA, userB);

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_one", participant_one)
    .eq("participant_two", participant_two)
    .maybeSingle();

  if (existing?.id) {
    if (listingRequestId) {
      await supabase
        .from("conversations")
        .update({ listing_request_id: listingRequestId })
        .eq("id", existing.id)
        .is("listing_request_id", null);
    }
    return { id: existing.id };
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      participant_one,
      participant_two,
      listing_request_id: listingRequestId ?? null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Could not start conversation." };
  }

  return { id: created.id };
}

export function otherParticipantId(
  conversation: { participant_one: string; participant_two: string },
  userId: string,
): string {
  return conversation.participant_one === userId
    ? conversation.participant_two
    : conversation.participant_one;
}
