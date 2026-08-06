import { redirect } from "next/navigation";
import MessagesClient, {
  buildConversationRows,
} from "@/components/MessagesClient";
import { resolveIsAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, Profile } from "@/lib/types";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; request?: string }>;
}) {
  const { c, request: requestId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/messages");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = resolveIsAdmin(
    user.email,
    (profile as { is_admin?: boolean } | null)?.is_admin,
  );

  // If opened from an accepted request, ensure a chat with the primary admin exists.
  let focusId = c ?? null;
  if (requestId && !isAdmin) {
    const { data: adminId } = await supabase.rpc("get_primary_admin_id");
    if (adminId && adminId !== user.id) {
      const [one, two] =
        user.id < adminId ? [user.id, adminId] : [adminId, user.id];

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("participant_one", one)
        .eq("participant_two", two)
        .maybeSingle();

      if (existing?.id) {
        focusId = existing.id;
        await supabase
          .from("conversations")
          .update({ listing_request_id: requestId })
          .eq("id", existing.id)
          .is("listing_request_id", null);
      } else {
        const { data: created } = await supabase
          .from("conversations")
          .insert({
            participant_one: one,
            participant_two: two,
            listing_request_id: requestId,
          })
          .select("id")
          .single();
        if (created?.id) focusId = created.id;
      }
    }
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const convRows = (conversations as Conversation[] | null) ?? [];
  const peerIds = [
    ...new Set(
      convRows.flatMap((row) => [row.participant_one, row.participant_two]),
    ),
  ].filter((id) => id !== user.id);

  const { data: peers } = peerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, initials, avatar_url")
        .in("id", peerIds)
    : { data: [] };

  const lastByConv: Record<string, string> = {};
  if (convRows.length > 0) {
    const { data: recent } = await supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in(
        "conversation_id",
        convRows.map((row) => row.id),
      )
      .order("created_at", { ascending: false });

    for (const msg of recent ?? []) {
      if (!lastByConv[msg.conversation_id]) {
        lastByConv[msg.conversation_id] = msg.body;
      }
    }
  }

  let allUsers: Pick<Profile, "id" | "full_name" | "initials" | "avatar_url">[] =
    [];
  if (isAdmin) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, initials, avatar_url")
      .neq("id", user.id)
      .order("full_name", { ascending: true });
    allUsers = (data ?? []) as Pick<
      Profile,
      "id" | "full_name" | "initials" | "avatar_url"
    >[];
  }

  const rows = buildConversationRows(
    convRows,
    user.id,
    (peers ?? []) as Pick<
      Profile,
      "id" | "full_name" | "initials" | "avatar_url"
    >[],
    lastByConv,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Messages</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {isAdmin
            ? "Message any user on the platform."
            : "Contact NexioBooks admins about accepted book requests and delivery."}
        </p>
      </div>
      <MessagesClient
        currentUserId={user.id}
        isAdmin={isAdmin}
        conversations={rows}
        allUsers={allUsers}
        initialConversationId={focusId}
      />
    </div>
  );
}
