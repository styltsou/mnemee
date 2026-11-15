import { Background, BackgroundVariant } from "@xyflow/react";
import { useCallback, useSyncExternalStore } from "react";

export const CANVAS_PATTERNS = [
  { value: "none", label: "None" },
  { value: "dots", label: "Dots" },
  { value: "lines", label: "Lines" },
  { value: "cross", label: "Cross" },
] as const;

export type CanvasPattern = (typeof CANVAS_PATTERNS)[number]["value"];

type CanvasPatternStyle = {
  gap: number;
  size?: number;
  lineWidth?: number;
  opacity: number;
  offset?: number;
};

export type CanvasPatternPreviewKind = "placement" | "thumbnail";

const DEFAULT_CANVAS_PATTERN: CanvasPattern = "dots";
const STORAGE_KEY = "mnemee:canvas-pattern";
const CHANGE_EVENT = "mnemee:canvas-pattern-change";

const CANVAS_PATTERN_STYLES: Record<
  Exclude<CanvasPattern, "none">,
  CanvasPatternStyle & { variant: BackgroundVariant }
> = {
  dots: {
    variant: BackgroundVariant.Dots,
    gap: 24,
    size: 2,
    opacity: 0.14,
  },
  lines: {
    variant: BackgroundVariant.Lines,
    gap: 24,
    lineWidth: 0.5,
    opacity: 0.06,
  },
  cross: {
    variant: BackgroundVariant.Cross,
    gap: 32,
    size: 5,
    lineWidth: 1,
    opacity: 0.07,
  },
};

/**
 * Thumbnail-only values. The real patterns are too faint to read in a 48px
 * tile, so these are denser and stronger. Continuous grid lines need less
 * contrast than isolated dots and crosses to keep the tiles balanced.
 */
const CANVAS_PATTERN_PREVIEWS: Record<
  Exclude<CanvasPattern, "none">,
  CanvasPatternStyle
> = {
  dots: { gap: 12, size: 2, opacity: 0.42, offset: 7 },
  // Half-pixel stroke centers keep the 1px lines crisp at this fixed scale.
  lines: { gap: 12, lineWidth: 1, opacity: 0.1, offset: 0.5 },
  cross: { gap: 14, size: 5, lineWidth: 1, opacity: 0.34, offset: 9 },
};

const PLACEMENT_PREVIEW_ZOOM = 0.75;

function isCanvasPattern(value: string | null): value is CanvasPattern {
  return CANVAS_PATTERNS.some((pattern) => pattern.value === value);
}

export function getSavedCanvasPattern(): CanvasPattern {
  if (typeof window === "undefined") return DEFAULT_CANVAS_PATTERN;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  return isCanvasPattern(saved) ? saved : DEFAULT_CANVAS_PATTERN;
}

function subscribeToCanvasPattern(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useCanvasPattern() {
  const pattern = useSyncExternalStore<CanvasPattern>(
    subscribeToCanvasPattern,
    getSavedCanvasPattern,
    () => DEFAULT_CANVAS_PATTERN,
  );

  const setPattern = useCallback((next: CanvasPattern) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { pattern, setPattern };
}

export function CanvasBackground() {
  const { pattern } = useCanvasPattern();
  return <CanvasPatternBackground pattern={pattern} />;
}

export function CanvasPatternBackground({
  pattern,
  id,
  preview,
}: {
  pattern: CanvasPattern;
  id?: string;
  preview?: CanvasPatternPreviewKind;
}) {
  if (pattern === "none") return null;

  const boardStyle = CANVAS_PATTERN_STYLES[pattern];
  const thumbnail = preview === "thumbnail";
  const { gap, size, lineWidth, opacity, offset } = thumbnail
    ? CANVAS_PATTERN_PREVIEWS[pattern]
    : boardStyle;
  // Match the board renderer's zoom: scale the spacing and marks together.
  const zoom = preview === "placement" ? PLACEMENT_PREVIEW_ZOOM : 1;

  return (
    <Background
      id={id}
      variant={boardStyle.variant}
      gap={gap * zoom}
      size={size === undefined ? undefined : size * zoom}
      lineWidth={lineWidth}
      offset={offset}
      patternClassName={
        thumbnail && pattern !== "dots"
          ? "[shape-rendering:crispEdges]"
          : undefined
      }
      style={preview ? { zIndex: 0 } : undefined}
      bgColor={preview ? "transparent" : undefined}
      color={`color-mix(in oklch, var(--foreground) ${Math.round(opacity * 100)}%, transparent)`}
    />
  );
}
