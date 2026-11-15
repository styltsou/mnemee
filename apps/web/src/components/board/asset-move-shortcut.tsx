import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AssetLocation } from "@/api/collection";
import type { Asset } from "@/types/asset";
import {
  MoveToDialog,
  type MoveToDialogSource,
} from "@/components/move-to-dialog";
import { useMoveShortcut } from "@/hooks/use-move-shortcut";
import { isPersistedSelectableAsset } from "@/lib/selection";

export function AssetMoveShortcut({
  workspaceSlug,
  asset,
  location,
  enabled,
  ownsFocus,
  onMoved,
}: {
  workspaceSlug: string;
  asset?: Asset;
  location?: AssetLocation;
  enabled: boolean;
  ownsFocus: () => boolean;
  onMoved?: () => void;
}) {
  const [source, setSource] = useState<MoveToDialogSource>();
  const queryClient = useQueryClient();
  useMoveShortcut({
    enabled:
      enabled &&
      !!asset &&
      !!location &&
      isPersistedSelectableAsset(asset) &&
      !source,
    surface: "asset",
    ownsFocus,
    onMove: () => {
      if (!asset || !location) return;
      setSource(
        location.type === "collection"
          ? {
              workspaceSlug,
              nodeIds: [asset.id],
              sourceCollectionSlug: location.collectionSlug,
              sourceFolderPath: location.folderPath,
            }
          : { workspaceSlug, nodeIds: [asset.id] },
      );
    },
  });
  return (
    <MoveToDialog
      open={!!source}
      onOpenChange={(open) => {
        if (!open) setSource(undefined);
      }}
      source={source ?? { workspaceSlug, nodeIds: [] }}
      onMoved={(ids) => {
        if (asset && ids.includes(asset.id)) {
          void queryClient.invalidateQueries({
            queryKey: ["workspace-asset", workspaceSlug, asset.id],
          });
          onMoved?.();
        }
      }}
    />
  );
}
