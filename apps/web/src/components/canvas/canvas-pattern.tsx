import { Background, BackgroundVariant } from "@xyflow/react";
import { useId } from "react";
import { changeAppearance, useAppearance } from "@/lib/appearance";
import type { Appearance } from "@/lib/appearance-cache";

export const CANVAS_PATTERNS = [
  { value: "none", label: "None" },
  { value: "dots", label: "Dots" },
  { value: "lines", label: "Lines" },
  { value: "cross", label: "Cross" },
] as const;

export type CanvasPattern = Appearance["canvasPattern"];

type CanvasPatternStyle = {
  gap: number;
  size?: number;
  lineWidth?: number;
  opacity: number;
  offset?: number;
};

export type CanvasPatternPreviewKind = "placement" | "thumbnail";

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

function setPattern(canvasPattern: CanvasPattern) {
  changeAppearance({ canvasPattern });
}

export function useCanvasPattern() {
  const pattern = useAppearance((state) => state.canvasPattern);
  return { pattern, setPattern };
}

export function CanvasBackground() {
  const id = useId();
  const { pattern } = useCanvasPattern();
  return <CanvasPatternBackground id={id} pattern={pattern} />;
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
