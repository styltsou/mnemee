import { authClient } from "@/lib/auth-client";
import { setAppearanceAccount } from "@/lib/appearance";
import { clearMediaSession } from "@/lib/media-session";

export const activeSessionsQueryKey = (userId?: string) =>
  userId
    ? (["auth", "active-sessions", userId] as const)
    : (["auth", "active-sessions"] as const);

export class AuthSessionsError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export async function listActiveSessions(signal?: AbortSignal) {
  const { data, error } = await authClient.listSessions({
    fetchOptions: { signal },
  });
  if (error) {
    throw new AuthSessionsError(
      error.code === "SESSION_NOT_FRESH"
        ? "Sign out and sign in again to view your active sessions."
        : (error.message ??
            "Unable to load active sessions. Please try again."),
      error.code,
    );
  }
  return data ?? [];
}

export type SessionAction =
  | { type: "session"; token: string }
  | { type: "others" }
  | { type: "all" }
  | { type: "current" };

/** Returns whether the caller must leave the authenticated app. */
export async function endAuthSessions(action: SessionAction): Promise<boolean> {
  const endsCurrentSession = action.type === "all" || action.type === "current";
  if (endsCurrentSession) {
    // Delete the current browser's media cookies while its auth session still
    // authorizes that request. A media failure must not prevent auth revocation.
    await clearMediaSession().catch(() => undefined);
  }

  const { error } =
    action.type === "session"
      ? await authClient.revokeSession({ token: action.token })
      : action.type === "others"
        ? await authClient.revokeOtherSessions()
        : action.type === "all"
          ? await authClient.revokeSessions()
          : await authClient.signOut();
  if (error) {
    throw new AuthSessionsError(
      error.message ?? "Unable to sign out. Please try again.",
      error.code,
    );
  }

  if (action.type === "all") {
    // revokeSessions deletes the server records but does not clear this
    // browser's auth cookies or broadcast sign-out to its other tabs.
    // Once revocation succeeds, a cookie-cleanup failure cannot undo it.
    await authClient.signOut().catch(() => undefined);
  }
  if (endsCurrentSession) setAppearanceAccount(null);
  return endsCurrentSession;
}
