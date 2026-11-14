import { useCallback, useMemo, useRef } from "react";
import {
  useMutation,
  useQueryClient,
  type Query,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

import {
  createCanvasArrow,
  createCanvasText,
  deleteCanvasObject,
  updateCanvasArrow,
  updateCanvasText,
  updateCanvasItemFrontIndexes,
} from "./fetchers";
import type {
  CanvasItemFrontIndex,
  CanvasObject,
  CanvasObjectResponse,
  CollectionContentsResponse,
  CanvasArrowObject,
  CreateCanvasArrowInput,
  CreateCanvasTextInput,
  UpdateCanvasArrowInput,
  UpdateCanvasTextInput,
  UpdateCanvasItemFrontIndexesInput,
  UpdateCanvasItemFrontIndexesResponse,
} from "./types";
import { createLatestPatchQueue } from "./latest-patch-queue";

function contentsFilter(
  workspaceSlug: string,
  collectionSlug: string,
  folderPath?: string,
) {
  return {
    predicate: (query: Query) => {
      const [scope, workspace, collection, folder] = query.queryKey;
      return (
        scope === "collectionContents" &&
        workspace === workspaceSlug &&
        collection === collectionSlug &&
        folder === folderPath
      );
    },
  };
}

function updateObjectInContents(
  current: CollectionContentsResponse | undefined,
  objectId: string,
  update: (object: CanvasObject) => CanvasObject,
) {
  if (!current) return current;
  return {
    ...current,
    canvasObjects: current.canvasObjects.map((object) =>
      object.id === objectId || object.clientId === objectId
        ? update(object)
        : object,
    ),
  };
}

function matchesObjectIdentity(object: CanvasObject, objectId: string) {
  return object.id === objectId || object.clientId === objectId;
}

type CanvasObjectType = CanvasObject["type"];
type CanvasObjectUpdateVariables<TPatch> = TPatch & { objectId: string };

export function createCanvasObjectUpdateQueue<TPatch extends object>({
  queryClient,
  filter,
  objectType,
  save,
}: {
  queryClient: QueryClient;
  filter: ReturnType<typeof contentsFilter>;
  objectType: CanvasObjectType;
  save: (objectId: string, patch: TPatch) => Promise<CanvasObjectResponse>;
}) {
  const confirmedObjects = new Map<string, CanvasObject | undefined>();
  const queue = createLatestPatchQueue<TPatch, CanvasObjectResponse>({
    save,
    merge: (current, next) => ({ ...current, ...next }),
    onSuccess: (objectId, { object }, hasPending) => {
      const previous = confirmedObjects.get(objectId);
      const persisted = previous?.clientId
        ? { ...object, clientId: previous.clientId }
        : object;
      confirmedObjects.set(objectId, persisted);
      if (hasPending) return;

      queryClient.setQueriesData<CollectionContentsResponse>(
        filter,
        (current) =>
          updateObjectInContents(current, objectId, (candidate) =>
            candidate.type === objectType && object.type === objectType
              ? candidate.type === "text" && persisted.type === "text"
                ? { ...persisted, frontIndex: candidate.frontIndex }
                : persisted
              : candidate,
          ),
      );
      confirmedObjects.delete(objectId);
    },
    onError: (objectId, _error, hasPending) => {
      if (hasPending) return;

      const confirmed = confirmedObjects.get(objectId);
      if (confirmed) {
        queryClient.setQueriesData<CollectionContentsResponse>(
          filter,
          (current) =>
            updateObjectInContents(current, objectId, (candidate) =>
              candidate.type === objectType && confirmed.type === objectType
                ? {
                    ...confirmed,
                    id: candidate.id,
                    clientId: candidate.clientId ?? confirmed.clientId,
                    ...(candidate.type === "text" && confirmed.type === "text"
                      ? { frontIndex: candidate.frontIndex }
                      : {}),
                  }
                : candidate,
            ),
        );
      } else {
        void queryClient.invalidateQueries(filter);
      }
      confirmedObjects.delete(objectId);
    },
  });

  return {
    enqueue(objectId: string, patch: TPatch) {
      void queryClient.cancelQueries(filter);

      if (!confirmedObjects.has(objectId)) {
        const confirmed = queryClient
          .getQueriesData<CollectionContentsResponse>(filter)
          .flatMap(([, current]) => current?.canvasObjects ?? [])
          .find(
            (object) =>
              matchesObjectIdentity(object, objectId) &&
              object.type === objectType,
          );
        confirmedObjects.set(objectId, confirmed);
      }

      queryClient.setQueriesData<CollectionContentsResponse>(
        filter,
        (current) =>
          updateObjectInContents(current, objectId, (object) =>
            object.type === objectType ? { ...object, ...patch } : object,
          ),
      );
      return queue.enqueue(objectId, patch);
    },
  };
}

function useQueuedCanvasObjectUpdate<TPatch extends object>(
  filter: ReturnType<typeof contentsFilter>,
  objectType: CanvasObjectType,
  save: (objectId: string, patch: TPatch) => Promise<CanvasObjectResponse>,
) {
  const queryClient = useQueryClient();
  const requests = useRef(
    new WeakMap<
      CanvasObjectUpdateVariables<TPatch>,
      Promise<CanvasObjectResponse>
    >(),
  );
  const updateQueue = useMemo(
    () =>
      createCanvasObjectUpdateQueue({
        queryClient,
        filter,
        objectType,
        save,
      }),
    [filter, objectType, queryClient, save],
  );

  return useMutation({
    mutationFn: (variables: CanvasObjectUpdateVariables<TPatch>) => {
      const queued = requests.current.get(variables);
      if (queued) {
        requests.current.delete(variables);
        return queued;
      }

      const { objectId, ...patch } = variables;
      return updateQueue.enqueue(objectId, patch as TPatch);
    },
    onMutate: (variables) => {
      const { objectId, ...patch } = variables;
      requests.current.set(
        variables,
        updateQueue.enqueue(objectId, patch as TPatch),
      );
    },
  });
}

export function updateFrontIndexesInContents(
  current: CollectionContentsResponse | undefined,
  items: readonly CanvasItemFrontIndex[],
) {
  if (!current) return current;
  const frontIndexes = new Map(
    items.map((item) => [item.id, item.frontIndex] as const),
  );
  return {
    ...current,
    nodes: current.nodes.map((node) => {
      const frontIndex = frontIndexes.get(node.id);
      return frontIndex === undefined ? node : { ...node, frontIndex };
    }),
    canvasObjects: current.canvasObjects.map((object) => {
      const frontIndex = frontIndexes.get(object.id);
      return object.type !== "text" || frontIndex === undefined
        ? object
        : { ...object, frontIndex };
    }),
  };
}

type UpdateCanvasItemFrontIndexesVariables =
  UpdateCanvasItemFrontIndexesInput & {
    folderPath?: string;
    optimisticItems: CanvasItemFrontIndex[];
  };

export function createCanvasFrontOrderQueue({
  queryClient,
  filter,
  save,
}: {
  queryClient: QueryClient;
  filter: ReturnType<typeof contentsFilter>;
  save: (
    data: UpdateCanvasItemFrontIndexesInput,
  ) => Promise<UpdateCanvasItemFrontIndexesResponse>;
}) {
  const confirmed = new Map<string, number>();
  const queue = createLatestPatchQueue<
    UpdateCanvasItemFrontIndexesInput,
    UpdateCanvasItemFrontIndexesResponse
  >({
    save: async (_key, data) => {
      const items: CanvasItemFrontIndex[] = [];
      // The endpoint accepts at most 100 items. Preserve group order across batches.
      for (let offset = 0; offset < data.itemIds.length; offset += 100) {
        const batch = {
          ...data,
          itemIds: data.itemIds.slice(offset, offset + 100),
        };
        let result: UpdateCanvasItemFrontIndexesResponse;
        try {
          result = await save(batch);
        } catch (error) {
          if (error instanceof ApiError && error.status < 500) throw error;
          result = await save(batch);
        }
        items.push(...result.items);
      }
      return { items };
    },
    merge: (current, next) => {
      const nextIds = new Set(next.itemIds);
      return {
        ...next,
        itemIds: [
          ...current.itemIds.filter((id) => !nextIds.has(id)),
          ...next.itemIds,
        ],
      };
    },
    onSuccess: (_key, { items }, hasPending) => {
      items.forEach(({ id, frontIndex }) => confirmed.set(id, frontIndex));
      if (hasPending) return;
      queryClient.setQueriesData<CollectionContentsResponse>(
        filter,
        (current) =>
          updateFrontIndexesInContents(
            current,
            [...confirmed].map(([id, frontIndex]) => ({ id, frontIndex })),
          ),
      );
      confirmed.clear();
    },
    onError: (_key, _error, hasPending) => {
      // Layer order is best effort. Keep the local order and never roll back
      // unrelated geometry, content, or additions using an old canvas snapshot.
      if (!hasPending) confirmed.clear();
    },
  });
  return {
    enqueue({
      optimisticItems,
      folderPath: _folderPath,
      ...data
    }: UpdateCanvasItemFrontIndexesVariables) {
      void queryClient.cancelQueries(filter);
      queryClient.setQueriesData<CollectionContentsResponse>(
        filter,
        (current) => updateFrontIndexesInContents(current, optimisticItems),
      );
      return queue.enqueue("order", data);
    },
  };
}

export function useUpdateCanvasItemFrontIndexes(
  workspaceSlug: string,
  collectionSlug: string,
  folderPath?: string,
) {
  const queryClient = useQueryClient();
  const queue = useMemo(
    () =>
      createCanvasFrontOrderQueue({
        queryClient,
        filter: contentsFilter(workspaceSlug, collectionSlug, folderPath),
        save: (data) =>
          updateCanvasItemFrontIndexes(workspaceSlug, collectionSlug, data),
      }),
    [queryClient, workspaceSlug, collectionSlug, folderPath],
  );
  return useMutation({
    mutationFn: (variables: UpdateCanvasItemFrontIndexesVariables) =>
      queue.enqueue(variables),
  });
}

type CreateCanvasTextVariables = CreateCanvasTextInput & {
  clientId?: string;
};

export type CreateCanvasArrowVariables = CreateCanvasArrowInput & {
  clientId?: string;
};

function optimisticArrowFromVariables(
  variables: CreateCanvasArrowVariables,
): CanvasArrowObject | undefined {
  if (!variables.clientId) return undefined;
  const {
    clientId,
    parentFolderPath: _parentFolderPath,
    type: _type,
    ...arrow
  } = variables;
  const timestamp = new Date().toISOString();
  return {
    id: clientId,
    clientId,
    type: "arrow",
    ...arrow,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function reconcileCreatedArrowInContents(
  current: CollectionContentsResponse | undefined,
  object: CanvasArrowObject,
  clientId?: string,
) {
  if (!current) return current;
  const optimistic = clientId
    ? current.canvasObjects.find(
        (candidate) =>
          candidate.type === "arrow" &&
          matchesObjectIdentity(candidate, clientId),
      )
    : undefined;
  const persisted: CanvasArrowObject =
    optimistic?.type === "arrow"
      ? {
          ...object,
          start: optimistic.start,
          end: optimistic.end,
          style: optimistic.style,
          pattern: optimistic.pattern,
          head: optimistic.head,
          routing: optimistic.routing,
          points: optimistic.points,
          rotation: optimistic.rotation,
          color: optimistic.color,
          clientId,
        }
      : clientId
        ? { ...object, clientId }
        : object;
  let replaced = false;
  const canvasObjects = current.canvasObjects.flatMap((candidate) => {
    if (
      candidate.id === object.id ||
      (clientId !== undefined && matchesObjectIdentity(candidate, clientId))
    ) {
      if (replaced) return [];
      replaced = true;
      return [persisted];
    }
    return [candidate];
  });
  return {
    ...current,
    canvasObjects: replaced ? canvasObjects : [...canvasObjects, persisted],
  };
}

export function useCreateCanvasText(
  workspaceSlug: string,
  collectionSlug: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId: _clientId, ...data }: CreateCanvasTextVariables) =>
      createCanvasText(workspaceSlug, collectionSlug, data),
    onSuccess: ({ object }, variables) => {
      if (object.type !== "text") return;
      const persisted =
        variables.clientId === undefined
          ? object
          : { ...object, clientId: variables.clientId };
      queryClient.setQueriesData<CollectionContentsResponse>(
        contentsFilter(
          workspaceSlug,
          collectionSlug,
          variables.parentFolderPath,
        ),
        (current) =>
          current
            ? {
                ...current,
                canvasObjects: current.canvasObjects.some(
                  (candidate) => candidate.id === persisted.id,
                )
                  ? current.canvasObjects
                  : [...current.canvasObjects, persisted],
              }
            : current,
      );
    },
  });
}

export function useCreateCanvasArrow(
  workspaceSlug: string,
  collectionSlug: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId: _clientId,
      ...data
    }: CreateCanvasArrowVariables) =>
      createCanvasArrow(workspaceSlug, collectionSlug, data),
    onMutate: async (variables) => {
      const optimistic = optimisticArrowFromVariables(variables);
      if (!optimistic) return;
      const filter = contentsFilter(
        workspaceSlug,
        collectionSlug,
        variables.parentFolderPath,
      );
      await queryClient.cancelQueries(filter);
      queryClient.setQueriesData<CollectionContentsResponse>(
        filter,
        (current) =>
          current &&
          !current.canvasObjects.some((candidate) =>
            matchesObjectIdentity(candidate, optimistic.id),
          )
            ? {
                ...current,
                canvasObjects: [...current.canvasObjects, optimistic],
              }
            : current,
      );
    },
    onError: (_error, variables) => {
      if (!variables.clientId) return;
      queryClient.setQueriesData<CollectionContentsResponse>(
        contentsFilter(
          workspaceSlug,
          collectionSlug,
          variables.parentFolderPath,
        ),
        (current) =>
          current
            ? {
                ...current,
                canvasObjects: current.canvasObjects.filter(
                  (candidate) =>
                    !matchesObjectIdentity(candidate, variables.clientId!),
                ),
              }
            : current,
      );
    },
    onSuccess: ({ object }, variables) => {
      if (object.type !== "arrow") return;
      queryClient.setQueriesData<CollectionContentsResponse>(
        contentsFilter(
          workspaceSlug,
          collectionSlug,
          variables.parentFolderPath,
        ),
        (current) =>
          reconcileCreatedArrowInContents(current, object, variables.clientId),
      );
    },
  });
}

export function useUpdateCanvasText(
  workspaceSlug: string,
  collectionSlug: string,
  folderPath?: string,
) {
  const filter = useMemo(
    () => contentsFilter(workspaceSlug, collectionSlug, folderPath),
    [workspaceSlug, collectionSlug, folderPath],
  );
  const save = useCallback(
    (objectId: string, data: UpdateCanvasTextInput) =>
      updateCanvasText(workspaceSlug, collectionSlug, objectId, data),
    [workspaceSlug, collectionSlug],
  );
  return useQueuedCanvasObjectUpdate(filter, "text", save);
}

export function useUpdateCanvasArrow(
  workspaceSlug: string,
  collectionSlug: string,
  folderPath?: string,
  resolveObjectId?: (objectId: string) => string | Promise<string>,
) {
  const filter = useMemo(
    () => contentsFilter(workspaceSlug, collectionSlug, folderPath),
    [workspaceSlug, collectionSlug, folderPath],
  );
  const save = useCallback(
    async (objectId: string, data: UpdateCanvasArrowInput) => {
      const persistedId = resolveObjectId
        ? await resolveObjectId(objectId)
        : objectId;
      return updateCanvasArrow(
        workspaceSlug,
        collectionSlug,
        persistedId,
        data,
      );
    },
    [workspaceSlug, collectionSlug, resolveObjectId],
  );
  return useQueuedCanvasObjectUpdate(filter, "arrow", save);
}

export function useDeleteCanvasObject(
  workspaceSlug: string,
  collectionSlug: string,
  folderPath?: string,
) {
  const queryClient = useQueryClient();
  const filter = contentsFilter(workspaceSlug, collectionSlug, folderPath);
  return useMutation({
    mutationFn: (objectId: string) =>
      deleteCanvasObject(workspaceSlug, collectionSlug, objectId),
    onMutate: async (objectId) => {
      await queryClient.cancelQueries(filter);
      const previous =
        queryClient.getQueriesData<CollectionContentsResponse>(filter);
      queryClient.setQueriesData<CollectionContentsResponse>(
        filter,
        (current) =>
          current
            ? {
                ...current,
                canvasObjects: current.canvasObjects.filter(
                  (object) => object.id !== objectId,
                ),
              }
            : current,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([key, value]: [QueryKey, unknown]) => {
        queryClient.setQueryData(key, value);
      });
    },
  });
}
