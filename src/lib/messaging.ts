import type { SupabaseClient } from "@supabase/supabase-js";
import type { Conversation, Profile } from "@/lib/types";

export type ConversationRow = Conversation & {
  peer: Pick<Profile, "id" | "full_name" | "initials" | "avatar_url">;
  preview?: string | null;
};

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
    return { error: "You can't message yourself." };
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

export function buildConversationRows(
  conversations: Conversation[],
  currentUserId: string,
  profiles: Pick<Profile, "id" | "full_name" | "initials" | "avatar_url">[],
  lastByConv: Record<string, string>,
): ConversationRow[] {
  const map = new Map(profiles.map((p) => [p.id, p]));
  return conversations.map((c) => {
    const peerId = otherParticipantId(c, currentUserId);
    const peer = map.get(peerId) ?? {
      id: peerId,
      full_name: "User",
      initials: "?",
      avatar_url: null,
    };
    return { ...c, peer, preview: lastByConv[c.id] ?? null };
  });
}

export function isMissingMessagingSchemaError(error: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!error?.message && !error?.code) return false;
  const message = `${error.code ?? ""} ${error.message ?? ""}`;
  return /conversations|messages|get_primary_admin_id|schema cache|PGRST205|42P01|PGRST202/i.test(
    message,
  );
}

/** Delete a conversation only when it has no messages. */
export async function deleteEmptyConversation(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<boolean> {
  const { count, error: countError } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId);

  if (countError || (count ?? 0) > 0) return false;

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  return !error;
}
