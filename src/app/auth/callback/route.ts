import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/profile";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/auth/confirmed";
  }
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore if cookies cannot be set in this context.
          }
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

  const response = NextResponse.redirect(`${origin}${next}`);

  // For password recovery: set a short-lived cookie so the reset-password
  // page knows the user arrived via a genuine reset link and shows the form.
  if (next === "/reset-password") {
    response.cookies.set("reset-in-progress", "1", {
      maxAge: 600,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}
