import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

import type {
  CanvasObjectResponse,
  CollectionContentsResponse,
  UpdateCanvasArrowInput,
  UpdateCanvasTextInput,
  UpdateCanvasItemFrontIndexesInput,
  UpdateCanvasItemFrontIndexesResponse,
} from "./types";
import {
  createCanvasObjectUpdateQueue,
  createCanvasFrontOrderQueue,
  reconcileCreatedArrowInContents,
  updateFrontIndexesInContents,
} from "./canvas-object-hooks";

const contents: CollectionContentsResponse = {
  collection: { id: 1, name: "Ideas", slug: "ideas" },
  breadcrumbs: [],
  nodes: [
    {
      id: "note-1",
      type: "note",
      content: "Card",
      isFavorite: false,
      wordCount: 1,
      readingTimeMinutes: 1,
      createdAt: "2026-09-15T00:00:00.000Z",
      position: { x: 0, y: 0 },
      frontIndex: null,
    },
  ],
  canvasObjects: [
    {
      id: "text-2",
      type: "text",
      content: "Label",
      position: { x: 10, y: 10 },
      font: "inter",
      size: "md",
      color: "ink",
      frontIndex: null,
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    },
    {
      id: "arrow-3",
      type: "arrow",
      start: { position: { x: 0, y: 0 } },
      end: { position: { x: 20, y: 20 } },
      style: "clean",
      pattern: "solid",
      head: "filled",
      routing: "straight",
      points: [],
      rotation: 0,
      color: "ink",
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    },
  ],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

const contentsKey = [
  "collectionContents",
  "workspace",
  "ideas",
  undefined,
] as const;

function createFrontOrderQueue(
  queryClient: QueryClient,
  save: (
    data: UpdateCanvasItemFrontIndexesInput,
  ) => Promise<UpdateCanvasItemFrontIndexesResponse>,
) {
  return createCanvasFrontOrderQueue({
    queryClient,
    filter: {
      predicate: (query) => query.queryKey[0] === "collectionContents",
    },
    save,
  });
}

describe("canvas front order saves", () => {
  it("serializes and coalesces promotions without letting old responses replace newer order", async () => {
    const client = new QueryClient();
    client.setQueryData(contentsKey, contents);
    const first = deferred<UpdateCanvasItemFrontIndexesResponse>();
    const last = deferred<UpdateCanvasItemFrontIndexesResponse>();
    const save = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(last.promise);
    const queue = createFrontOrderQueue(client, save);
    const promote = (id: string, frontIndex: number) =>
      queue.enqueue({
        itemIds: [id],
        expectedParentFolderNodeId: null,
        optimisticItems: [{ id, frontIndex }],
      });
    const a = promote("note-1", 1);
    const b = promote("text-2", 2);
    const c = promote("note-1", 3);
    expect(save).toHaveBeenCalledTimes(1);
    first.resolve({ items: [{ id: "note-1", frontIndex: 1 }] });
    await a;
    expect(
      client.getQueryData<CollectionContentsResponse>(contentsKey)?.nodes[0]
        ?.frontIndex,
    ).toBe(3);
    expect(save.mock.calls[1]?.[0].itemIds).toEqual(["text-2", "note-1"]);
    last.resolve({
      items: [
        { id: "text-2", frontIndex: 2 },
        { id: "note-1", frontIndex: 3 },
      ],
    });
    await Promise.all([b, c]);
    expect(
      client.getQueryData<CollectionContentsResponse>(contentsKey)?.nodes[0]
        ?.frontIndex,
    ).toBe(3);
  });

  it("keeps local order and subsequent canvas edits when a save fails", async () => {
    const client = new QueryClient();
    client.setQueryData(contentsKey, contents);
    const request = deferred<UpdateCanvasItemFrontIndexesResponse>();
    const save = vi.fn().mockReturnValue(request.promise);
    const queue = createFrontOrderQueue(client, save);
    const result = queue.enqueue({
      itemIds: ["note-1"],
      expectedParentFolderNodeId: null,
      optimisticItems: [{ id: "note-1", frontIndex: 8 }],
    });
    client.setQueryData<CollectionContentsResponse>(contentsKey, (current) => ({
      ...current!,
      nodes: current!.nodes.map((node) => ({
        ...node,
        position: { x: 500, y: 600 },
      })),
      canvasObjects: [],
    }));
    request.reject(new ApiError(409, "Item moved"));
    await expect(result).rejects.toThrow("Item moved");
    expect(save).toHaveBeenCalledTimes(1);
    expect(
      client.getQueryData<CollectionContentsResponse>(contentsKey),
    ).toMatchObject({
      nodes: [{ frontIndex: 8, position: { x: 500, y: 600 } }],
      canvasObjects: [],
    });
  });

  it("retries a transient failure once", async () => {
    const client = new QueryClient();
    client.setQueryData(contentsKey, contents);
    const save = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, "Unavailable"))
      .mockResolvedValueOnce({ items: [{ id: "note-1", frontIndex: 5 }] });
    await createFrontOrderQueue(client, save).enqueue({
      itemIds: ["note-1"],
      expectedParentFolderNodeId: null,
      optimisticItems: [],
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(
      client.getQueryData<CollectionContentsResponse>(contentsKey)?.nodes[0]
        ?.frontIndex,
    ).toBe(5);
  });

  it("saves selections larger than the API limit in ordered batches", async () => {
    const ids = Array.from({ length: 205 }, (_, index) => `note-${index + 1}`);
    const save = vi.fn().mockResolvedValue({ items: [] });
    await createFrontOrderQueue(new QueryClient(), save).enqueue({
      itemIds: ids,
      expectedParentFolderNodeId: null,
      optimisticItems: [],
    });
    expect(save.mock.calls.map(([data]) => data.itemIds.length)).toEqual([
      100, 100, 5,
    ]);
    expect(save.mock.calls.flatMap(([data]) => data.itemIds)).toEqual(ids);
  });
});

function textObject(update: UpdateCanvasTextInput = {}): CanvasObjectResponse {
  const object = contents.canvasObjects[0];
  if (!object || object.type !== "text") {
    throw new Error("Expected the text fixture first");
  }
  return {
    object: {
      ...object,
      ...update,
    },
  };
}

function createTextUpdateQueue(
  queryClient: QueryClient,
  save: (
    objectId: string,
    patch: UpdateCanvasTextInput,
  ) => Promise<CanvasObjectResponse>,
) {
  return createCanvasObjectUpdateQueue({
    queryClient,
    filter: {
      predicate: (query) =>
        query.queryKey[0] === "collectionContents" &&
        query.queryKey[1] === "workspace" &&
        query.queryKey[2] === "ideas" &&
        query.queryKey[3] === undefined,
    },
    objectType: "text",
    save,
  });
}

it("preserves a newer layer order when an earlier text edit completes", async () => {
  const client = new QueryClient();
  client.setQueryData(contentsKey, contents);
  const request = deferred<CanvasObjectResponse>();
  const queue = createTextUpdateQueue(client, () => request.promise);
  const result = queue.enqueue("text-2", { color: "violet" });
  client.setQueryData<CollectionContentsResponse>(contentsKey, (current) =>
    updateFrontIndexesInContents(current, [{ id: "text-2", frontIndex: 20 }]),
  );
  request.resolve(textObject({ color: "violet" }));
  await result;
  expect(
    client.getQueryData<CollectionContentsResponse>(contentsKey)
      ?.canvasObjects[0],
  ).toMatchObject({ color: "violet", frontIndex: 20 });
});

function arrowObject(
  update: UpdateCanvasArrowInput = {},
): CanvasObjectResponse {
  const object = contents.canvasObjects[1];
  if (!object || object.type !== "arrow") {
    throw new Error("Expected the arrow fixture second");
  }
  return {
    object: {
      ...object,
      ...update,
    },
  };
}

function createArrowUpdateQueue(
  queryClient: QueryClient,
  save: (
    objectId: string,
    patch: UpdateCanvasArrowInput,
  ) => Promise<CanvasObjectResponse>,
) {
  return createCanvasObjectUpdateQueue({
    queryClient,
    filter: {
      predicate: (query) =>
        query.queryKey[0] === "collectionContents" &&
        query.queryKey[1] === "workspace" &&
        query.queryKey[2] === "ideas" &&
        query.queryKey[3] === undefined,
    },
    objectType: "arrow",
    save,
  });
}

describe("canvas front-index cache updates", () => {
  it("updates collection nodes and text while leaving arrows untouched", () => {
    const updated = updateFrontIndexesInContents(contents, [
      { id: "note-1", frontIndex: 4 },
      { id: "text-2", frontIndex: 5 },
      { id: "arrow-3", frontIndex: 6 },
    ]);

    expect(updated?.nodes[0]?.frontIndex).toBe(4);
    expect(updated?.canvasObjects[0]).toMatchObject({ frontIndex: 5 });
    expect(updated?.canvasObjects[1]).toBe(contents.canvasObjects[1]);
  });
});

describe("optimistic arrow creation", () => {
  it("reconciles the server id without discarding edits made while creating", () => {
    const original = contents.canvasObjects[1];
    if (!original || original.type !== "arrow") {
      throw new Error("Expected the arrow fixture second");
    }
    const optimistic = {
      ...original,
      id: "arrow-draft-client",
      clientId: "arrow-draft-client",
      points: [{ x: 10, y: 35 }],
      rotation: Math.PI / 6,
    };
    const current = {
      ...contents,
      canvasObjects: [contents.canvasObjects[0]!, optimistic],
    };
    const reconciled = reconcileCreatedArrowInContents(
      current,
      { ...original, id: "arrow-91" },
      optimistic.clientId,
    );

    expect(reconciled?.canvasObjects).toHaveLength(2);
    expect(reconciled?.canvasObjects[1]).toMatchObject({
      id: "arrow-91",
      clientId: "arrow-draft-client",
      points: [{ x: 10, y: 35 }],
      rotation: Math.PI / 6,
    });
  });
});

describe("canvas object update queue", () => {
  it("keeps the newest arrow transform while an older transform settles", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(contentsKey, contents);
    const first = deferred<CanvasObjectResponse>();
    const latest = deferred<CanvasObjectResponse>();
    const save = vi
      .fn<
        (
          objectId: string,
          patch: UpdateCanvasArrowInput,
        ) => Promise<CanvasObjectResponse>
      >()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(latest.promise);
    const updates = createArrowUpdateQueue(queryClient, save);
    const resized: UpdateCanvasArrowInput = {
      start: { position: { x: 5, y: 5 } },
      end: { position: { x: 35, y: 25 } },
      points: [{ x: 18, y: 8 }],
      routing: "smooth",
    };
    const rotated: UpdateCanvasArrowInput = {
      start: { position: { x: 30, y: 0 } },
      end: { position: { x: 10, y: 30 } },
      points: [{ x: 27, y: 17 }],
      routing: "smooth",
    };

    const firstResult = updates.enqueue("arrow-3", resized);
    const latestResult = updates.enqueue("arrow-3", rotated);

    expect(
      queryClient.getQueryData<CollectionContentsResponse>(contentsKey)
        ?.canvasObjects[1],
    ).toMatchObject(rotated);

    first.resolve(arrowObject(resized));
    await firstResult;

    expect(
      queryClient.getQueryData<CollectionContentsResponse>(contentsKey)
        ?.canvasObjects[1],
    ).toMatchObject(rotated);
    expect(save).toHaveBeenLastCalledWith("arrow-3", rotated);

    latest.resolve(arrowObject(rotated));
    await latestResult;

    expect(
      queryClient.getQueryData<CollectionContentsResponse>(contentsKey)
        ?.canvasObjects[1],
    ).toMatchObject(rotated);
  });

  it("keeps the persisted identity when a pre-create update rolls back", async () => {
    const queryClient = new QueryClient();
    const source = contents.canvasObjects[1];
    if (!source || source.type !== "arrow") {
      throw new Error("Expected the arrow fixture second");
    }
    const optimistic = {
      ...source,
      id: "arrow-draft-client",
      clientId: "arrow-draft-client",
    };
    queryClient.setQueryData(contentsKey, {
      ...contents,
      canvasObjects: [contents.canvasObjects[0]!, optimistic],
    });
    const request = deferred<CanvasObjectResponse>();
    const updates = createArrowUpdateQueue(
      queryClient,
      vi.fn().mockReturnValue(request.promise),
    );
    const result = updates.enqueue(optimistic.id, {
      points: [{ x: 10, y: 20 }],
    });

    queryClient.setQueryData<CollectionContentsResponse>(
      contentsKey,
      (current) =>
        reconcileCreatedArrowInContents(
          current,
          { ...source, id: "arrow-91" },
          optimistic.clientId,
        ),
    );
    request.reject(new Error("save failed"));
    await expect(result).rejects.toThrow("save failed");

    expect(
      queryClient.getQueryData<CollectionContentsResponse>(contentsKey)
        ?.canvasObjects[1],
    ).toMatchObject({
      id: "arrow-91",
      clientId: optimistic.clientId,
      points: [],
    });
  });

  it("keeps the newest optimistic fields while an older response settles", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(contentsKey, contents);
    const first = deferred<CanvasObjectResponse>();
    const latest = deferred<CanvasObjectResponse>();
    const save = vi
      .fn<
        (
          objectId: string,
          patch: UpdateCanvasTextInput,
        ) => Promise<CanvasObjectResponse>
      >()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(latest.promise);
    const updates = createTextUpdateQueue(queryClient, save);

    const firstResult = updates.enqueue("text-2", {
      font: "ibm_plex_mono",
    });
    const latestResult = updates.enqueue("text-2", {
      font: "fraunces",
      color: "violet",
    });

    expect(
      queryClient.getQueryData<CollectionContentsResponse>(contentsKey)
        ?.canvasObjects[0],
    ).toMatchObject({ font: "fraunces", color: "violet" });

    first.resolve(textObject({ font: "ibm_plex_mono" }));
    await firstResult;

    expect(
      queryClient.getQueryData<CollectionContentsResponse>(contentsKey)
        ?.canvasObjects[0],
    ).toMatchObject({ font: "fraunces", color: "violet" });
    expect(save).toHaveBeenLastCalledWith("text-2", {
      font: "fraunces",
      color: "violet",
    });

    latest.resolve(textObject({ font: "fraunces", color: "violet" }));
    await latestResult;

    expect(
      queryClient.getQueryData<CollectionContentsResponse>(contentsKey)
        ?.canvasObjects[0],
    ).toMatchObject({ font: "fraunces", color: "violet" });
  });

  it("restores the last confirmed object when the final patch fails", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(contentsKey, contents);
    const first = deferred<CanvasObjectResponse>();
    const latest = deferred<CanvasObjectResponse>();
    const save = vi
      .fn<
        (
          objectId: string,
          patch: UpdateCanvasTextInput,
        ) => Promise<CanvasObjectResponse>
      >()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(latest.promise);
    const updates = createTextUpdateQueue(queryClient, save);

    const firstResult = updates.enqueue("text-2", { size: "lg" });
    const latestResult = updates.enqueue("text-2", { size: "xl" });

    first.resolve(textObject({ size: "lg" }));
    await firstResult;
    latest.reject(new Error("save failed"));
    await expect(latestResult).rejects.toThrow("save failed");

    expect(
      queryClient.getQueryData<CollectionContentsResponse>(contentsKey)
        ?.canvasObjects[0],
    ).toMatchObject({ size: "lg" });
  });

  it("does not reinsert an object deleted while its update is pending", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(contentsKey, contents);
    const request = deferred<CanvasObjectResponse>();
    const updates = createTextUpdateQueue(queryClient, () => request.promise);

    const result = updates.enqueue("text-2", { color: "violet" });
    queryClient.setQueryData<CollectionContentsResponse>(
      contentsKey,
      (current) =>
        current && {
          ...current,
          canvasObjects: current.canvasObjects.filter(
            (object) => object.id !== "text-2",
          ),
        },
    );
    request.resolve(textObject({ color: "violet" }));
    await result;

    expect(
      queryClient
        .getQueryData<CollectionContentsResponse>(contentsKey)
        ?.canvasObjects.some((object) => object.id === "text-2"),
    ).toBe(false);
  });
});
