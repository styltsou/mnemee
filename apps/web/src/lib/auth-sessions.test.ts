import { beforeEach, describe, expect, it, vi } from "vitest";
import { authClient } from "@/lib/auth-client";
import { clearMediaSession } from "@/lib/media-session";
import {
  activeSessionsQueryKey,
  endAuthSessions,
  listActiveSessions,
} from "./auth-sessions";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeOtherSessions: vi.fn(),
    revokeSessions: vi.fn(),
    signOut: vi.fn(),
  },
}));
vi.mock("@/lib/media-session", () => ({ clearMediaSession: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(clearMediaSession).mockResolvedValue();
  for (const method of [
    authClient.revokeSession,
    authClient.revokeOtherSessions,
    authClient.revokeSessions,
    authClient.signOut,
  ]) {
    vi.mocked(method).mockResolvedValue({
      data: { success: true, status: true },
      error: null,
    });
  }
});

describe("active auth sessions", () => {
  it("keeps account caches separate and supports invalidating them after password changes", () => {
    const prefix = activeSessionsQueryKey();
    const first = activeSessionsQueryKey("user-one");
    expect(first.slice(0, prefix.length)).toEqual(prefix);
    expect(first).not.toEqual(activeSessionsQueryKey("user-two"));
  });

  it("preserves the recent-sign-in requirement and forwards cancellation", async () => {
    vi.mocked(authClient.listSessions).mockResolvedValue({
      data: null,
      error: {
        code: "SESSION_NOT_FRESH",
        message: "Session is not fresh",
        status: 403,
        statusText: "Forbidden",
      },
    });
    const signal = new AbortController().signal;
    await expect(listActiveSessions(signal)).rejects.toMatchObject({
      code: "SESSION_NOT_FRESH",
      message: "Sign out and sign in again to view your active sessions.",
    });
    expect(authClient.listSessions).toHaveBeenCalledWith({
      fetchOptions: { signal },
    });
  });

  it("revokes only the selected remote session without signing out this browser", async () => {
    expect(
      await endAuthSessions({ type: "session", token: "selected-session" }),
    ).toBe(false);
    expect(authClient.revokeSession).toHaveBeenCalledWith({
      token: "selected-session",
    });
    expect(authClient.revokeSessions).not.toHaveBeenCalled();
    expect(authClient.signOut).not.toHaveBeenCalled();
    expect(clearMediaSession).not.toHaveBeenCalled();
  });

  it("uses the endpoint that preserves the current session when signing out others", async () => {
    expect(await endAuthSessions({ type: "others" })).toBe(false);
    expect(authClient.revokeOtherSessions).toHaveBeenCalledOnce();
    expect(authClient.revokeSessions).not.toHaveBeenCalled();
    expect(authClient.signOut).not.toHaveBeenCalled();
  });

  it("clears media access before revoking every session, then clears local auth cookies", async () => {
    const calls: string[] = [];
    vi.mocked(clearMediaSession).mockImplementation(async () => {
      calls.push("media");
    });
    vi.mocked(authClient.revokeSessions).mockImplementation(async () => {
      calls.push("revoke-all");
      return { data: { status: true }, error: null };
    });
    vi.mocked(authClient.signOut).mockImplementation(async () => {
      calls.push("sign-out");
      return { data: { success: true }, error: null };
    });
    expect(await endAuthSessions({ type: "all" })).toBe(true);
    expect(calls).toEqual(["media", "revoke-all", "sign-out"]);
  });

  it("does not report success or sign out locally when global revocation fails", async () => {
    vi.mocked(authClient.revokeSessions).mockResolvedValue({
      data: null,
      error: {
        message: "Please try again",
        status: 500,
        statusText: "Internal Server Error",
      },
    });
    await expect(endAuthSessions({ type: "all" })).rejects.toThrow(
      "Please try again",
    );
    expect(authClient.signOut).not.toHaveBeenCalled();
  });

  it("still leaves the app if cookie cleanup fails after successful global revocation", async () => {
    vi.mocked(clearMediaSession).mockRejectedValue(
      new Error("Media unavailable"),
    );
    vi.mocked(authClient.signOut).mockRejectedValue(
      new Error("Network interrupted"),
    );
    expect(await endAuthSessions({ type: "all" })).toBe(true);
    expect(authClient.revokeSessions).toHaveBeenCalledOnce();
  });

  it("signs out only this browser for the recent-sign-in recovery flow", async () => {
    expect(await endAuthSessions({ type: "current" })).toBe(true);
    expect(authClient.signOut).toHaveBeenCalledOnce();
    expect(authClient.revokeSessions).not.toHaveBeenCalled();
    expect(authClient.revokeOtherSessions).not.toHaveBeenCalled();
  });
});
