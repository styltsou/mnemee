import { useEffect, useState, type FormEvent } from "react";

import { useRenameFolder } from "@/api/collection";
import { getUserFacingApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function RenameFolderDialog({
  open,
  onOpenChange,
  folder,
  collectionSlug,
  workspaceSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: { name: string; id: string };
  collectionSlug: string;
  workspaceSlug: string;
}) {
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState<string | null>(null);
  const renameFolder = useRenameFolder(workspaceSlug, collectionSlug);

  useEffect(() => {
    if (open) {
      setName(folder.name);
      setError(null);
    }
  }, [open, folder.name]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    if (nextName === folder.name) {
      onOpenChange(false);
      return;
    }

    setError(null);
    try {
      await renameFolder.mutateAsync({
        nodeId: folder.id,
        name: nextName,
      });
      onOpenChange(false);
    } catch (cause) {
      setError(getUserFacingApiErrorMessage(cause, "Unable to rename folder."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form className="contents" onSubmit={handleSubmit}>
          <DialogBody className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Rename folder</DialogTitle>
              <DialogDescription>
                Change the name shown in this workspace.
              </DialogDescription>
            </DialogHeader>
            <Input
              aria-label="Folder name"
              autoComplete="off"
              // Deliberate: focus the field as soon as this opens.
              // oxlint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              maxLength={255}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button
              pending={renameFolder.isPending}
              disabled={renameFolder.isPending || !name.trim()}
              type="submit"
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
