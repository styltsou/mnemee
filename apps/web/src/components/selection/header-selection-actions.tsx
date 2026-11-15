import { useState } from "react";
import { useBulkDelete } from "@/api/collection";
import { MoveToDialog } from "@/components/move-to-dialog";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import { useTransientStore } from "@/store";

export function HeaderSelectionActions({
  scopeKey,
  surface,
  selectedIds,
  workspaceSlug,
  collectionSlug,
  folderPath,
  onMoved,
}: {
  scopeKey: string;
  surface: "grid" | "inbox";
  selectedIds: string[];
  workspaceSlug: string;
  collectionSlug?: string;
  folderPath?: string;
  onMoved?: (movedIds: readonly string[]) => void;
}) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const clearSelection = useTransientStore((state) => state.clearSelection);
  const bulkDelete = useBulkDelete(workspaceSlug);
  const handleMoved = onMoved ?? (() => clearSelection(scopeKey));

  return (
    <>
      <SelectionActionBar
        count={selectedIds.length}
        surface={surface}
        variant="header"
        onClear={() => clearSelection(scopeKey)}
        onMove={() => setMoveDialogOpen(true)}
        onDelete={() => {
          bulkDelete.mutate(
            collectionSlug
              ? { nodeIds: selectedIds, collectionSlug }
              : { nodeIds: selectedIds },
            { onSuccess: () => clearSelection(scopeKey) },
          );
        }}
      />
      <MoveToDialog
        open={moveDialogOpen && selectedIds.length > 0}
        onOpenChange={setMoveDialogOpen}
        source={
          collectionSlug
            ? {
                workspaceSlug,
                sourceCollectionSlug: collectionSlug,
                sourceFolderPath: folderPath,
                nodeIds: selectedIds,
              }
            : { workspaceSlug, nodeIds: selectedIds }
        }
        onMoved={handleMoved}
      />
    </>
  );
}
