import "@xyflow/react/dist/style.css";
import { ReactFlowProvider } from "@xyflow/react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  CanvasPatternBackground,
  type CanvasPattern,
  type CanvasPatternPreviewKind,
} from "./canvas-pattern";

export function CanvasPatternPreview({
  pattern,
  kind = "placement",
  className,
}: {
  pattern: CanvasPattern;
  kind?: CanvasPatternPreviewKind;
  className?: string;
}) {
  const id = useId();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block size-full overflow-hidden rounded-[3px] bg-card",
        className,
      )}
    >
      {pattern !== "none" ? (
        <ReactFlowProvider>
          <CanvasPatternBackground id={id} pattern={pattern} preview={kind} />
        </ReactFlowProvider>
      ) : null}
    </span>
  );
}
