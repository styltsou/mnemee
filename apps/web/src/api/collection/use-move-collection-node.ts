import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { moveCollectionNodesToFolder } from "./fetchers";
import {
  adjustCollectionAssetCount,
  getAssetPreview,
  getMovedFolderPreviews,
  promoteCollectionPreview,
  transitionCachedContentsForMoves,
  updateTargetFolderForMove,
  type CollectionContentsCacheEntry,
} from "./move-cache-transition";
import { collectionQueryKeys } from "./query-keys";
import { invalidateMentionSuggestionQueries } from "@/api/note-mentions/hooks";
import type {
  CollectionContentsResponse,
  CollectionGridResponse,
  CanvasObject,
  CollectionsData,
  InboxContentsResponse,
  InboxGridResponse,
  MoveCollectionNodesToFolderInput,
  MoveCollectionNodesToFolderResponse,
} from "./types";
import type { WorkspaceData } from "@/api/workspace";

type MoveContext =
  | { optimistic: false }
  | {
      optimistic: true;
      previousContents: CollectionContentsCacheEntry[];
      previousGrids: GridCacheEntry[];
      previousInboxContents: InboxCacheEntry[];
      previousCollections: CollectionsData | undefined;
      previousWorkspace: WorkspaceData | undefined;
    };

type GridCacheEntry = [
  readonly unknown[],
  InfiniteData<CollectionGridResponse | InboxGridResponse>,
];
type InboxCacheEntry = [readonly unknown[], InboxContentsResponse];

export function useMoveCollectionNodesToFolder(
  workspaceSlug: string,
  collectionSlug: string,
) {
  const queryClient = useQueryClient();

  return useMutation<
    MoveCollectionNodesToFolderResponse,
    Error,
    MoveCollectionNodesToFolderInput,
    MoveContext
  >({
    scope: { id: `collection-node-move:${workspaceSlug}:${collectionSlug}` },
    mutationFn: async (variables) =>
      moveCollectionNodesToFolder(workspaceSlug, collectionSlug, {
        ...variables,
        sourceFolderPath: variables.sourceFolderPath ?? variables.folderPath,
      }),
    onMutate: async (variables) => {
      const sourceFolderPath =
        variables.sourceFolderPath ?? variables.folderPath;
      const targetScope = collectionQueryKeys.contentScope(
        workspaceSlug,
        collectionSlug,
      );
      const hasSourceCollection = variables.sourceCollectionSlug !== undefined;
      const targetSlug = collectionSlug;
      const sourceSlug = hasSourceCollection
        ? variables.sourceCollectionSlug!
        : collectionSlug;
      // Counts change whenever assets enter this collection from outside it:
      // from another collection, or from Inbox.
      const changeCollectionCount =
        !hasSourceCollection || sourceSlug !== targetSlug;
      // Content transitions only apply when moving within the same collection.
      const sameCollectionMove =
        hasSourceCollection && sourceSlug === targetSlug;
      const crossCollectionMove =
        hasSourceCollection && sourceSlug !== targetSlug;
      const sourceScope = collectionQueryKeys.contentScope(
        workspaceSlug,
        sourceSlug,
      );
      const collectionsKey = collectionQueryKeys.collections(workspaceSlug);
      const sourceGridScope = [
        hasSourceCollection ? "collectionGrid" : "inboxGrid",
        workspaceSlug,
        ...(hasSourceCollection ? [sourceSlug] : []),
      ];
      const targetGridScope = ["collectionGrid", workspaceSlug, collectionSlug];
      const inboxScope = collectionQueryKeys.inbox(workspaceSlug);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: targetScope }),
        queryClient.cancelQueries({ queryKey: collectionsKey }),
        queryClient.cancelQueries({ queryKey: sourceGridScope }),
        queryClient.cancelQueries({ queryKey: targetGridScope }),
        ...(!hasSourceCollection
          ? [queryClient.cancelQueries({ queryKey: inboxScope })]
          : []),
        ...(crossCollectionMove
          ? [queryClient.cancelQueries({ queryKey: sourceScope })]
          : []),
      ]);

      const collectEntries = (scope: readonly unknown[]) =>
        queryClient
          .getQueriesData<CollectionContentsResponse>({ queryKey: scope })
          .filter(
            (entry): entry is CollectionContentsCacheEntry =>
              entry[1] !== undefined,
          );
      const previousContents = collectEntries(targetScope);
      const sourceEntries = crossCollectionMove
        ? collectEntries(sourceScope)
        : [];
      const allEntries = [...previousContents, ...sourceEntries];
      const collectGrids = (scope: readonly unknown[]) =>
        queryClient
          .getQueriesData<
            InfiniteData<CollectionGridResponse | InboxGridResponse>
          >({
            queryKey: scope,
          })
          .filter((entry): entry is GridCacheEntry => entry[1] !== undefined);
      const previousGrids = [
        ...collectGrids(sourceGridScope),
        ...(sameCollectionMove ? [] : collectGrids(targetGridScope)),
      ];
      const previousInboxContents = hasSourceCollection
        ? []
        : queryClient
            .getQueriesData<InboxContentsResponse>({ queryKey: inboxScope })
            .filter(
              (entry): entry is InboxCacheEntry => entry[1] !== undefined,
            );

      const movedNodes = variables.nodeIds.flatMap((nodeId) => {
        const node = [
          ...allEntries.flatMap(([, contents]) => contents.nodes),
          ...previousInboxContents.flatMap(([, contents]) => contents.nodes),
          ...previousGrids.flatMap(([, grid]) =>
            grid.pages.flatMap((page) =>
              "nodes" in page ? page.nodes : [...page.folders, ...page.assets],
            ),
          ),
        ].find((node) => node.id === nodeId);
        return node ? [node] : [];
      });
      const previousCollections =
        queryClient.getQueryData<CollectionsData>(collectionsKey);
      const previousWorkspace = queryClient.getQueryData<WorkspaceData>([
        "workspace",
        workspaceSlug,
      ]);
      let appliedContent = false;
      let appliedCounts = false;

      if (
        variables.targetFolderNodeId &&
        sameCollectionMove &&
        movedNodes.length === variables.nodeIds.length
      ) {
        const sourceEntry = findSourceEntry(
          previousContents,
          sourceFolderPath,
          variables.nodeIds,
          variables.targetFolderNodeId,
        );
        const source = sourceEntry?.[1];
        const targetFolder = source?.nodes.find(
          (node) => node.id === variables.targetFolderNodeId,
        );
        if (source && targetFolder && targetFolder.type === "folder") {
          const movedNodeIds = new Set(variables.nodeIds);
          const targetFolderPath = joinFolderPath(
            sourceFolderPath,
            targetFolder.slug,
          );
          const sourceParentFolderPath = getParentFolderPath(sourceFolderPath);
          const sourceFolderSlug = getCurrentFolderSlug(sourceFolderPath);
          const unfilteredSource = previousContents.find(
            ([key, contents]) =>
              isUnfilteredContentsKey(key) &&
              getFolderPathFromKey(key) === sourceFolderPath &&
              variables.nodeIds.every((nodeId) =>
                contents.nodes.some((node) => node.id === nodeId),
              ),
          );
          const remainingUnfilteredSourceNodes =
            unfilteredSource?.[1].nodes.filter(
              (node) => !movedNodeIds.has(node.id),
            );

          const contentUpdates = transitionCachedContentsForMoves(
            previousContents,
            {
              sourceFolderPath,
              targetFolderPath,
              sourceParentFolderPath,
              sourceFolderSlug,
              targetFolderNodeId: variables.targetFolderNodeId,
              movedNodes,
              remainingUnfilteredSourceNodes,
            },
          );
          for (const [key, contents] of contentUpdates) {
            queryClient.setQueryData<CollectionContentsResponse>(key, contents);
          }
          appliedContent = true;
        }
      }

      const movedIds = new Set(variables.nodeIds);
      const targetFolder = [
        ...allEntries.flatMap(([, contents]) => contents.nodes),
        ...previousGrids.flatMap(([, grid]) =>
          grid.pages.flatMap((page) =>
            "nodes" in page ? page.nodes : page.folders,
          ),
        ),
      ].find(
        (node) =>
          node.id === variables.targetFolderNodeId && node.type === "folder",
      );
      const targetParentPath = variables.targetFolderNodeId
        ? ([...previousContents, ...sourceEntries].find(
            ([key, contents]) =>
              key[2] === collectionSlug &&
              contents.nodes.some(
                (node) => node.id === variables.targetFolderNodeId,
              ),
          )?.[0][3] ??
          previousGrids.find(
            ([key, grid]) =>
              key[0] === "collectionGrid" &&
              key[2] === collectionSlug &&
              grid.pages.some(
                (page) =>
                  "folders" in page &&
                  page.folders.some(
                    (node) => node.id === variables.targetFolderNodeId,
                  ),
              ),
          )?.[0][3])
        : undefined;
      const targetFolderPath =
        targetFolder?.type === "folder"
          ? joinFolderPath(
              typeof targetParentPath === "string"
                ? targetParentPath
                : undefined,
              targetFolder.slug,
            )
          : undefined;
      const assetDelta = movedNodes.reduce(
        (sum, node) => sum + (node.type === "folder" ? node.count : 1),
        0,
      );
      const folderDelta = movedNodes.filter(
        (node) => node.type === "folder",
      ).length;
      const sourceFolderSlug = getCurrentFolderSlug(sourceFolderPath);
      const sourceParentPath = getParentFolderPath(sourceFolderPath);
      const decrementSourceFolder =
        sourceFolderSlug !== undefined &&
        !(
          sameCollectionMove &&
          targetFolderPath?.startsWith(`${sourceFolderPath}/`)
        );

      for (const [key, contents] of allEntries) {
        const path = getFolderPathFromKey(key);
        const isSource = key[2] === sourceSlug && path === sourceFolderPath;
        const isTarget =
          key[2] === collectionSlug &&
          path === targetFolderPath &&
          (variables.targetFolderNodeId === null ||
            targetFolderPath !== undefined);
        const hasTargetFolder =
          !appliedContent &&
          targetFolder?.type === "folder" &&
          key[2] === collectionSlug &&
          path ===
            (typeof targetParentPath === "string"
              ? targetParentPath || undefined
              : undefined) &&
          contents.nodes.some((node) => node.id === targetFolder.id);
        const hasSourceFolder =
          decrementSourceFolder &&
          key[2] === sourceSlug &&
          path === sourceParentPath &&
          contents.nodes.some(
            (node) => node.type === "folder" && node.slug === sourceFolderSlug,
          );
        if (!isSource && !isTarget && !hasTargetFolder && !hasSourceFolder)
          continue;
        queryClient.setQueryData<CollectionContentsResponse>(key, (current) => {
          if (!current) return current;
          let next = current;
          if (isSource) {
            const moving = new Set(movedIds);
            for (const object of next.canvasObjects) {
              if (
                object.type === "arrow" &&
                object.start.binding &&
                object.end.binding &&
                moving.has(object.start.binding.targetId) &&
                moving.has(object.end.binding.targetId)
              ) {
                moving.add(object.id);
              }
            }
            const arrowSnapshots = new Map(
              variables.arrowSnapshots?.map((snapshot) => [
                snapshot.id,
                snapshot,
              ]),
            );
            next = {
              ...next,
              nodes: next.nodes.filter((node) => !moving.has(node.id)),
              canvasObjects: next.canvasObjects.flatMap<CanvasObject>(
                (object) => {
                  if (moving.has(object.id)) return [];
                  if (object.type !== "arrow") return [object];
                  const snapshot = arrowSnapshots.get(object.id);
                  if (!snapshot) return [object];
                  return [
                    {
                      ...object,
                      start:
                        object.start.binding &&
                        moving.has(object.start.binding.targetId)
                          ? { position: snapshot.start }
                          : object.start,
                      end:
                        object.end.binding &&
                        moving.has(object.end.binding.targetId)
                          ? { position: snapshot.end }
                          : object.end,
                    },
                  ];
                },
              ),
            };
          }
          if (isTarget && movedNodes.length === variables.nodeIds.length) {
            const allowedTypes =
              typeof key[4] === "string" ? key[4].split(",") : undefined;
            const additions = movedNodes.filter(
              (node) =>
                (!allowedTypes || allowedTypes.includes(node.type)) &&
                !next.nodes.some((existing) => existing.id === node.id),
            );
            if (additions.length) {
              next = {
                ...next,
                nodes: [
                  ...next.nodes,
                  ...additions.map((node) => ({ ...node, position: null })),
                ],
              };
            }
          }
          if (hasTargetFolder) {
            for (const node of movedNodes) {
              next = updateTargetFolderForMove(
                next,
                targetFolder.id,
                node.type === "folder" ? undefined : getAssetPreview(node),
                node.type === "folder" ? node.count : 1,
                node.type === "folder" ? 1 : 0,
              );
            }
          }
          if (hasSourceFolder) {
            const folder = next.nodes.find(
              (node) =>
                node.type === "folder" && node.slug === sourceFolderSlug,
            );
            if (folder) {
              for (const node of movedNodes) {
                next = updateTargetFolderForMove(
                  next,
                  folder.id,
                  node.type === "folder" ? undefined : getAssetPreview(node),
                  -(node.type === "folder" ? node.count : 1),
                  node.type === "folder" ? -1 : 0,
                );
              }
            }
          }
          return next;
        });
        appliedContent = true;
      }

      for (const [key, contents] of previousInboxContents) {
        queryClient.setQueryData<InboxContentsResponse>(key, {
          ...contents,
          nodes: contents.nodes.filter((node) => !movedIds.has(node.id)),
        });
        appliedContent = true;
      }
      for (const [key, grid] of previousGrids) {
        const isSource =
          key[0] === (hasSourceCollection ? "collectionGrid" : "inboxGrid") &&
          (!hasSourceCollection || key[2] === sourceSlug) &&
          (!hasSourceCollection ||
            getFolderPathFromKey(key) === sourceFolderPath);
        const isTarget =
          key[0] === "collectionGrid" &&
          key[2] === collectionSlug &&
          getFolderPathFromKey(key) === targetFolderPath &&
          (variables.targetFolderNodeId === null ||
            targetFolderPath !== undefined);
        const hasTargetFolder =
          targetFolder?.type === "folder" &&
          key[0] === "collectionGrid" &&
          key[2] === collectionSlug &&
          getFolderPathFromKey(key) ===
            (typeof targetParentPath === "string"
              ? targetParentPath || undefined
              : undefined);
        const hasSourceFolder =
          decrementSourceFolder &&
          key[0] === "collectionGrid" &&
          key[2] === sourceSlug &&
          getFolderPathFromKey(key) === sourceParentPath;
        if (!isSource && !isTarget && !hasTargetFolder && !hasSourceFolder)
          continue;
        queryClient.setQueryData(key, {
          ...grid,
          pages: grid.pages.map((page, index) => {
            if ("nodes" in page) {
              return isSource
                ? {
                    ...page,
                    nodes: page.nodes.filter((node) => !movedIds.has(node.id)),
                  }
                : page;
            }
            let folders = isSource
              ? page.folders.filter((node) => !movedIds.has(node.id))
              : page.folders;
            let assets = isSource
              ? page.assets.filter((node) => !movedIds.has(node.id))
              : page.assets;
            if (hasTargetFolder && targetFolder?.type === "folder") {
              folders = folders.map((node) =>
                node.id === targetFolder.id && node.type === "folder"
                  ? {
                      ...node,
                      count: node.count + assetDelta,
                      folderCount: node.folderCount + folderDelta,
                      previews: getMovedFolderPreviews(
                        node.previews,
                        movedNodes,
                      ),
                    }
                  : node,
              );
            }
            if (hasSourceFolder) {
              folders = folders.map((node) =>
                node.type === "folder" && node.slug === sourceFolderSlug
                  ? {
                      ...node,
                      count: Math.max(0, node.count - assetDelta),
                      folderCount: Math.max(0, node.folderCount - folderDelta),
                      previews: node.previews.filter(
                        (preview) => !movedIds.has(preview.assetId),
                      ),
                    }
                  : node,
              );
            }
            if (
              isTarget &&
              index === 0 &&
              movedNodes.length === variables.nodeIds.length
            ) {
              const allowedTypes = key
                .slice(4)
                .filter((type): type is string => typeof type === "string");
              for (const node of movedNodes) {
                if (allowedTypes.length && !allowedTypes.includes(node.type))
                  continue;
                if (node.type === "folder") {
                  if (!folders.some((current) => current.id === node.id))
                    folders = [...folders, { ...node, position: null }];
                } else if (!assets.some((current) => current.id === node.id)) {
                  assets = [...assets, { ...node, position: null }];
                }
              }
            }
            return { ...page, folders, assets };
          }),
        });
        appliedContent = true;
      }

      if (changeCollectionCount) {
        const nodesResolved = movedNodes.length === variables.nodeIds.length;
        // Cross-collection moves always involve assets only (folders cannot
        // leave their collection), so the asset-count delta is nodeIds.length.
        const movedAssetCount = movedNodes.reduce(
          (sum, node) => sum + (node.type === "folder" ? node.count : 1),
          0,
        );
        const delta = nodesResolved
          ? movedAssetCount
          : variables.nodeIds.length;
        if (delta > 0 && previousCollections) {
          const previews = nodesResolved
            ? movedNodes.flatMap((node) =>
                node.type === "folder" ? [] : [getAssetPreview(node)],
              )
            : [];
          queryClient.setQueryData<CollectionsData>(
            collectionsKey,
            (current) => {
              if (!current) return current;
              // Inbox has no source collection to decrement.
              const decrementSource = crossCollectionMove;
              let next = decrementSource
                ? adjustCollectionAssetCount(current, sourceSlug, -delta)
                : current;
              next = adjustCollectionAssetCount(next, collectionSlug, delta);
              return previews.reduce(
                (acc, preview) =>
                  promoteCollectionPreview(acc, collectionSlug, preview),
                next,
              );
            },
          );
          queryClient.setQueryData<WorkspaceData>(
            ["workspace", workspaceSlug],
            (current) => {
              if (
                !current ||
                !current.collections.some(
                  (collection) => collection.slug === collectionSlug,
                )
              ) {
                return current;
              }
              return {
                ...current,
                collections: current.collections.map((collection) => {
                  if (crossCollectionMove && collection.slug === sourceSlug) {
                    return {
                      ...collection,
                      assetCount: Math.max(0, collection.assetCount - delta),
                    };
                  }
                  if (collection.slug === collectionSlug) {
                    return {
                      ...collection,
                      assetCount: Math.max(0, collection.assetCount + delta),
                    };
                  }
                  return collection;
                }),
              };
            },
          );
          appliedCounts = true;
        }
      }

      if (!appliedContent && !appliedCounts) {
        return { optimistic: false };
      }

      return {
        optimistic: true,
        previousContents,
        previousGrids,
        previousInboxContents,
        previousCollections,
        previousWorkspace,
      };
    },
    onError: (_error, variables, context) => {
      if (!context || context.optimistic === false) {
        toast.error(getMoveErrorMessage(variables.nodeIds));
        return;
      }

      for (const [key, contents] of context.previousContents) {
        queryClient.setQueryData(key, contents);
      }
      for (const [key, grid] of context.previousGrids) {
        queryClient.setQueryData(key, grid);
      }
      for (const [key, contents] of context.previousInboxContents) {
        queryClient.setQueryData(key, contents);
      }
      queryClient.setQueryData<CollectionsData>(
        collectionQueryKeys.collections(workspaceSlug),
        context.previousCollections,
      );
      queryClient.setQueryData<WorkspaceData>(
        ["workspace", workspaceSlug],
        context.previousWorkspace,
      );
      toast.error(getMoveErrorMessage(variables.nodeIds));
    },
    onSettled: (_data, _error, variables) => {
      const invalidations = [
        queryClient.invalidateQueries({
          queryKey: ["collectionGrid", workspaceSlug, collectionSlug],
        }),
        queryClient.invalidateQueries({
          queryKey: ["inboxGrid", workspaceSlug],
        }),
        queryClient.invalidateQueries({
          queryKey: collectionQueryKeys.contentScope(
            workspaceSlug,
            collectionSlug,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: collectionQueryKeys.collections(workspaceSlug),
        }),
        queryClient.invalidateQueries({
          queryKey: collectionQueryKeys.inbox(workspaceSlug),
        }),
        queryClient.invalidateQueries({
          queryKey: ["workspace", workspaceSlug],
        }),
      ];
      if (
        variables.sourceCollectionSlug &&
        variables.sourceCollectionSlug !== collectionSlug
      ) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              "collectionGrid",
              workspaceSlug,
              variables.sourceCollectionSlug,
            ],
          }),
        );
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: collectionQueryKeys.contentScope(
              workspaceSlug,
              variables.sourceCollectionSlug,
            ),
          }),
        );
      }
      if (!_error) {
        invalidations.push(
          invalidateMentionSuggestionQueries(queryClient, workspaceSlug),
        );
      }
      void Promise.all(invalidations);
    },
  });
}

function findSourceEntry(
  entries: CollectionContentsCacheEntry[],
  folderPath: string | undefined,
  nodeIds: string[],
  targetFolderNodeId: string,
): CollectionContentsCacheEntry | undefined {
  return entries
    .filter(
      ([key, contents]) =>
        getFolderPathFromKey(key) === folderPath &&
        nodeIds.every((nodeId) =>
          contents.nodes.some((node) => node.id === nodeId),
        ) &&
        contents.nodes.some((node) => node.id === targetFolderNodeId),
    )
    .sort(([leftKey], [rightKey]) => leftKey.length - rightKey.length)[0];
}

function getFolderPathFromKey(key: readonly unknown[]): string | undefined {
  return typeof key[3] === "string" ? key[3] || undefined : undefined;
}

function isUnfilteredContentsKey(key: readonly unknown[]): boolean {
  return key.length === 4;
}

function getMoveErrorMessage(nodeIds: string[]): string {
  if (nodeIds.length > 1) {
    return "Unable to move the selected items into that folder.";
  }

  return nodeIds[0]?.startsWith("folder-")
    ? "Unable to move the folder into that folder."
    : "Unable to move the item into that folder.";
}

function joinFolderPath(parentPath: string | undefined, slug: string): string {
  return parentPath ? `${parentPath}/${slug}` : slug;
}

function getParentFolderPath(
  folderPath: string | undefined,
): string | undefined {
  if (!folderPath) return undefined;

  const segments = folderPath.split("/").filter(Boolean);
  segments.pop();
  return segments.length > 0 ? segments.join("/") : undefined;
}

function getCurrentFolderSlug(
  folderPath: string | undefined,
): string | undefined {
  if (!folderPath) return undefined;
  return folderPath.split("/").filter(Boolean).at(-1);
}
