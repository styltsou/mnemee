import { useState, type FormEvent } from "react";
import { useUpdateColor } from "@/api/collection";
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
import type { ColorAsset } from "@/types/asset";

export function RenameColorDialog({
  color,
  workspaceSlug,
  open,
  onOpenChange,
}: {
  color: ColorAsset;
  workspaceSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const title = draftTitle ?? color.title ?? "";
  const [error, setError] = useState<string | null>(null);
  const updateColor = useUpdateColor(workspaceSlug);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setDraftTitle(null);
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (nextTitle === (color.title ?? "")) {
      handleOpenChange(false);
      return;
    }
    setError(null);
    try {
      await updateColor.mutateAsync({
        assetId: color.id,
        title: nextTitle || null,
      });
      handleOpenChange(false);
    } catch (cause) {
      setError(getUserFacingApiErrorMessage(cause, "Unable to rename color."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form className="contents" onSubmit={handleSubmit}>
          <DialogBody className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Rename color</DialogTitle>
              <DialogDescription>
                Clear the title to use an automatic color name.
              </DialogDescription>
            </DialogHeader>
            <Input
              aria-label="Color name"
              autoComplete="off"
              // Focus the name when the rename dialog opens.
              // oxlint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              maxLength={255}
              value={title}
              onChange={(event) => setDraftTitle(event.target.value)}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={updateColor.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
