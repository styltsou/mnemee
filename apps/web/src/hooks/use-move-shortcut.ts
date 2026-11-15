import { useEffect, useEffectEvent } from "react";
import { isPeekAssetPaneActive } from "@/lib/asset-pane-focus";
import { isDeleteSurfaceBlocked } from "@/lib/delete-shortcut";
import { isMoveShortcut } from "@/lib/move-shortcut";

export function useMoveShortcut({
  enabled,
  onMove,
  surface = "board",
  ownsFocus,
}: {
  enabled: boolean;
  onMove: () => void;
  surface?: "board" | "asset";
  ownsFocus?: () => boolean;
}) {
  const handleMove = useEffectEvent((event: KeyboardEvent) => {
    if (!isMoveShortcut(event) || isDeleteSurfaceBlocked(event.target, surface))
      return;
    if (ownsFocus ? !ownsFocus() : isPeekAssetPaneActive()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    onMove();
  });

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleMove);
    return () => window.removeEventListener("keydown", handleMove);
  }, [enabled]);
}
