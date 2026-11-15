import { useLayoutEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";

import { useCreateInboxNote } from "@/api/collection";
import { getUserFacingApiErrorMessage } from "@/lib/api";
import { KbdGroup } from "@/components/ui/kbd";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ShortcutKey } from "@/components/ui/shortcut-key";
import {
  isNoteContentTooLong,
  NOTE_CONTENT_LIMIT_MESSAGE,
} from "@/lib/note-content";
import { useTransientStore } from "@/store";

export function GlobalScratchpad() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const workspaceSlug = pathname.split("/")[1] || "";
  const createInboxNote = useCreateInboxNote(workspaceSlug);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const open = useTransientStore((state) => state.scratchpadOpen);
  const closeScratchpadState = useTransientStore(
    (state) => state.closeScratchpad,
  );
  const [content, setContent] = useState("");
  const trimmedContent = content.trim();
  const canSave = trimmedContent.length > 0 && !createInboxNote.isPending;

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const input = inputRef.current;
    if (!input) {
      return;
    }

    input.focus();
    input.style.height = "0px";
    input.style.height = `${input.scrollHeight}px`;
    // Re-runs when content changes; it is not read inside the effect.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [content, open]);

  function closeScratchpad() {
    closeScratchpadState();
    setContent("");
    createInboxNote.reset();
  }

  function handleSave() {
    if (!canSave) {
      return;
    }

    const noteContent = trimmedContent;
    if (isNoteContentTooLong(noteContent)) {
      toast.error(NOTE_CONTENT_LIMIT_MESSAGE);
      return;
    }
    const toastId = toast.success("Saved to Inbox.");
    void createInboxNote.mutateAsync({ content: noteContent }).catch((err) => {
      toast.dismiss(toastId);
      toast.error(getUserFacingApiErrorMessage(err, "Unable to save note."), {
        action: {
          label: "Copy draft",
          onClick: () => {
            void navigator.clipboard
              .writeText(noteContent)
              .then(() => toast.success("Draft copied."))
              .catch(() => toast.error("Could not copy draft."));
          },
        },
      });
    });
    closeScratchpad();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeScratchpad()}>
      <DialogContent
        className="z-[120] w-[calc(100%-1.5rem)] max-w-md text-foreground"
        overlayClassName="z-[120]"
        showCloseButton={false}
        initialFocus={inputRef}
      >
        <DialogTitle className="sr-only">Scratchpad</DialogTitle>
        <div className="relative z-10 rounded-b-lg border-b border-foreground/10 bg-background">
          <textarea
            ref={inputRef}
            rows={1}
            spellCheck={false}
            className="block max-h-40 min-h-16 w-full resize-none overflow-y-auto rounded-md border-0 bg-transparent px-3 py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground disabled:opacity-50"
            disabled={createInboxNote.isPending}
            placeholder="Capture to Inbox..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              const isSaveKey =
                event.key === "Enter" &&
                (!event.shiftKey || event.metaKey || event.ctrlKey) &&
                !event.nativeEvent.isComposing;

              if (isSaveKey) {
                event.preventDefault();
                handleSave();
              }
            }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 px-3 py-2 text-[11px] leading-4 text-muted-foreground">
          <span className="mr-auto inline-flex items-center gap-1">
            <ShortcutKey>Esc</ShortcutKey>
            <span>to close</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <KbdGroup className="gap-0.5">
              <ShortcutKey>Shift</ShortcutKey>
              <span>+</span>
              <ShortcutKey>Enter</ShortcutKey>
            </KbdGroup>
            <span>for new line</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <ShortcutKey>Enter</ShortcutKey>
            <span>to save</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
