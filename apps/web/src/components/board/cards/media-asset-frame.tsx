import type { ReactNode } from "react";
import {
  getMediaAssetName,
  useAssetNamePreferences,
} from "@/lib/asset-name-preferences";
import { cn } from "@/lib/utils";
import { hasSelectionModifier } from "@/lib/selection";

export const MEDIA_CARD_PILL_CLASS =
  "rounded-lg border border-sidebar-foreground/10 bg-sidebar/60 px-3 py-1.5 text-xs font-medium text-sidebar-foreground backdrop-blur-sm";

export function MediaAssetFrame({
  asset,
  children,
  canvas = false,
  hideName = false,
  durationLabel,
  onOpen,
}: {
  asset: { type: "image" | "video"; title?: string | null };
  children: ReactNode;
  canvas?: boolean;
  hideName?: boolean;
  durationLabel?: string;
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
      <div className="relative min-w-0">
        {children}
        {durationLabel ? (
          <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-10 flex min-w-0 items-center justify-end gap-2.5">
            {!hideName && position === "inside-bottom" ? (
              <span
                data-asset-morph-omit
                data-asset-name
                title={name}
                className={cn(
                  "min-w-0 truncate",
                  MEDIA_CARD_PILL_CLASS,
                  !alwaysVisible &&
                    "opacity-0 group-hover/media-name:opacity-100 group-focus-within/media-name:opacity-100 [@media(hover:none)]:opacity-100",
                )}
              >
                {name}
              </span>
            ) : null}
            <span
              className={cn("shrink-0 tabular-nums", MEDIA_CARD_PILL_CLASS)}
            >
              {durationLabel}
            </span>
          </div>
        ) : null}
      </div>
      {!hideName && !(durationLabel && position === "inside-bottom") ? (
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
            !alwaysVisible &&
              "opacity-0 group-hover/media-name:opacity-100 group-focus-within/media-name:opacity-100 [@media(hover:none)]:opacity-100",
          )}
        >
          <span
            title={name}
            className={cn(
              "max-w-full min-w-0 truncate font-medium",
              outside
                ? "text-sm text-sidebar-foreground/80"
                : MEDIA_CARD_PILL_CLASS,
            )}
          >
            {name}
          </span>
        </div>
      ) : null}
    </div>
  );
}
