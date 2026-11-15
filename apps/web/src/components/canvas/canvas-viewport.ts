import type { Viewport } from "@xyflow/react";

export const DEFAULT_CANVAS_VIEWPORT: Viewport = { x: 40, y: 40, zoom: 1.1 };
export const BOARD_VIEWPORT_INSET = 24;
export const CANVAS_FIT_VIEW_PADDING = `${BOARD_VIEWPORT_INSET}px` as const;
export const CANVAS_MIN_ZOOM = 0.15;
export const CANVAS_MAX_ZOOM = 2;
