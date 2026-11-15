import { useEffect, type RefObject } from "react";

type MoveExit = {
  workspaceSlug: string;
  sourceCollectionSlug?: string;
  sourceFolderPath?: string;
  nodeIds: readonly string[];
};

const listeners = new Set<(move: MoveExit) => void>();

export function startMoveExit(move: MoveExit) {
  for (const listener of listeners) listener(move);
}

export function onMoveExit(listener: (move: MoveExit) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMoveExitOverlay(
  rootRef: RefObject<HTMLElement | null>,
  scope: Omit<MoveExit, "nodeIds">,
  attribute: "data-grid-node-id" | "data-asset-card-id",
) {
  useEffect(() => {
    const listener = (move: MoveExit) => {
      if (
        move.workspaceSlug !== scope.workspaceSlug ||
        move.sourceCollectionSlug !== scope.sourceCollectionSlug ||
        move.sourceFolderPath !== scope.sourceFolderPath
      )
        return;

      const root = rootRef.current;
      if (!root) return;
      const cards = Array.from(
        root.querySelectorAll<HTMLElement>(`[${attribute}]`),
      );
      const moving = new Set(move.nodeIds);
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      for (const card of cards) {
        if (!moving.has(card.getAttribute(attribute) ?? "")) continue;
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const overlay = document.createElement("div");
        const clone = card.cloneNode(true) as HTMLElement;
        clone.removeAttribute("id");
        clone
          .querySelectorAll("[id]")
          .forEach((element) => element.removeAttribute("id"));
        overlay.setAttribute("aria-hidden", "true");
        overlay.inert = true;
        Object.assign(overlay.style, {
          position: "fixed",
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          zIndex: "60",
          pointerEvents: "none",
          transformOrigin: "center",
        });
        overlay.append(clone);
        document.body.append(overlay);
        const originalOpacity = card.style.opacity;
        card.style.opacity = "0";
        void overlay
          .animate(
            reduceMotion
              ? [{ opacity: 1 }, { opacity: 0 }]
              : [
                  { opacity: 1, transform: "scale(1)" },
                  { opacity: 0, transform: "scale(0.99)" },
                ],
            {
              duration: reduceMotion ? 100 : 150,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            },
          )
          .finished.catch(() => undefined)
          .then(() => {
            overlay.remove();
            if (card.isConnected) card.style.opacity = originalOpacity;
          });
      }
    };
    return onMoveExit(listener);
  }, [
    attribute,
    rootRef,
    scope.sourceCollectionSlug,
    scope.sourceFolderPath,
    scope.workspaceSlug,
  ]);
}
