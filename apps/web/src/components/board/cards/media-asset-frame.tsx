import type { ReactNode } from "react";
import {
  getMediaAssetName,
  useAssetNamePreferences,
} from "@/lib/asset-name-preferences";
import { cn } from "@/lib/utils";
import { hasSelectionModifier } from "@/lib/selection";

export function MediaAssetFrame({
  asset,
  children,
  canvas = false,
  hideName = false,
  hasDuration = false,
  onOpen,
}: {
  asset: { type: "image" | "video"; title?: string | null };
  children: ReactNode;
  canvas?: boolean;
  hideName?: boolean;
  hasDuration?: boolean;
  onOpen?: () => void;
}) {
  const { alwaysVisible, position: savedPosition } = useAssetNamePreferences();
  const position = alwaysVisible ? savedPosition : "inside-bottom";
  const outside = position === "above" || position === "below";
  const name = getMediaAssetName(asset);
  return (
    // Supplement the media surface's keyboard-accessible action for outside captions.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      onClick={(event) => {
        if (
          !hasSelectionModifier(event) &&
          (event.target === event.currentTarget ||
            (event.target instanceof Element &&
              event.target.closest("[data-asset-name]")))
        )
          onOpen?.();
      }}
      className={cn(
        "group/media-name relative w-full min-w-0",
        !canvas && outside && (position === "above" ? "pt-8" : "pb-8"),
      )}
    >
      {children}
      {!hideName ? (
        <div
          data-asset-morph-omit
          data-asset-name
          className={cn(
            "pointer-events-none absolute inset-x-0 z-10 flex min-w-0 justify-center",
            outside ? "pointer-events-auto h-8 items-center" : "px-2.5",
            position === "inside-top" && "top-2.5",
            position === "inside-bottom" && "bottom-2.5",
            position === "above" && (canvas ? "bottom-full" : "top-0"),
            position === "below" && (canvas ? "top-full" : "bottom-0"),
            !outside && position === "inside-bottom" && hasDuration && "pr-14",
            !alwaysVisible &&
              "opacity-0 group-hover/media-name:opacity-100 group-focus-within/media-name:opacity-100 [@media(hover:none)]:opacity-100",
          )}
        >
          <span
            title={name}
            className={cn(
              "max-w-full min-w-0 truncate text-xs font-medium",
              outside
                ? "text-sidebar-foreground/80"
                : "rounded-lg border border-sidebar-foreground/10 bg-sidebar/60 px-3 py-1.5 text-sidebar-foreground backdrop-blur-sm",
            )}
          >
            {name}
          </span>
        </div>
      ) : null}
    </div>
  );
}
