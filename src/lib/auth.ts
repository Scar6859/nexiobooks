export const DUPLICATE_EMAIL_MESSAGE =
  "An account with this email already exists. Try logging in instead.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
