"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getOrCreateConversation,
  getPrimaryAdminId,
} from "@/lib/messaging";

export default function ContactAdminButton({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?redirect=/my-requests");
      return;
    }

    const adminId = await getPrimaryAdminId(supabase);
    if (!adminId) {
      setError("Admin messaging isn't set up yet. Try again after the database migration.");
      setLoading(false);
      return;
    }

    const result = await getOrCreateConversation(
      supabase,
      user.id,
      adminId,
      requestId,
    );
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/messages?c=${result.id}&request=${requestId}`);
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="btn-navy px-4 py-2 text-sm disabled:opacity-60"
      >
        {loading ? "Opening…" : "Message admin"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
