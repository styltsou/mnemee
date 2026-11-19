import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActiveSessionRow } from "@/components/auth/active-session-row";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import {
  activeSessionsQueryKey,
  AuthSessionsError,
  endAuthSessions,
  listActiveSessions,
  type SessionAction,
} from "@/lib/auth-sessions";
import { describeSessionDevice } from "@/lib/session-device";

export function ActiveSessions() {
  const { data: current } = authClient.useSession();
  const queryClient = useQueryClient();
  const queryKey = activeSessionsQueryKey(current?.user.id);
  const sessions = useQuery({
    queryKey,
    enabled: !!current?.user.id,
    queryFn: ({ signal }) => listActiveSessions(signal),
    // Session tokens are needed for revocation. Keep them only while this
    // section is mounted, and fetch a fresh list whenever it is reopened.
    gcTime: 0,
    retry: false,
  });
  const [confirmation, setConfirmation] = useState<{
    action: SessionAction;
    pendingKey: string;
    sessionDescription?: string;
  }>({ action: { type: "current" }, pendingKey: "current" });
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const orderedSessions = [...(sessions.data ?? [])].sort((a, b) => {
    const aCurrent = a.id === current?.session.id;
    const bCurrent = b.id === current?.session.id;
    return (
      Number(bCurrent) - Number(aCurrent) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });
  const hasOtherSessions = orderedSessions.some(
    (session) => session.id !== current?.session.id,
  );
  const needsRecentSignIn =
    sessions.error instanceof AuthSessionsError &&
    sessions.error.code === "SESSION_NOT_FRESH";

  const confirmationCopy = getSignOutConfirmation(
    confirmation.action.type,
    confirmation.sessionDescription,
  );

  function confirmSignOut(
    action: SessionAction,
    pendingKey: string = action.type,
    sessionDescription?: string,
  ) {
    setError(null);
    setConfirmation({ action, pendingKey, sessionDescription });
    setConfirmationOpen(true);
  }

  async function signOut(action: SessionAction, pendingKey: string) {
    if (submitting.current) return;
    submitting.current = true;
    setPending(pendingKey);
    setError(null);
    setSuccess(null);
    try {
      await queryClient.cancelQueries({ queryKey });
      if (await endAuthSessions(action)) {
        // A full navigation discards private query data and route auth caches.
        window.location.replace("/login");
        return;
      }
      queryClient.setQueryData<typeof sessions.data>(queryKey, (previous) =>
        previous?.filter((session) =>
          action.type === "session"
            ? session.token !== action.token
            : session.id === current?.session.id,
        ),
      );
      setSuccess(
        action.type === "others"
          ? "Your other sessions have been signed out."
          : "Session signed out.",
      );
      setConfirmationOpen(false);
      await queryClient.invalidateQueries({ queryKey });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to sign out. Please try again.",
      );
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }

  return (
    <section className="mt-9" aria-labelledby="sign-out-heading">
      <h3
        id="sign-out-heading"
        className="text-[13px] font-medium text-muted-foreground"
      >
        Sign out
      </h3>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-card px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h4 className="text-sm font-medium">This session</h4>
          <p className="text-sm text-muted-foreground">
            Sign out of Mnemee in this browser.
          </p>
        </div>
        <Button
          variant="destructive-primary"
          size="sm"
          disabled={pending !== null || !current}
          onClick={() => confirmSignOut({ type: "current" })}
        >
          Sign out
        </Button>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-border/70 bg-card">
        <div className="px-4 py-4 sm:px-5">
          <h4 id="active-sessions-heading" className="text-sm font-medium">
            Active sessions
          </h4>
          <p className="text-sm text-muted-foreground">
            See where you’re signed in and sign out of sessions you no longer
            use.
          </p>
        </div>
        <div className="rounded-t-lg border-t border-border/70 bg-background">
          {sessions.isPending ? (
            <div
              className="space-y-3 px-4 py-4 sm:px-5"
              role="status"
              aria-label="Loading active sessions"
            >
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-60 max-w-full" />
            </div>
          ) : orderedSessions.length ? (
            <ul
              className="divide-y divide-border/70"
              aria-label="Active sessions"
            >
              {orderedSessions.map((session) => {
                const isCurrent = session.id === current?.session.id;
                const device = describeSessionDevice(session.userAgent);
                return (
                  <ActiveSessionRow
                    key={session.id}
                    session={session}
                    isCurrent={isCurrent}
                    pending={pending === session.id}
                    disabled={pending !== null || !current}
                    onSignOut={() =>
                      confirmSignOut(
                        { type: "session", token: session.token },
                        session.id,
                        `${device.name} (${device.label})`,
                      )
                    }
                  />
                );
              })}
            </ul>
          ) : !sessions.isError ? (
            <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
              No active sessions found.
            </p>
          ) : null}
          {sessions.error ? (
            <div className="space-y-3 px-4 py-4 sm:px-5">
              <p className="text-sm text-destructive" role="alert">
                {sessions.error.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                pending={!needsRecentSignIn && sessions.isFetching}
                disabled={pending !== null || sessions.isFetching}
                onClick={() => {
                  if (needsRecentSignIn) confirmSignOut({ type: "current" });
                  else void sessions.refetch();
                }}
              >
                {needsRecentSignIn ? "Sign out and sign in again" : "Retry"}
              </Button>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 px-4 py-4 sm:px-5">
            <Button
              variant="outline"
              size="sm"
              pending={pending === "others"}
              disabled={pending !== null || !current || !hasOtherSessions}
              onClick={() => confirmSignOut({ type: "others" })}
            >
              Sign out other sessions
            </Button>
            <Button
              variant="destructive-primary"
              size="sm"
              disabled={pending !== null || !current}
              onClick={() => confirmSignOut({ type: "all" })}
            >
              Sign out everywhere
            </Button>
          </div>
        </div>
      </div>
      {error && !confirmationOpen ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <p
        role="status"
        className={success ? "mt-3 text-sm text-muted-foreground" : "sr-only"}
      >
        {success}
      </p>
      <AlertDialog
        open={confirmationOpen}
        onOpenChange={(open) => {
          if (!open && !submitting.current) {
            setConfirmationOpen(false);
            setError(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogBody>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmationCopy.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmationCopy.description}
                {current?.user.email ? (
                  <>
                    {" "}
                    Account:{" "}
                    <strong className="font-semibold break-all">
                      {current.user.email}
                    </strong>
                    .
                  </>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </AlertDialogBody>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              pending={pending !== null}
              disabled={pending !== null}
              onClick={() => {
                void signOut(confirmation.action, confirmation.pendingKey);
              }}
            >
              {confirmationCopy.buttonText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function getSignOutConfirmation(
  type: SessionAction["type"],
  sessionDescription?: string,
) {
  switch (type) {
    case "all":
      return {
        title: "Sign out everywhere?",
        description:
          "You’ll be signed out on every device, including this one.",
        buttonText: "Sign out everywhere",
      };
    case "others":
      return {
        title: "Sign out other sessions?",
        description: "Other devices will need to sign in again.",
        buttonText: "Sign out other sessions",
      };
    case "session":
      return {
        title: "Sign out of this session?",
        description: `${sessionDescription} will be signed out.`,
        buttonText: "Sign out session",
      };
    case "current":
      return {
        title: "Sign out of this browser?",
        description: "You’ll need to sign in again on this browser.",
        buttonText: "Sign out",
      };
  }
}
