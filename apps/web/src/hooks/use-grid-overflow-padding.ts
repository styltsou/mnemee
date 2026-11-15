import { useCallback, useRef, useState } from "react";

// Add room below long grids without making otherwise fitting grids scrollable.
export function useGridOverflowPadding() {
  const observerRef = useRef<ResizeObserver | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  const ref = useCallback((surface: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!surface) return;
    const viewport = surface.closest<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport) return;

    const update = () => {
      const bottomPadding = Number.parseFloat(
        getComputedStyle(surface).paddingBottom,
      );
      const naturalHeight = surface.scrollHeight - bottomPadding;
      setOverflowing(naturalHeight > viewport.clientHeight + 1);
    };
    const observer = new ResizeObserver(update);
    observer.observe(surface);
    observer.observe(viewport);
    observerRef.current = observer;
    update();
  }, []);

  return { ref, overflowing };
}
