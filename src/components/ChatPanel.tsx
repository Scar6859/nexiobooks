"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteEmptyConversation } from "@/lib/messaging";
import type { Message } from "@/lib/types";
import Avatar from "@/components/Avatar";

type Peer = {
  id: string;
  full_name: string | null;
  initials: string | null;
  avatar_url: string | null;
};

export default function ChatPanel({
  conversationId,
  currentUserId,
  peer,
  onEmptyDiscard,
}: {
  conversationId: string;
  currentUserId: string;
  peer: Peer;
  onEmptyDiscard?: (conversationId: string) => void;
}) {
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hadMessagesRef = useRef(false);
  const onEmptyDiscardRef = useRef(onEmptyDiscard);
  onEmptyDiscardRef.current = onEmptyDiscard;

  useEffect(() => {
    let cancelled = false;
    hadMessagesRef.current = false;
    setLoading(true);
    setMessages([]);
    setError(null);

    async function load() {
      const { data, error: loadError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }
      const rows = (data as Message[]) ?? [];
      hadMessagesRef.current = rows.length > 0;
      setMessages(rows);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          hadMessagesRef.current = true;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);

      // Drop chats that were opened but never used.
      if (!hadMessagesRef.current) {
        const id = conversationId;
        void deleteEmptyConversation(supabase, id).then((deleted) => {
          if (deleted) onEmptyDiscardRef.current?.(id);
        });
      }
    };
  }, [conversationId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);

    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: text,
      })
      .select("*")
      .single();

    if (sendError) {
      setError(sendError.message);
      setSending(false);
      return;
    }

    if (data) {
      hadMessagesRef.current = true;
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message],
      );
    }
    setBody("");
    setSending(false);
  }

  return (
    <div className="flex h-[min(32rem,70vh)] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <Avatar
          name={peer.full_name}
          initials={peer.initials}
          src={peer.avatar_url}
          size="sm"
        />
        <div>
          <div className="font-semibold text-[var(--foreground)]">
            {peer.full_name ?? "NexioBooks Admin"}
          </div>
          <div className="text-xs text-[var(--muted)]">Direct message</div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No messages yet. Say hello to get started. Leave without sending and
            this chat won&apos;t be saved.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-[var(--navy)] text-white"
                      : "bg-[var(--surface-2)] text-[var(--foreground)]"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      mine ? "text-white/70" : "text-[var(--muted)]"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="flex gap-2 border-t border-[var(--border)] p-3"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="btn-navy px-4 py-2.5 text-sm disabled:opacity-60"
        >
          Send
        </button>
      </form>
      {error && (
        <p className="px-4 pb-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
