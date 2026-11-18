import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LoaderCircleIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import type { ImageAsset } from "@/types/asset";
import { hasSelectionModifier } from "@/lib/selection";
import { cn } from "@/lib/utils";
import { releaseLocalImagePreviewAfterRemoteLoad } from "@/lib/local-image-preview";
import { MediaAssetFrame } from "./media-asset-frame";
import { getMediaAssetName } from "@/lib/asset-name-preferences";
import { useState } from "react";
import { ImageUnavailable } from "@/components/ui/image-unavailable";

export function ImageAssetCard({
  asset,
  onOpen,
  isContextMenuOpen = false,
  selected = false,
  canvas = false,
}: {
  asset: ImageAsset;
  onOpen?: () => void;
  isContextMenuOpen?: boolean;
  selected?: boolean;
  canvas?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const [failedSrc, setFailedSrc] = useState<string>();

  return (
    <MediaAssetFrame
      asset={asset}
      canvas={canvas}
      hideName={Boolean(asset.uploadStatus)}
      onOpen={onOpen}
    >
      {/* role and tabIndex are set when onOpen is provided. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        data-asset-card-surface
        role={onOpen ? "button" : undefined}
        tabIndex={onOpen ? 0 : undefined}
        aria-label={`Open image: ${getMediaAssetName(asset)}`}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-lg border border-transparent transition-colors duration-100 ease-[cubic-bezier(0.16,1,0.3,1)]",
          !selected && "hover:border-sidebar-foreground/20",
          isContextMenuOpen && "border-sidebar-foreground/20",
        )}
        style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
        onClick={(event) => {
          if (!hasSelectionModifier(event)) {
            onOpen?.();
          }
        }}
        onKeyDown={(event) => {
          if (!onOpen || (event.key !== "Enter" && event.key !== " ")) {
            return;
          }

          event.preventDefault();
          onOpen();
        }}
      >
        <div
          data-asset-card-hero="image"
          className="absolute inset-0 overflow-hidden rounded-[6px] bg-muted"
        >
          {failedSrc === asset.url && !asset.localPreviewUrl ? (
            <ImageUnavailable alt={asset.alt || undefined} />
          ) : (
            <ProgressiveImage
              src={asset.url}
              fallbackSrc={asset.localPreviewUrl}
              revokeFallbackBlob={false}
              onLoad={() =>
                releaseLocalImagePreviewAfterRemoteLoad(
                  queryClient,
                  asset.localPreviewUrl,
                )
              }
              blurDataURL={asset.uploadStatus ? undefined : asset.blurDataURL}
              alt={asset.alt ?? ""}
              className="absolute inset-0 h-full w-full rounded-[inherit] object-cover"
              loading="lazy"
              onError={() => setFailedSrc(asset.url)}
            />
          )}
        </div>
        <AnimatePresence initial={false}>
          {asset.uploadStatus ? (
            <motion.div
              key="upload-status"
              exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              className="absolute inset-x-0 bottom-0 flex justify-center px-2.5 pb-2.5"
            >
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-popover/85 px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-sm ring-1 ring-border backdrop-blur-sm">
                <LoaderCircleIcon className="size-3 animate-spin" />
                {asset.uploadStatus === "processing" ? (
                  <span>Importing</span>
                ) : (
                  <span>
                    Uploading{" "}
                    <span className="font-mono tabular-nums">
                      {asset.uploadProgress ?? 0}%
                    </span>
                  </span>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </MediaAssetFrame>
  );
}
