import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { InlineAssetTitle } from "./inline-asset-title";
import { apiPatch, getUserFacingApiErrorMessage } from "@/lib/api";
import type { ImageAsset, VideoAsset } from "@/types/asset";

export function MediaAssetTitle({
  asset,
  workspaceSlug,
  onSaved,
}: {
  asset: ImageAsset | VideoAsset;
  workspaceSlug: string;
  onSaved?: (title: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [savedName, setSavedName] = useState<{
    previous: typeof asset.title;
    title: string;
  } | null>(null);
  if (savedName && savedName.previous !== asset.title) setSavedName(null);
  const title =
    savedName && savedName.previous === asset.title
      ? savedName.title
      : (asset.title ?? "");
  const update = useMutation({
    mutationFn: async (nextTitle: string) => {
      const result = await apiPatch<{
        image?: { title: string | null };
        video?: { title: string | null };
      }>(
        `/api/v1/workspace/${encodeURIComponent(workspaceSlug)}/assets/${encodeURIComponent(asset.id)}/${asset.type}`,
        { title: nextTitle || null },
      );
      return (result.image ?? result.video)!.title;
    },
    onSuccess: async (savedTitle) => {
      setSavedName({ previous: asset.title, title: savedTitle ?? "" });
      onSaved?.(savedTitle);
      await queryClient.invalidateQueries({
        predicate: ({ queryKey }) => queryKey.includes(workspaceSlug),
      });
    },
    onError: (error) =>
      toast.error(
        getUserFacingApiErrorMessage(error, "Unable to rename asset."),
      ),
  });
  return (
    <InlineAssetTitle
      value={title}
      fallback={asset.type === "image" ? "Untitled image" : "Untitled video"}
      onSave={(value) => update.mutate(value)}
      disabled={update.isPending}
      titleClassName="[font:inherit]"
    />
  );
}
