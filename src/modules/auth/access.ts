/** Policy shared by the OAuth callback and every private application entry point. */
export function assertGoogleIdentity(
  profile: { sub?: string; email_verified?: boolean },
  allowedSubject: string,
): void {
  if (
    !allowedSubject ||
    profile.sub !== allowedSubject ||
    profile.email_verified !== true
  ) {
    throw new Error("ACCESS_DENIED");
  }
}

type Access =
  | { status: "authorized"; userId: string }
  | { status: "unauthenticated" }
  | { status: "forbidden" };

export async function authorizeSession(
  session: { user: { id: string } } | null,
  ownsAllowedIdentity: (userId: string) => Promise<boolean>,
): Promise<Access> {
  if (!session) return { status: "unauthenticated" };
  if (!(await ownsAllowedIdentity(session.user.id)))
    return { status: "forbidden" };
  return { status: "authorized", userId: session.user.id };
}
