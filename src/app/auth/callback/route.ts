import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/profile";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/auth/confirmed";
  }
  return next;
}

function parseCookies(header: string): { name: string; value: string }[] {
  return header
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const idx = c.indexOf("=");
      return idx < 0
        ? { name: c, value: "" }
        : { name: c.slice(0, idx).trim(), value: c.slice(idx + 1).trim() };
    });
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  // Password recovery: pass the raw code to the reset-password page.
  // We deliberately do NOT exchange it here so no session is created and the
  // user is not logged in when they land on the reset form.
  // The reset-password page uses detectSessionInUrl:false so the browser
  // client also won't auto-exchange it; the exchange only happens on submit.
  if (next === "/reset-password" && code) {
    const dest = new URL(`${origin}/reset-password`);
    dest.searchParams.set("code", code);
    return NextResponse.redirect(dest.toString());
  }

  // All other flows (signup confirm, magic link, etc.): exchange normally.
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookies(request.headers.get("cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await ensureUserProfile(supabase, user);
  }

  return response;
}
