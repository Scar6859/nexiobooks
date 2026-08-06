"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getOrCreateConversation,
  getPrimaryAdminId,
  type ConversationRow,
} from "@/lib/messaging";
import type { Profile } from "@/lib/types";
import Avatar from "@/components/Avatar";
import ChatPanel from "@/components/ChatPanel";
import FancySelect from "@/components/FancySelect";

export default function MessagesClient({
  currentUserId,
  isAdmin,
  conversations,
  allUsers,
  initialConversationId,
}: {
  currentUserId: string;
  isAdmin: boolean;
  conversations: ConversationRow[];
  allUsers: Pick<Profile, "id" | "full_name" | "initials" | "avatar_url">[];
  initialConversationId?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [activeId, setActiveId] = useState<string | null>(
    initialConversationId ?? conversations[0]?.id ?? null,
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickUserId, setPickUserId] = useState(allUsers[0]?.id ?? "");

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  async function startWithAdmin() {
    setStarting(true);
    setError(null);
    const adminId = await getPrimaryAdminId(supabase);
    if (!adminId) {
      setError("No administrator is available to message yet.");
      setStarting(false);
      return;
    }
    const result = await getOrCreateConversation(
      supabase,
      currentUserId,
      adminId,
    );
    if ("error" in result) {
      setError(result.error);
      setStarting(false);
      return;
    }
    router.push(`/messages?c=${result.id}`);
    router.refresh();
    setStarting(false);
  }

  async function startWithUser() {
    if (!pickUserId) return;
    setStarting(true);
    setError(null);
    const result = await getOrCreateConversation(
      supabase,
      currentUserId,
      pickUserId,
    );
    if ("error" in result) {
      setError(result.error);
      setStarting(false);
      return;
    }
    setActiveId(result.id);
    router.push(`/messages?c=${result.id}`);
    router.refresh();
    setStarting(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
        <div className="mb-3 px-1">
          <h2 className="text-sm font-bold text-[var(--foreground)]">Chats</h2>
        </div>

        {isAdmin && allUsers.length > 0 && pickUserId && (
          <div className="mb-3 space-y-2 rounded-xl bg-[var(--surface-2)] p-2">
            <FancySelect
              label="Message anyone"
              value={pickUserId}
              onChange={setPickUserId}
              options={allUsers.map((u) => ({
                value: u.id,
                label: u.full_name || u.initials || "User",
              }))}
            />
            <button
              type="button"
              disabled={starting || !pickUserId}
              onClick={startWithUser}
              className="btn-navy w-full py-2 text-xs disabled:opacity-60"
            >
              Start chat
            </button>
          </div>
        )}

        {!isAdmin && (
          <button
            type="button"
            disabled={starting}
            onClick={startWithAdmin}
            className="mb-3 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--gold-muted)] disabled:opacity-60"
          >
            Message NexioBooks admin
          </button>
        )}

        <div className="space-y-1">
          {conversations.length === 0 ? (
            <p className="px-2 py-4 text-xs text-[var(--muted)]">
              No conversations yet.
            </p>
          ) : (
            conversations.map((c) => {
              const selected = c.id === activeId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveId(c.id);
                    router.replace(`/messages?c=${c.id}`);
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition ${
                    selected
                      ? "bg-[var(--navy)] text-white"
                      : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <Avatar
                    name={c.peer.full_name}
                    initials={c.peer.initials}
                    src={c.peer.avatar_url}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {c.peer.full_name ?? "User"}
                    </div>
                    {c.preview && (
                      <div
                        className={`truncate text-xs ${
                          selected ? "text-white/70" : "text-[var(--muted)]"
                        }`}
                      >
                        {c.preview}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
        {error && <p className="mt-2 px-1 text-xs text-red-600">{error}</p>}
      </aside>

      <div>
        {active ? (
          <ChatPanel
            conversationId={active.id}
            currentUserId={currentUserId}
            peer={active.peer}
          />
        ) : (
          <div className="flex h-[min(32rem,70vh)] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
            Select a conversation
            {!isAdmin && (
              <>
                {" "}
                or{" "}
                <button
                  type="button"
                  onClick={startWithAdmin}
                  className="font-semibold text-[var(--gold-muted)] hover:underline"
                >
                  message an admin
                </button>
              </>
            )}
            .
            <div className="mt-3">
              <Link href="/my-requests" className="text-[var(--gold-muted)] hover:underline">
                Back to My Requests
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
