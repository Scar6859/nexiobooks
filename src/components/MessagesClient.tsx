"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  deleteEmptyConversation,
  getAdminIdForSchool,
  getOrCreateConversation,
  type ConversationRow,
} from "@/lib/messaging";
import type { Profile } from "@/lib/types";
import Avatar from "@/components/Avatar";
import ChatPanel from "@/components/ChatPanel";
import FancySelect from "@/components/FancySelect";

type AdminTab = "sellers" | "buyers";

export default function MessagesClient({
  currentUserId,
  isAdmin,
  userSchool,
  conversations,
  allUsers,
  initialConversationId,
}: {
  currentUserId: string;
  isAdmin: boolean;
  userSchool?: string | null;
  conversations: ConversationRow[];
  allUsers: Pick<Profile, "id" | "full_name" | "initials" | "avatar_url">[];
  initialConversationId?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const messageableUsers = useMemo(
    () => allUsers.filter((u) => u.id !== currentUserId),
    [allUsers, currentUserId],
  );
  const [rows, setRows] = useState(conversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversationId ?? conversations[0]?.id ?? null,
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickUserId, setPickUserId] = useState(messageableUsers[0]?.id ?? "");
  const [adminTab, setAdminTab] = useState<AdminTab>("sellers");

  useEffect(() => {
    setRows(conversations);
  }, [conversations]);

  useEffect(() => {
    if (
      initialConversationId &&
      conversations.some((c) => c.id === initialConversationId)
    ) {
      setActiveId(initialConversationId);
    }
  }, [initialConversationId, conversations]);

  const active = useMemo(
    () => rows.find((c) => c.id === activeId) ?? null,
    [rows, activeId],
  );

  const visibleRows = useMemo(() => {
    if (!isAdmin) return rows;
    if (adminTab === "sellers") return rows.filter((c) => !c.listing_request_id);
    return rows.filter((c) => !!c.listing_request_id);
  }, [rows, isAdmin, adminTab]);

  async function discardEmpty(conversationId: string) {
    setRows((prev) => prev.filter((c) => c.id !== conversationId));
    setActiveId((current) => {
      if (current !== conversationId) return current;
      return null;
    });
    router.replace("/messages");
    router.refresh();
  }

  async function selectConversation(nextId: string | null) {
    if (activeId && activeId !== nextId) {
      const deleted = await deleteEmptyConversation(supabase, activeId);
      if (deleted) {
        setRows((prev) => prev.filter((c) => c.id !== activeId));
      }
    }
    setActiveId(nextId);
    router.replace(nextId ? `/messages?c=${nextId}` : "/messages");
    if (nextId) router.refresh();
  }

  async function startWithAdmin() {
    setStarting(true);
    setError(null);
    if (activeId) {
      const deleted = await deleteEmptyConversation(supabase, activeId);
      if (deleted) setRows((prev) => prev.filter((c) => c.id !== activeId));
    }
    const adminId = await getAdminIdForSchool(supabase, userSchool);
    if (!adminId) {
      setError("No administrator is available to message yet.");
      setStarting(false);
      return;
    }
    if (adminId === currentUserId) {
      setError("You can't message yourself.");
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
    setActiveId(result.id);
    router.push(`/messages?c=${result.id}`);
    router.refresh();
    setStarting(false);
  }

  async function startWithUser() {
    if (!pickUserId || pickUserId === currentUserId) {
      setError("You can't message yourself.");
      return;
    }
    setStarting(true);
    setError(null);
    if (activeId) {
      const deleted = await deleteEmptyConversation(supabase, activeId);
      if (deleted) setRows((prev) => prev.filter((c) => c.id !== activeId));
    }
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

        {isAdmin && (
          <div className="mb-3 flex rounded-xl bg-[var(--surface-2)] p-1">
            {(["sellers", "buyers"] as AdminTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setAdminTab(tab)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-colors ${
                  adminTab === tab
                    ? "bg-[var(--navy)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {isAdmin && messageableUsers.length > 0 && (
          <div className="mb-3 space-y-2 rounded-xl bg-[var(--surface-2)] p-2">
            <FancySelect
              label="Message anyone"
              value={
                messageableUsers.some((u) => u.id === pickUserId)
                  ? pickUserId
                  : messageableUsers[0].id
              }
              onChange={setPickUserId}
              options={messageableUsers.map((u) => ({
                value: u.id,
                label: u.full_name || u.initials || "User",
              }))}
            />
            <button
              type="button"
              disabled={
                starting ||
                !pickUserId ||
                pickUserId === currentUserId
              }
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
            Message NEXIOBOOKS admin
          </button>
        )}

        <div className="space-y-1">
          {visibleRows.length === 0 ? (
            <p className="px-2 py-4 text-xs text-[var(--muted)]">
              No conversations yet.
            </p>
          ) : (
            visibleRows.map((c) => {
              const selected = c.id === activeId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    void selectConversation(c.id);
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
                    {c.preview ? (
                      <div
                        className={`truncate text-xs ${
                          selected ? "text-white/70" : "text-[var(--muted)]"
                        }`}
                      >
                        {c.preview}
                      </div>
                    ) : (
                      <div
                        className={`truncate text-xs ${
                          selected ? "text-white/70" : "text-[var(--muted)]"
                        }`}
                      >
                        New chat
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
            onEmptyDiscard={discardEmpty}
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
