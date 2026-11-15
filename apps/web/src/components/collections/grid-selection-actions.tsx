import { useState } from "react";
import { useBulkDelete } from "@/api/collection";
import { MoveToDialog } from "@/components/move-to-dialog";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import { useTransientStore } from "@/store";

export function GridSelectionActions({
  boardKey,
  workspaceSlug,
  collectionSlug,
  folderPath,
  selectedIds,
}: {
  boardKey: string;
  workspaceSlug: string;
  collectionSlug: string;
  folderPath?: string;
  selectedIds: string[];
}) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const clearSelection = useTransientStore((state) => state.clearSelection);
  const bulkDelete = useBulkDelete(workspaceSlug);

  return (
    <>
      <SelectionActionBar
        count={selectedIds.length}
        surface="grid"
        variant="header"
        onClear={() => clearSelection(boardKey)}
        onMove={() => setMoveDialogOpen(true)}
        onDelete={() => {
          bulkDelete.mutate(
            { nodeIds: selectedIds, collectionSlug },
            { onSuccess: () => clearSelection(boardKey) },
          );
        }}
      />
      <MoveToDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        source={{
          workspaceSlug,
          sourceCollectionSlug: collectionSlug,
          sourceFolderPath: folderPath,
          nodeIds: selectedIds,
        }}
        onMoved={() => clearSelection(boardKey)}
      />
    </>
  );
}
