import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/components/theme-provider";
import { AccountSettings } from "@/components/auth/account-settings";
import { AssetNameSettings } from "@/components/asset-name-settings";
import { CanvasPatternPreview } from "@/components/canvas/canvas-pattern-preview";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BellIcon,
  ArrowLeftIcon,
  PaletteIcon,
  UserRoundIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { savePendingAppearance, useAppearance } from "@/lib/appearance";
import { SETTINGS_REQUEST_EVENT, closeSettings } from "@/lib/settings-dialog";
import { useWorkspaceOverlayNavigation } from "@/components/app-shell/use-workspace-overlay-navigation";
import {
  CANVAS_PATTERNS,
  useCanvasPattern,
} from "@/components/canvas/canvas-pattern";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

type ThemeValue = (typeof THEMES)[number]["value"];

const SETTINGS_SECTIONS = [
  { value: "appearance", label: "Appearance", icon: PaletteIcon },
  { value: "account", label: "Account", icon: UserRoundIcon },
  { value: "notifications", label: "Notifications", icon: BellIcon },
] as const;

type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["value"];

function nextOptionIndex(
  key: string,
  current: number,
  count: number,
  orientation: "horizontal" | "vertical",
) {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === (orientation === "horizontal" ? "ArrowRight" : "ArrowDown")) {
    return (current + 1) % count;
  }
  if (key === (orientation === "horizontal" ? "ArrowLeft" : "ArrowUp")) {
    return (current - 1 + count) % count;
  }
  return null;
}

function ThemePreviewScene({ dark }: { dark: boolean }) {
  const shell = dark ? "#0a0a0a" : "#fff";
  const board = dark ? "#171717" : "#fafafa";
  const surface = dark ? "#242424" : "#fff";
  const active = dark ? "#262626" : "#eee";
  const border = dark ? "#353535" : "#e0e0e0";
  const foreground = dark ? "#d4d4d4" : "#404040";
  const muted = "#888";

  return (
    <>
      <rect width="60" height="42" fill={shell} />
      <rect x="3" y="3" width="4" height="4" rx="1" fill={foreground} />
      <rect x="9" y="4.5" width="5" height="1" rx="0.5" fill={muted} />
      <rect x="2" y="12" width="13" height="5" rx="1.25" fill={active} />
      <g fill="none" strokeLinecap="round">
        <path d="M5 14.5h7M19 4.5h8" stroke={foreground} />
        <path d="M5 21.5h6M5 27.5h8M51 4.5h4" stroke={muted} />
      </g>
      <rect
        x="17.5"
        y="9.5"
        width="40"
        height="30"
        rx="3"
        fill={board}
        stroke={border}
      />
      <rect
        x="22.5"
        y="14.5"
        width="16"
        height="15"
        rx="1.5"
        fill={surface}
        stroke={border}
      />
      <path d="M26 19.5h8" stroke={foreground} strokeLinecap="round" />
      <path d="M26 23.5h9M26 26.5h6" stroke={muted} strokeLinecap="round" />
      <rect
        x="42.5"
        y="18.5"
        width="10"
        height="11"
        rx="1.5"
        fill={active}
        stroke={border}
      />
      <path d="M44 26l2.5-3 2 2 1-1 1.5 2z" fill={muted} />
      <rect x="32" y="34" width="11" height="3" rx="1.5" fill={active} />
    </>
  );
}

function ThemePreview({ theme }: { theme: ThemeValue }) {
  return (
    <svg
      aria-hidden="true"
      className="block size-full rounded-[3px]"
      viewBox="0 0 60 42"
      preserveAspectRatio="none"
    >
      <ThemePreviewScene dark={theme === "dark"} />
      {theme === "system" && (
        <>
          <defs>
            <clipPath id="settings-system-preview-dark">
              <rect x="30" width="30" height="42" />
            </clipPath>
          </defs>
          <g clipPath="url(#settings-system-preview-dark)">
            <ThemePreviewScene dark />
          </g>
          <path d="M30 0v42" stroke="#8a8a8a" strokeOpacity=".45" />
        </>
      )}
    </svg>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { pattern, setPattern } = useCanvasPattern();
  const saveFailed = useAppearance((state) => state.saveFailed);
  const activeTheme: ThemeValue = theme === "system" ? "system" : theme;

  return (
    <section aria-labelledby="appearance-heading">
      <h2
        id="appearance-heading"
        className="text-xl font-semibold tracking-tight text-foreground"
      >
        Appearance
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how your workspace looks and feels.
      </p>
      <div className="mt-9">
        <h3 className="text-[13px] font-medium text-muted-foreground">
          Visual style
        </h3>
        <div className="mt-4 flex min-h-20 items-center justify-between gap-3 rounded-lg border border-border/70 bg-card px-4 py-2.5 sm:px-5">
          <span className="shrink-0 text-sm font-medium">Mode</span>
          <div
            aria-label="Mode"
            className="flex flex-wrap items-center justify-end gap-2"
            role="radiogroup"
          >
            {THEMES.map(({ value, label }, index) => (
              <Tooltip key={value}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={label}
                      aria-checked={activeTheme === value}
                      role="radio"
                      tabIndex={activeTheme === value ? 0 : -1}
                      className={cn(
                        "size-12 shrink-0 overflow-hidden rounded-md border bg-background p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:h-12 md:w-16",
                        activeTheme === value
                          ? "border-foreground ring-1 ring-foreground"
                          : "border-border hover:border-foreground/50",
                      )}
                      onClick={() => setTheme(value)}
                      onKeyDown={(event) => {
                        const next = nextOptionIndex(
                          event.key,
                          index,
                          THEMES.length,
                          "horizontal",
                        );
                        if (next === null) return;
                        event.preventDefault();
                        setTheme(THEMES[next].value);
                        event.currentTarget
                          .closest('[role="radiogroup"]')
                          ?.querySelectorAll<HTMLButtonElement>(
                            '[role="radio"]',
                          )
                          [next]?.focus();
                      }}
                    />
                  }
                >
                  <ThemePreview theme={value} />
                </TooltipTrigger>
                <TooltipContent side="top">{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-9">
        <h3 className="text-[13px] font-medium text-muted-foreground">
          Canvas
        </h3>
        <div className="mt-4 flex min-h-20 items-center justify-between gap-3 rounded-lg border border-border/70 bg-card px-4 py-2.5 sm:px-5">
          <span className="shrink-0 text-sm font-medium">Pattern</span>
          <div
            aria-label="Canvas pattern"
            className="flex flex-wrap items-center justify-end gap-2"
            role="radiogroup"
          >
            {CANVAS_PATTERNS.map(({ value, label }, index) => (
              <Tooltip key={value}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={label}
                      aria-checked={pattern === value}
                      role="radio"
                      tabIndex={pattern === value ? 0 : -1}
                      className={cn(
                        "size-12 shrink-0 overflow-hidden rounded-md border bg-background p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:h-12 md:w-16",
                        pattern === value
                          ? "border-foreground ring-1 ring-foreground"
                          : "border-border hover:border-foreground/50",
                      )}
                      onClick={() => setPattern(value)}
                      onKeyDown={(event) => {
                        const next = nextOptionIndex(
                          event.key,
                          index,
                          CANVAS_PATTERNS.length,
                          "horizontal",
                        );
                        if (next === null) return;
                        event.preventDefault();
                        setPattern(CANVAS_PATTERNS[next].value);
                        event.currentTarget
                          .closest('[role="radiogroup"]')
                          ?.querySelectorAll<HTMLButtonElement>(
                            '[role="radio"]',
                          )
                          [next]?.focus();
                      }}
                    />
                  }
                >
                  <CanvasPatternPreview pattern={value} kind="thumbnail" />
                </TooltipTrigger>
                <TooltipContent side="top">{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        <AssetNameSettings />
        {saveFailed ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground" role="status">
              Couldn’t sync your appearance changes.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void savePendingAppearance()}
            >
              Retry sync
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function SettingsDialog() {
  const navigateOverlay = useWorkspaceOverlayNavigation();
  const location = useRouterState({ select: (state) => state.location });
  const open = (location.search as { settings?: boolean }).settings === true;
  const [section, setSection] = useState<SettingsSection>(() =>
    new URLSearchParams(window.location.search).has("googleLinkError")
      ? "account"
      : "appearance",
  );
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onRequest(event: Event) {
      const requestedOpen = (event as CustomEvent<boolean>).detail;
      if (requestedOpen) {
        const active = document.activeElement;
        previousFocusRef.current =
          active instanceof HTMLElement ? active : null;
      }
      void navigateOverlay(
        location.pathname,
        {
          settings: requestedOpen || undefined,
        },
        true,
      );
    }
    window.addEventListener(SETTINGS_REQUEST_EVENT, onRequest);
    return () => {
      window.removeEventListener(SETTINGS_REQUEST_EVENT, onRequest);
    };
  }, [location.pathname, navigateOverlay]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) closeSettings();
      }}
    >
      <DialogContent
        className="top-0 left-0 h-dvh max-w-none translate-x-0 rounded-none bg-background md:top-1/2 md:left-1/2 md:h-[min(680px,85dvh)] md:max-w-[min(900px,calc(100vw-3rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:bg-popover/80"
        initialFocus={titleRef}
        finalFocus={() => {
          // Only return focus to a real, still-mounted opener (e.g. the user
          // menu trigger). Otherwise leave focus alone instead of jumping to
          // an unrelated control.
          const previous = previousFocusRef.current;
          previousFocusRef.current = null;
          return (
            !!previous &&
            previous !== document.body &&
            previous.isConnected &&
            previous
          );
        }}
        polishedMotion
        showCloseButton={false}
      >
        <DialogDescription className="sr-only">
          Manage your workspace appearance and account settings.
        </DialogDescription>
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background/50 text-foreground md:flex-row md:rounded-lg">
          <aside className="min-h-0 w-full shrink-0 md:w-48">
            <ScrollArea
              className="h-full"
              viewportClassName="overscroll-contain"
              viewportProps={{ tabIndex: undefined }}
            >
              <div className="flex h-full flex-col px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:p-4">
                <div className="flex items-center gap-1">
                  <DialogClose
                    render={<Button variant="ghost" size="icon-sm" />}
                  >
                    <ArrowLeftIcon />
                    <span className="sr-only">Close settings</span>
                  </DialogClose>
                  <DialogTitle
                    ref={titleRef}
                    tabIndex={-1}
                    className="py-1.5 text-sm font-semibold tracking-tight outline-none"
                  >
                    Settings
                  </DialogTitle>
                </div>
                <div
                  aria-label="Settings sections"
                  aria-orientation="vertical"
                  className="mt-2 space-y-0.5"
                  role="tablist"
                >
                  {SETTINGS_SECTIONS.map(
                    ({ value, label, icon: Icon }, index) => (
                      <button
                        key={value}
                        type="button"
                        id={`settings-tab-${value}`}
                        aria-controls="settings-panel"
                        aria-selected={section === value}
                        role="tab"
                        tabIndex={section === value ? 0 : -1}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          section === value
                            ? "bg-foreground/[0.07] text-foreground hover:bg-foreground/[0.07]"
                            : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
                        )}
                        onClick={() => setSection(value)}
                        onKeyDown={(event) => {
                          const next = nextOptionIndex(
                            event.key,
                            index,
                            SETTINGS_SECTIONS.length,
                            "vertical",
                          );
                          if (next === null) return;
                          event.preventDefault();
                          setSection(SETTINGS_SECTIONS[next].value);
                          event.currentTarget.parentElement
                            ?.querySelectorAll<HTMLButtonElement>(
                              '[role="tab"]',
                            )
                            [next]?.focus();
                        }}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        {label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </ScrollArea>
          </aside>
          <main
            id="settings-panel"
            aria-labelledby={`settings-tab-${section}`}
            role="tabpanel"
            className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-t-lg border-t border-foreground/10 bg-background md:rounded-l-xl md:rounded-tr-none md:border-t-0 md:border-l"
          >
            <ScrollArea
              className="h-full rounded-[inherit]"
              viewportClassName="overscroll-contain"
              viewportProps={{ tabIndex: undefined }}
              contentClassName="px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-7 md:py-5"
            >
              {section === "appearance" ? (
                <AppearanceSection />
              ) : section === "account" ? (
                <AccountSettings />
              ) : (
                <section>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {
                      SETTINGS_SECTIONS.find((item) => item.value === section)
                        ?.label
                    }
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Manage how you hear about activity in your workspace.
                  </p>
                </section>
              )}
            </ScrollArea>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
