import { ReactFlow } from "@xyflow/react";
import { useRef, useState } from "react";

import { NoteCardSkeleton } from "@/components/asset-grid/asset-card-skeleton";
import { FolderCardSkeleton } from "@/components/asset-grid/preview-stack-skeleton";
import { useTheme } from "@/components/theme-provider";
import { ImageSkeleton } from "@/components/ui/image-skeleton";
import { usePersistedStore } from "@/store";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-layout-effect";
import { makeBoardKey } from "./canvas-key";
import { CanvasBackground } from "./canvas-pattern";
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
  DEFAULT_CANVAS_VIEWPORT,
} from "./canvas-viewport";

const CARD_WIDTH = 280;
const CARD_GAP = 32;
const GRID_COLUMNS = 5;
const ROW_HEIGHT = 400;
const FALLBACK_SURFACE = { width: 1200, height: 800 };

const LOADING_CARDS = [
  { id: "image-1", type: "image", height: "h-64", jitter: [-8, -14] as const },
  { id: "note-1", type: "note", height: "", jitter: [10, 6] as const },
  { id: "image-2", type: "image", height: "h-80", jitter: [-14, 10] as const },
  { id: "folder-1", type: "folder", height: "", jitter: [6, -10] as const },
  { id: "image-3", type: "image", height: "h-48", jitter: [12, 12] as const },
  { id: "note-2", type: "note", height: "", jitter: [-10, 8] as const },
  { id: "image-4", type: "image", height: "h-56", jitter: [8, -6] as const },
  { id: "folder-2", type: "folder", height: "", jitter: [-6, 14] as const },
  { id: "image-5", type: "image", height: "h-72", jitter: [14, -8] as const },
  { id: "note-3", type: "note", height: "", jitter: [-12, -12] as const },
] as const;

type CanvasLoadingProps = {
  workspaceSlug: string;
  collectionSlug: string;
  folderPath?: string;
};

export function CanvasLoading({
  workspaceSlug,
  collectionSlug,
  folderPath,
}: CanvasLoadingProps) {
  const boardKey = makeBoardKey(workspaceSlug, collectionSlug, folderPath);
  const { theme } = useTheme();
  const viewport = usePersistedStore(
    (state) => state.boardViewports[boardKey] ?? DEFAULT_CANVAS_VIEWPORT,
  );
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [surface, setSurface] = useState(FALLBACK_SURFACE);

  useIsomorphicLayoutEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const update = () =>
      setSurface({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(el);
    return () => observer?.disconnect();
  }, []);

  const gridWidth = GRID_COLUMNS * CARD_WIDTH + (GRID_COLUMNS - 1) * CARD_GAP;
  const gridHeight = 2 * ROW_HEIGHT + CARD_GAP;
  const gridLeft =
    (surface.width / 2 - viewport.x) / viewport.zoom - gridWidth / 2;
  const gridTop =
    (surface.height / 2 - viewport.y) / viewport.zoom - gridHeight / 2;

  return (
    <div
      ref={surfaceRef}
      className="relative h-full min-h-0 w-full bg-transparent"
      role="status"
      aria-label="Loading collection canvas"
    >
      <span className="sr-only">Loading collection canvas</span>
      <ReactFlow
        className="mnemee-flow pointer-events-none"
        colorMode={theme}
        nodes={[]}
        defaultViewport={viewport}
        viewport={viewport}
        minZoom={CANVAS_MIN_ZOOM}
        maxZoom={CANVAS_MAX_ZOOM}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <CanvasBackground />
      </ReactFlow>
      <div
        className="pointer-events-none absolute top-0 left-0"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: "top left",
        }}
      >
        <div className="relative">
          {LOADING_CARDS.map((card, index) => {
            const column = index % GRID_COLUMNS;
            const row = Math.floor(index / GRID_COLUMNS);
            return (
              <div
                key={card.id}
                className="absolute"
                style={{
                  left:
                    gridLeft +
                    column * (CARD_WIDTH + CARD_GAP) +
                    card.jitter[0] / viewport.zoom,
                  top:
                    gridTop + row * ROW_HEIGHT + card.jitter[1] / viewport.zoom,
                }}
              >
                <LoadingCard {...card} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LoadingCard({ id, type, height }: (typeof LOADING_CARDS)[number]) {
  const widthClass = "w-[280px] max-md:w-[200px]";

  if (type === "note") {
    return <NoteCardSkeleton className={widthClass} />;
  }

  if (type === "folder") {
    return (
      <FolderCardSkeleton
        className={widthClass}
        variant={id === "folder-2" ? 1 : 0}
      />
    );
  }

  return <ImageSkeleton className={`${widthClass} rounded-lg ${height}`} />;
}
