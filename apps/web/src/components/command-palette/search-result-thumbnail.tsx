import { useState } from "react";
import { ExternalLinkIcon, PlayIcon, VideoIcon } from "lucide-react";

import { ProgressiveImage } from "@/components/ui/progressive-image";
import { cn } from "@/lib/utils";

export function LinkSearchResultPreview({
  previewUrl,
  blurDataURL,
  faviconUrl,
  isVideo = false,
}: {
  previewUrl?: string;
  blurDataURL?: string;
  faviconUrl?: string;
  isVideo?: boolean;
}) {
  const [failedPreview, setFailedPreview] = useState(false);
  const [failedFavicon, setFailedFavicon] = useState(false);
  const imageUrl =
    previewUrl && !failedPreview
      ? previewUrl
      : faviconUrl && !failedFavicon
        ? faviconUrl
        : undefined;
  const Icon = isVideo ? VideoIcon : ExternalLinkIcon;

  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background",
        !(isVideo && imageUrl === faviconUrl) &&
          "border border-border/60 shadow-sm",
      )}
    >
      {imageUrl ? (
        <>
          {imageUrl === previewUrl ? (
            <ProgressiveImage
              src={imageUrl}
              blurDataURL={blurDataURL}
              className="absolute inset-0 size-full object-cover"
              onError={() => setFailedPreview(true)}
            />
          ) : (
            <img
              src={imageUrl}
              alt=""
              className="size-full object-contain p-1"
              onError={() => setFailedFavicon(true)}
            />
          )}
          {isVideo ? <VideoThumbnailPlayOverlay /> : null}
        </>
      ) : (
        <Icon className="size-4 text-foreground" />
      )}
    </span>
  );
}

export function VideoThumbnailPlayOverlay() {
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <span className="flex size-4 items-center justify-center rounded-full bg-black/65 text-white shadow-sm">
        <PlayIcon className="size-2 fill-current" />
      </span>
    </span>
  );
}
