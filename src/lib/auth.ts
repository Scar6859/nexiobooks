export const DUPLICATE_EMAIL_MESSAGE =
  "An account with this email already exists. Try logging in instead.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const PRIMARY_ADMIN_EMAIL = "oscarshao28@gmail.com";
export const HERRICKS_ADMIN_EMAIL = "sonichenry214@gmail.com";

const ADMIN_EMAILS = new Set([
  PRIMARY_ADMIN_EMAIL,
  HERRICKS_ADMIN_EMAIL,
]);

/** Oscar Shao covers Manhasset; Henry Kim covers Herricks. */
export function adminEmailForSchool(school: string | null | undefined): string {
  const value = (school ?? "").toLowerCase();
  if (value.includes("herricks")) return HERRICKS_ADMIN_EMAIL;
  return PRIMARY_ADMIN_EMAIL;
}

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.has(normalizeEmail(email));
}

export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS];
}

/** True if profile flag is set or the signed-in email is a designated admin. */
export function resolveIsAdmin(
  email: string | null | undefined,
  profileIsAdmin?: boolean | null,
): boolean {
  return Boolean(profileIsAdmin) || (email ? isAdminEmail(email) : false);
}

export function getSignupErrorMessage(error: { message: string; code?: string }): string {
  const message = error.message.toLowerCase();

  if (
    error.code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists")
  ) {
    return DUPLICATE_EMAIL_MESSAGE;
  }

  return error.message;
}

export function isDuplicateSignup(data: {
  user: { identities?: { id: string }[] } | null;
  session: unknown;
}): boolean {
  return Boolean(
    data.user && !data.session && (data.user.identities?.length ?? 0) === 0
  );
}
