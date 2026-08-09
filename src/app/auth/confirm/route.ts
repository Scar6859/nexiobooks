import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { ensureUserProfile } from "@/lib/profile";

/**
 * Handles signup/magic-link/recovery confirmation via token_hash.
 * Email templates may use:
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");

  const safeNext =
    type === "recovery"
      ? "/reset-password"
      : nextParam?.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/auth/confirmed";

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = safeNext;
  redirectTo.search = "";

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

  if (tokenHash && type) {
    await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await ensureUserProfile(supabase, user);
  }

  return NextResponse.redirect(redirectTo);
}
