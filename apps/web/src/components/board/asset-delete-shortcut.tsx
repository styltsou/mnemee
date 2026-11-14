import { useState } from "react";
import { toast } from "sonner";
import { useDeleteAsset } from "@/api/collection";
import { useDeleteShortcut } from "@/hooks/use-delete-shortcut";
import { clearDeletedNoteDrafts } from "@/lib/note-edit-draft";
import type { Asset } from "@/types/asset";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AssetDeleteShortcut({
  workspaceSlug,
  asset,
  enabled,
  ownsFocus,
  onDeleted,
}: {
  workspaceSlug: string;
  asset?: Asset;
  enabled: boolean;
  ownsFocus: () => boolean;
  onDeleted: () => void;
}) {
  const [target, setTarget] = useState<Asset | null>(null);
  const deletion = useDeleteAsset(workspaceSlug);
  useDeleteShortcut({
    enabled: enabled && Boolean(asset) && !target && !deletion.isPending,
    surface: "asset",
    ownsFocus,
    onDelete: () => {
      if (asset) setTarget(asset);
    },
  });
  const title = target?.type === "folder" ? target.name : target?.title;
  return (
    <AlertDialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open && !deletion.isPending) setTarget(null);
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogBody>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {target?.type === "note" ? "note" : "asset"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{" "}
              {title ? (
                <strong>{title}</strong>
              ) : target?.type === "note" ? (
                "this note"
              ) : (
                "this asset"
              )}
              {target?.type === "note" ? " and any unsaved changes" : ""}. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogBody>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletion.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deletion.isPending || !target}
            onClick={async () => {
              if (!target) return;
              try {
                await deletion.mutateAsync(target.id);
              } catch {
                toast.error("Could not delete this asset. Please try again.");
                return;
              }
              if (target.type === "note") clearDeletedNoteDrafts(target.id);
              setTarget(null);
              onDeleted();
            }}
          >
            {deletion.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
