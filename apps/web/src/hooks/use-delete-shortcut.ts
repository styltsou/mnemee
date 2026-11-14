import { useEffect, useEffectEvent } from "react";
import {
  isDeleteShortcut,
  isDeleteSurfaceBlocked,
} from "@/lib/delete-shortcut";
import { isPeekAssetPaneActive } from "@/lib/asset-pane-focus";

export function useDeleteShortcut({
  enabled,
  onDelete,
  surface = "board",
  ownsFocus,
}: {
  enabled: boolean;
  onDelete: () => void;
  surface?: "board" | "asset";
  ownsFocus?: () => boolean;
}) {
  const handleDelete = useEffectEvent((event: KeyboardEvent) => {
    if (
      !isDeleteShortcut(event) ||
      isDeleteSurfaceBlocked(event.target, surface)
    )
      return;
    if (ownsFocus ? !ownsFocus() : isPeekAssetPaneActive()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    onDelete();
  });

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleDelete);
    return () => window.removeEventListener("keydown", handleDelete);
  }, [enabled]);
}
