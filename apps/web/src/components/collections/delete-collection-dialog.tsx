import { useDeleteCollection } from "@/api/collection";
import { useNavigate, useRouterState } from "@tanstack/react-router";
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

export function DeleteCollectionDialog({
  workspaceSlug,
  collection,
  open,
  onOpenChange,
}: {
  workspaceSlug: string;
  collection: { slug: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deletion = useDeleteCollection(workspaceSlug);
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!deletion.isPending) onOpenChange(next);
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogBody>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <strong>{collection.name}</strong> and
              all its contents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogBody>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletion.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deletion.isPending}
            onClick={() => {
              deletion.mutate(collection.slug);
              onOpenChange(false);
              const collectionPath = `/${workspaceSlug}/collections/${collection.slug}`;
              if (
                pathname === collectionPath ||
                pathname.startsWith(`${collectionPath}/`)
              ) {
                void navigate({
                  to: "/$workspaceSlug",
                  params: { workspaceSlug },
                });
              }
            }}
          >
            {deletion.isPending ? "Deleting…" : "Delete collection"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
