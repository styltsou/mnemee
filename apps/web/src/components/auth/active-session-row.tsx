import {
  LoaderCircleIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { listActiveSessions } from "@/lib/auth-sessions";
import { describeSessionDevice } from "@/lib/session-device";

type ActiveSession = Awaited<ReturnType<typeof listActiveSessions>>[number];

export function ActiveSessionRow({
  session,
  isCurrent,
  pending,
  disabled,
  onSignOut,
}: {
  session: ActiveSession;
  isCurrent: boolean;
  pending: boolean;
  disabled: boolean;
  onSignOut: () => void;
}) {
  const device = describeSessionDevice(session.userAgent);
  const Icon =
    device.type === "tablet"
      ? TabletIcon
      : device.mobile
        ? SmartphoneIcon
        : MonitorIcon;
  const createdAt = new Date(session.createdAt);

  return (
    <li className="flex items-start gap-3 px-4 py-4 sm:px-5">
      <Icon
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium">{device.name}</span>
          {isCurrent ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              This session
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{device.label}</p>
        <p className="text-xs leading-5 text-muted-foreground">
          Signed in{" "}
          <time dateTime={createdAt.toISOString()}>
            {createdAt.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
        </p>
        {session.ipAddress ? (
          <p className="text-xs break-all text-muted-foreground">
            IP address: {session.ipAddress}
          </p>
        ) : null}
      </div>
      {!isCurrent ? (
        <Button
          className="self-center"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={`Sign out of ${device.name} — ${device.label}`}
          onClick={onSignOut}
        >
          {pending ? (
            <LoaderCircleIcon
              aria-hidden="true"
              className="motion-safe:animate-spin"
            />
          ) : null}
          Sign out
        </Button>
      ) : null}
    </li>
  );
}
