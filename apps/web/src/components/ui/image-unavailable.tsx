import { ImageOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageUnavailable({
  compact = false,
  alt,
}: {
  compact?: boolean;
  alt?: string;
}) {
  return (
    <div
      role="img"
      aria-label={alt ? `Preview unavailable: ${alt}` : "Preview unavailable"}
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground"
    >
      <ImageOffIcon className={compact ? "size-5" : "size-6"} />
      <span
        className={cn(
          "line-clamp-3 max-w-full px-3 text-center [overflow-wrap:anywhere]",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        {alt || "Preview unavailable"}
      </span>
    </div>
  );
}
