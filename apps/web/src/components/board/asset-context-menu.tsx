import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  useDeleteAsset,
  useDeleteCollectionNode,
  useFlattenFolder,
  useUpdateNote,
} from "@/api/collection";
import type { AssetLocation } from "@/api/collection";
import { fetchAssetImageBlob } from "@/api/collection/fetchers";
import type {
  Asset,
  ColorAsset,
  ImageAsset,
  NoteAsset,
  VideoAsset,
} from "@/types/asset";
import type { LinkAsset } from "@/types/asset";
import { useRefreshLink } from "@/api/url-unfurl";
import {
  MoveToDialog,
  type MoveToDialogSource,
} from "@/components/move-to-dialog";
import { copyImageToClipboard } from "@/lib/clipboard";
import { parseFrontMatter } from "@/lib/front-matter";
import { composeCopiedNoteMarkdown } from "@/lib/note-copy";
import { resolveGradientCss } from "@/lib/color-gradient";
import { ColorEditorDialog } from "@/components/app-shell/color-editor-dialog";
import {
  useWorkspacePeek,
  type PeekColorScope,
} from "@/components/app-shell/workspace-peek";
import { useRouterState } from "@tanstack/react-router";
import { getPexelsBrowserScope, useSessionStore } from "@/store";
import { useIsMobile } from "@/hooks/use-mobile";
import { downloadAssetOriginal } from "@/lib/asset-download";
import { clearDeletedNoteDrafts } from "@/lib/note-edit-draft";
import { getPlatformAlt } from "@/lib/platform";
import {
  isDeleteShortcut,
  isDeleteSurfaceBlocked,
} from "@/lib/delete-shortcut";
import { isPersistedSelectableAsset, makeInboxKey } from "@/lib/selection";
import { useTransientStore } from "@/store";
import { isMoveShortcut } from "@/lib/move-shortcut";
import { isRenameShortcut } from "@/lib/rename-shortcut";
import { isPeekAssetPaneActive } from "@/lib/asset-pane-focus";
import { makeBoardKey } from "@/components/canvas/canvas-key";
import { RenameFolderDialog } from "./rename-folder-dialog";
import { RenameColorDialog } from "./rename-color-dialog";

function PeekShortcut() {
  return (
    <ContextMenuShortcut className="pl-2">
      {getPlatformAlt()}+Click
    </ContextMenuShortcut>
  );
}

type ImagePrefetch = {
  controller: AbortController;
  claimedByCopy: boolean;
  result: Promise<{ blob: Blob } | { error: unknown }>;
};

async function fetchImageFromUrl(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Unable to download the original image.");
  }
  return response.blob();
}

async function copyImage(loadImageBlob: () => Promise<Blob>) {
  try {
    await copyImageToClipboard(loadImageBlob);
    toast.success("Copied image.");
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Unable to copy image.",
    );
  }
}

function imageActions(
  asset: ImageAsset,
  onCopy: () => void,
  onPeek?: () => void,
) {
  return (
    <>
      {asset.sourceUrl ? (
        <ContextMenuItem
          onClick={() =>
            window.open(asset.sourceUrl, "_blank", "noopener,noreferrer")
          }
        >
          Open original
        </ContextMenuItem>
      ) : null}
      <ContextMenuItem onClick={onCopy}>Copy image</ContextMenuItem>
      {onPeek ? (
        <ContextMenuItem onClick={onPeek}>
          Peek image <PeekShortcut />
        </ContextMenuItem>
      ) : null}
    </>
  );
}

async function copyText(asset: NoteAsset) {
  await navigator.clipboard.writeText(
    composeCopiedNoteMarkdown(
      asset.content,
      parseFrontMatter(asset.content).body,
      asset.title,
    ),
  );
  toast.success("Copied note markdown.");
}

function noteActions(asset: NoteAsset, onPeek?: () => void) {
  return (
    <>
      <ContextMenuItem onClick={() => void copyText(asset)}>
        Copy markdown
      </ContextMenuItem>
      <ContextMenuItem onClick={onPeek}>
        Peek note <PeekShortcut />
      </ContextMenuItem>
    </>
  );
}

function colorActions(
  asset: ColorAsset,
  onEdit: () => void,
  onPeek?: () => void,
) {
  const copiedValue = asset.gradient
    ? resolveGradientCss(asset.gradient)
    : (asset.hex ?? "");
  const copyLabel = asset.gradient ? "Copy CSS" : "Copy hex";

  return (
    <>
      <ContextMenuItem
        onClick={() => {
          void navigator.clipboard
            .writeText(copiedValue)
            .then(() =>
              toast.success(
                asset.gradient ? "Copied CSS gradient." : "Copied color.",
              ),
            )
            .catch((error: unknown) =>
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Unable to copy color.",
              ),
            );
        }}
      >
        {copyLabel}
      </ContextMenuItem>
      <ContextMenuItem onClick={onEdit}>Edit color</ContextMenuItem>
      <ContextMenuItem onClick={onPeek}>
        Peek color <PeekShortcut />
      </ContextMenuItem>
    </>
  );
}

export function shouldShowLinkPreviewRefresh(asset: LinkAsset): boolean {
  const active =
    asset.resolutionStatus === "queued" ||
    asset.resolutionStatus === "resolving";
  const blocked =
    asset.failureCategory === "credentials" ||
    asset.failureCategory === "sensitive_query";
  return !active && !blocked;
}

function linkActions(
  asset: LinkAsset,
  onPeekVideo?: (asset: LinkAsset) => void,
) {
  return (
    <>
      <ContextMenuItem
        onClick={() =>
          window.open(asset.originalUrl, "_blank", "noopener,noreferrer")
        }
      >
        {asset.video ? "Open on YouTube" : "Open link"}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          void navigator.clipboard
            .writeText(asset.originalUrl)
            .then(() => toast.success("Copied link."));
        }}
      >
        Copy link
      </ContextMenuItem>
      {asset.video && onPeekVideo ? (
        <ContextMenuItem onClick={() => onPeekVideo(asset)}>
          Peek video
          <PeekShortcut />
        </ContextMenuItem>
      ) : null}
    </>
  );
}

export function AssetContextMenu({
  asset,
  children,
  deleteContext,
  inboxContext,
  onOpenImage,
  onOpenVideo,
  dismissVersion,
  canvasBoardKey,
  onBeforeDelete,
}: {
  asset: Asset;
  children: (isContextMenuOpen: boolean, asset: Asset) => React.ReactNode;
  deleteContext?: {
    workspaceSlug: string;
    collectionSlug: string;
    folderPath?: string;
    expectedParentFolderNodeId: string | null;
  };
  inboxContext?: {
    workspaceSlug: string;
  };
  onOpenImage?: (asset: ImageAsset) => void;
  onOpenVideo?: (asset: LinkAsset | VideoAsset) => void;
  /** Canvas viewport version that should close an open context menu. */
  dismissVersion?: number;
  /** Marks this portaled menu as belonging to a specific canvas. */
  canvasBoardKey?: string;
  /** Lets a canvas retain a visual card briefly during optimistic deletion. */
  onBeforeDelete?: () => void;
}) {
  const { peekNote, peekImage, peekColor, peekVideo } = useWorkspacePeek();
  const isMobile = useIsMobile();
  const setPexelsBrowserOpen = useSessionStore(
    (state) => state.setPexelsBrowserOpen,
  );
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const workspaceSlug =
    inboxContext?.workspaceSlug ?? deleteContext?.workspaceSlug;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const selectedRenamable = useTransientStore(
    (state) =>
      ((asset.type === "folder" && !!deleteContext) ||
        asset.type === "color") &&
      !!workspaceSlug &&
      state.selection.scopeKey ===
        (deleteContext
          ? makeBoardKey(
              deleteContext.workspaceSlug,
              deleteContext.collectionSlug,
              deleteContext.folderPath,
            )
          : makeInboxKey(workspaceSlug!)) &&
      state.selection.nodeIds.length === 1 &&
      state.selection.nodeIds[0] === asset.id,
  );
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [colorEditorOpen, setColorEditorOpen] = useState(false);
  const [colorPreview, setColorPreview] = useState<Pick<
    ColorAsset,
    "hex" | "gradient"
  > | null>(null);
  const imagePrefetchRef = useRef<ImagePrefetch | undefined>(undefined);
  const contextMenuActionsRef = useRef<{
    close: () => void;
    unmount: () => void;
  } | null>(null);
  const previousDismissVersionRef = useRef(dismissVersion);
  const isFavorite = asset.isFavorite ?? false;
  const showRefreshPreview =
    asset.type === "link" && shouldShowLinkPreviewRefresh(asset);
  const displayAsset: Asset =
    asset.type === "color" && colorPreview
      ? { ...asset, ...colorPreview }
      : asset;
  const removeNode = useDeleteCollectionNode(
    deleteContext?.workspaceSlug ?? "",
    deleteContext?.collectionSlug ?? "",
    deleteContext?.folderPath,
  );
  const deleteAsset = useDeleteAsset(
    inboxContext?.workspaceSlug ?? deleteContext?.workspaceSlug ?? "",
  );
  const flattenFolder = useFlattenFolder(
    deleteContext?.workspaceSlug ?? "",
    deleteContext?.collectionSlug ?? "",
  );
  const refreshLink = useRefreshLink(workspaceSlug ?? "");
  const updateNote = useUpdateNote(workspaceSlug ?? "");
  const moveSource: MoveToDialogSource | undefined = deleteContext
    ? {
        workspaceSlug: deleteContext.workspaceSlug,
        sourceCollectionSlug: deleteContext.collectionSlug,
        sourceFolderPath: deleteContext.folderPath,
        nodeIds: [asset.id],
      }
    : inboxContext
      ? {
          workspaceSlug: inboxContext.workspaceSlug,
          nodeIds: [asset.id],
        }
      : undefined;
  const peekScope: PeekColorScope = (() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[1] !== "collections" || !segments[2]) return { type: "inbox" };
    const [collectionSlug, ...folders] = segments.slice(2);
    return {
      type: "collection",
      collectionSlug,
      folderPath: folders.join("/") || undefined,
      includeDescendants: false,
    };
  })();
  const peekLocation: AssetLocation = deleteContext
    ? {
        type: "collection",
        collectionSlug: deleteContext.collectionSlug,
        folderPath: deleteContext.folderPath,
      }
    : inboxContext
      ? { type: "inbox" }
      : peekScope.type === "inbox"
        ? { type: "inbox" }
        : {
            type: "collection",
            collectionSlug: peekScope.collectionSlug,
            folderPath: peekScope.folderPath,
          };
  const closePexels = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[1] === "collections" && segments[0] && segments[2]) {
      setPexelsBrowserOpen(
        getPexelsBrowserScope(segments[0], segments[2]),
        false,
      );
    }
  };

  function openPeek(): boolean {
    if (asset.type === "note") {
      closePexels();
      void peekNote(asset, peekLocation);
      return true;
    }
    if (asset.type === "color") {
      closePexels();
      void peekColor(displayAsset as ColorAsset, peekScope);
      return true;
    }
    if (asset.type === "image" && !asset.uploadStatus) {
      closePexels();
      if (isMobile) onOpenImage?.(asset);
      else void peekImage(asset, peekLocation);
      return true;
    }
    if (asset.type === "link" && asset.video && onOpenVideo) {
      closePexels();
      if (isMobile) onOpenVideo(asset);
      else void peekVideo(asset, peekLocation);
      return true;
    }
    return false;
  }

  useEffect(() => {
    return () => {
      imagePrefetchRef.current?.controller.abort();
      imagePrefetchRef.current = undefined;
    };
    // Re-runs when asset.id, workspaceSlug change; they are not read inside the effect.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [asset.id, workspaceSlug]);

  useEffect(() => {
    if (
      dismissVersion === undefined ||
      previousDismissVersionRef.current === dismissVersion
    ) {
      return;
    }
    previousDismissVersionRef.current = dismissVersion;
    contextMenuActionsRef.current?.close();
  }, [dismissVersion]);

  useEffect(() => {
    if (!selectedRenamable) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !isRenameShortcut(event) ||
        isDeleteSurfaceBlocked(event.target, "board") ||
        isPeekAssetPaneActive()
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setRenameDialogOpen(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRenamable]);

  function cancelImagePrefetch() {
    const prefetch = imagePrefetchRef.current;
    if (!prefetch || prefetch.claimedByCopy) return;

    prefetch.controller.abort();
    imagePrefetchRef.current = undefined;
  }

  function startImagePrefetch() {
    cancelImagePrefetch();
    if (asset.type !== "image" || asset.uploadStatus || !workspaceSlug) return;

    const controller = new AbortController();
    imagePrefetchRef.current = {
      controller,
      claimedByCopy: false,
      // Resolve errors into data so an aborted, unused prefetch never creates
      // an unhandled promise rejection.
      result: fetchAssetImageBlob(
        workspaceSlug,
        asset.id,
        controller.signal,
      ).then(
        (blob) => ({ blob }),
        (error: unknown) => ({ error }),
      ),
    };
  }

  function handleContextMenuOpenChange(open: boolean) {
    if (open) {
      startImagePrefetch();
    } else {
      cancelImagePrefetch();
    }
  }

  function handleCopyImage() {
    if (asset.type !== "image") return;

    const prefetch = imagePrefetchRef.current;
    if (prefetch) prefetch.claimedByCopy = true;

    const loadImageBlob = prefetch
      ? async () => {
          const result = await prefetch.result;
          if ("blob" in result) return result.blob;
          throw result.error;
        }
      : workspaceSlug && !asset.uploadStatus
        ? () => fetchAssetImageBlob(workspaceSlug, asset.id)
        : () =>
            fetchImageFromUrl(
              asset.localPreviewUrl ?? asset.originalUrl ?? asset.url,
            );

    void copyImage(loadImageBlob).finally(() => {
      if (imagePrefetchRef.current === prefetch) {
        imagePrefetchRef.current = undefined;
      }
    });
  }

  function handleDelete() {
    setDeleteDialogOpen(false);
    onBeforeDelete?.();
    if (asset.type === "folder") {
      removeNode.mutate(asset.id, {
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Unable to delete asset.",
          );
        },
      });
    } else {
      deleteAsset.mutate(asset.id, {
        onSuccess: () => {
          if (asset.type === "note") clearDeletedNoteDrafts(asset.id);
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Unable to delete asset.",
          );
        },
      });
    }
  }

  function handleFlatten() {
    flattenFolder.mutate(asset.id, {
      onSuccess: (result) => {
        toast.success(
          result.directChildCount === 0
            ? "Empty folder removed."
            : `Flattened ${result.directChildCount} direct ${result.directChildCount === 1 ? "item" : "items"} to the right of this canvas.`,
        );
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Unable to flatten folder.",
        );
      },
    });
  }

  function handleRefreshPreview() {
    refreshLink.mutate(asset.id, {
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Unable to refresh link.",
        );
      },
    });
  }

  return (
    <>
      {asset.type === "folder" && deleteContext ? (
        <RenameFolderDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          folder={asset}
          workspaceSlug={deleteContext.workspaceSlug}
          collectionSlug={deleteContext.collectionSlug}
        />
      ) : null}
      {asset.type === "color" && workspaceSlug ? (
        <RenameColorDialog
          color={asset}
          workspaceSlug={workspaceSlug}
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
        />
      ) : null}
      <ContextMenu
        actionsRef={contextMenuActionsRef}
        onOpenChange={handleContextMenuOpenChange}
      >
        <ContextMenuTrigger
          onKeyDown={(event) => {
            if (
              event.currentTarget.contains(event.target as Node) &&
              isRenameShortcut(event.nativeEvent) &&
              ((asset.type === "folder" && deleteContext) ||
                asset.type === "color") &&
              workspaceSlug &&
              isPersistedSelectableAsset(asset) &&
              !isDeleteSurfaceBlocked(event.target, "board") &&
              useTransientStore.getState().selection.nodeIds.length === 0
            ) {
              event.preventDefault();
              event.stopPropagation();
              setRenameDialogOpen(true);
              return;
            }
            if (
              event.currentTarget.contains(event.target as Node) &&
              isMoveShortcut(event.nativeEvent) &&
              moveSource &&
              isPersistedSelectableAsset(asset) &&
              !isDeleteSurfaceBlocked(event.target, "board") &&
              useTransientStore.getState().selection.nodeIds.length === 0
            ) {
              event.preventDefault();
              event.stopPropagation();
              setMoveDialogOpen(true);
              return;
            }
            if (
              !(event.target instanceof Node) ||
              !event.currentTarget.contains(event.target) ||
              !isDeleteShortcut(event.nativeEvent)
            )
              return;
            if (
              !workspaceSlug ||
              !isPersistedSelectableAsset(asset) ||
              isDeleteSurfaceBlocked(event.target, "board")
            )
              return;
            // The board owns deletion when a selection is active.
            if (useTransientStore.getState().selection.nodeIds.length > 0)
              return;
            event.preventDefault();
            event.stopPropagation();
            setDeleteDialogOpen(true);
          }}
          render={(triggerProps, state) => (
            <div
              {...triggerProps}
              className={triggerProps.className}
              onClickCapture={(event) => {
                if (
                  !event.altKey ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey ||
                  event.button !== 0 ||
                  !(event.target instanceof Element) ||
                  !event.currentTarget.contains(event.target)
                )
                  return;
                const control = event.target.closest(
                  "button, a, input, textarea, select, [contenteditable='true']",
                );
                if (
                  control &&
                  !(
                    asset.type === "color" &&
                    control instanceof HTMLButtonElement &&
                    control.getAttribute("aria-label")?.startsWith("Open ")
                  )
                )
                  return;
                if (!openPeek()) return;
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              {children(state.open, displayAsset)}
            </div>
          )}
        />
        <ContextMenuContent
          data-canvas-menu={canvasBoardKey}
          onKeyDown={(event) => {
            const selection = useTransientStore.getState().selection.nodeIds;
            if (
              isRenameShortcut(event.nativeEvent) &&
              ((asset.type === "folder" && deleteContext) ||
                asset.type === "color") &&
              workspaceSlug &&
              isPersistedSelectableAsset(asset) &&
              (selection.length === 0 ||
                (selection.length === 1 && selection[0] === asset.id))
            ) {
              event.preventDefault();
              event.stopPropagation();
              contextMenuActionsRef.current?.close();
              setRenameDialogOpen(true);
              return;
            }
            if (
              isMoveShortcut(event.nativeEvent) &&
              moveSource &&
              isPersistedSelectableAsset(asset)
            ) {
              event.preventDefault();
              event.stopPropagation();
              contextMenuActionsRef.current?.close();
              setMoveDialogOpen(true);
              return;
            }
            if (
              !isDeleteShortcut(event.nativeEvent) ||
              !isPersistedSelectableAsset(asset)
            )
              return;
            event.preventDefault();
            event.stopPropagation();
            contextMenuActionsRef.current?.close();
            setDeleteDialogOpen(true);
          }}
        >
          {asset.type === "folder" ? (
            <>
              {deleteContext && isPersistedSelectableAsset(asset) ? (
                <ContextMenuItem onClick={() => setRenameDialogOpen(true)}>
                  Rename folder <ContextMenuShortcut>R</ContextMenuShortcut>
                </ContextMenuItem>
              ) : null}
              {deleteContext ? (
                <ContextMenuItem onClick={handleFlatten}>
                  Flatten folder
                </ContextMenuItem>
              ) : null}
              <ContextMenuSeparator />
              <ContextMenuItem>
                {isFavorite ? "Remove from favorites" : "Add to favorites"}
              </ContextMenuItem>
              {moveSource ? (
                <ContextMenuItem onClick={() => setMoveDialogOpen(true)}>
                  Move to... <ContextMenuShortcut>M</ContextMenuShortcut>
                </ContextMenuItem>
              ) : null}
            </>
          ) : asset.type === "color" ? (
            <>
              <ContextMenuItem onClick={() => setRenameDialogOpen(true)}>
                Rename color <ContextMenuShortcut>R</ContextMenuShortcut>
              </ContextMenuItem>
              {colorActions(
                asset,
                () => setColorEditorOpen(true),
                () => {
                  openPeek();
                },
              )}
              <ContextMenuSeparator />
              <ContextMenuItem>
                {isFavorite ? "Remove from favorites" : "Add to favorites"}
              </ContextMenuItem>
              {moveSource ? (
                <ContextMenuItem onClick={() => setMoveDialogOpen(true)}>
                  Move to... <ContextMenuShortcut>M</ContextMenuShortcut>
                </ContextMenuItem>
              ) : null}
            </>
          ) : (
            <>
              {asset.type === "image" ? (
                imageActions(
                  asset,
                  handleCopyImage,
                  asset.uploadStatus
                    ? undefined
                    : () => {
                        openPeek();
                      },
                )
              ) : asset.type === "note" ? (
                <>
                  <ContextMenuItem
                    onClick={() =>
                      updateNote.mutate({
                        assetId: asset.id,
                        isExpanded: !asset.isExpanded,
                      })
                    }
                  >
                    {asset.isExpanded ? "Collapse note" : "Expand note"}
                  </ContextMenuItem>
                  {noteActions(asset, () => {
                    openPeek();
                  })}
                </>
              ) : asset.type === "link" ? (
                linkActions(
                  asset,
                  onOpenVideo
                    ? () => {
                        openPeek();
                      }
                    : undefined,
                )
              ) : asset.type === "video" ? (
                <>
                  <ContextMenuItem onClick={() => onOpenVideo?.(asset)}>
                    Open video
                  </ContextMenuItem>
                  {asset.url && workspaceSlug ? (
                    <ContextMenuItem
                      onClick={() =>
                        void downloadAssetOriginal(workspaceSlug, asset)
                      }
                    >
                      Download original
                    </ContextMenuItem>
                  ) : null}
                </>
              ) : null}
              <ContextMenuSeparator />
              <ContextMenuItem>
                {isFavorite ? "Remove from favorites" : "Add to favorites"}
              </ContextMenuItem>
              {moveSource ? (
                <ContextMenuItem onClick={() => setMoveDialogOpen(true)}>
                  Move to... <ContextMenuShortcut>M</ContextMenuShortcut>
                </ContextMenuItem>
              ) : null}
              {showRefreshPreview ? (
                <ContextMenuItem onClick={handleRefreshPreview}>
                  Refresh preview
                </ContextMenuItem>
              ) : null}
            </>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-red-600! hover:bg-red-500/20! focus:bg-red-500/20! data-highlighted:bg-red-500/20! dark:text-red-400! dark:hover:bg-red-500/30! dark:focus:bg-red-500/30! dark:data-highlighted:bg-red-500/30!"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
            <ContextMenuShortcut>Del</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogBody>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {asset.type === "folder" ? "Delete folder" : "Delete asset"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {asset.type === "folder"
                  ? "This permanently deletes the folder and all its contents. This action cannot be undone."
                  : asset.type === "note"
                    ? "This permanently deletes the note and any unsaved changes. This action cannot be undone."
                    : "Are you sure you want to delete this asset? This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </AlertDialogBody>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MoveToDialog
        open={moveDialogOpen && moveSource !== undefined}
        onOpenChange={setMoveDialogOpen}
        source={moveSource ?? { workspaceSlug: "", nodeIds: [] }}
      />
      {asset.type === "color" && workspaceSlug ? (
        <ColorEditorDialog
          workspaceSlug={workspaceSlug}
          collectionPath={
            deleteContext
              ? [deleteContext.collectionSlug, deleteContext.folderPath]
                  .filter(Boolean)
                  .join("/")
              : undefined
          }
          target={inboxContext ? "inbox" : "collection"}
          color={asset}
          open={colorEditorOpen}
          onOpenChange={setColorEditorOpen}
          onPreviewChange={setColorPreview}
        />
      ) : null}
    </>
  );
}
