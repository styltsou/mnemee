import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { activeSessionsQueryKey, AuthSessionsError } from "@/lib/auth-sessions";
import { ActiveSessions } from "./active-sessions";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: "user-test" }, session: { id: "current" } },
    }),
  },
}));

const current = {
  id: "current",
  token: "private-current-token",
  userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/131.0 Safari/537.36",
  createdAt: new Date("2026-11-13T12:00:00Z"),
  ipAddress: null,
};
const other = {
  id: "other",
  token: "private-other-token",
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1",
  createdAt: new Date("2026-11-14T12:00:00Z"),
  ipAddress: "192.0.2.10",
};

function render(sessions?: (typeof current | typeof other)[], error?: Error) {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retryOnMount: false } },
  });
  const key = activeSessionsQueryKey("user-test");
  if (sessions) client.setQueryData(key, sessions);
  if (error) {
    const query = client.getQueryCache().build(client, { queryKey: key });
    query.setState({ status: "error", error, fetchStatus: "idle" });
  }
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <ActiveSessions />
    </QueryClientProvider>,
  );
  client.clear();
  return html;
}

describe("active sessions settings", () => {
  it("puts this session first even when another session is newer, and never renders tokens", () => {
    const html = render([other, current]);
    expect(html.indexOf("Chrome 131 on Windows")).toBeLessThan(
      html.indexOf("Safari on iOS"),
    );
    expect(html).toContain("This session");
    expect(html).toContain("192.0.2.10");
    expect(html).not.toContain("private-current-token");
    expect(html).not.toContain("private-other-token");
  });

  it("groups current-session sign-out before the card and avoids a duplicate row action", () => {
    const html = render([other, current]);
    expect(html).toContain('id="sign-out-heading"');
    expect(html.indexOf("Sign out of Mnemee in this browser.")).toBeLessThan(
      html.indexOf('id="active-sessions-heading"'),
    );
    expect(html).not.toContain('aria-label="Sign out of Windows PC');
    expect(html).toContain('aria-label="Sign out of iPhone');
  });

  it("disables sign-out-others when only this session exists", () => {
    const html = render([current]);
    expect(html).toMatch(
      /<button[^>]*disabled[^>]*>Sign out other sessions<\/button>/,
    );
    expect(html).toContain("Sign out everywhere");
  });

  it("shows loading feedback before sessions arrive", () => {
    expect(render()).toContain('aria-label="Loading active sessions"');
  });

  it("provides a recovery action when Better Auth requires a recent sign-in", () => {
    const html = render(
      undefined,
      new AuthSessionsError(
        "Sign out and sign in again to view your active sessions.",
        "SESSION_NOT_FRESH",
      ),
    );
    expect(html).toContain("Sign out and sign in again");
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("Loading active sessions");
  });
});
