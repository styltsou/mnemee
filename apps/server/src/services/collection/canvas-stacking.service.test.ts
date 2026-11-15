import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  execute: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: { transaction: (callback: (tx: unknown) => unknown) => callback(mocks) },
}));
vi.mock("./collection-target-resolver", () => ({
  getCollectionBySlug: async () => ({
    id: "00000000-0000-4000-8000-00000000000a",
  }),
}));

import {
  CanvasStackingService,
  reserveCanvasFrontIndex,
} from "./canvas-stacking.service";

function rows(value: unknown[]) {
  const query = Object.assign(Promise.resolve(value), {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    for: vi.fn().mockReturnThis(),
  });
  mocks.select.mockReturnValueOnce(query);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.update.mockReturnValue({ set: mocks.set });
  mocks.set.mockReturnValue({ where: mocks.where });
  mocks.where.mockResolvedValue([]);
});

describe("canvas stacking persistence", () => {
  it("accepts video cards and places them above cards and freeform text", async () => {
    rows([
      {
        id: "00000000-0000-4000-8000-000000000007",
        nodeType: "asset",
        assetId: "00000000-0000-4000-8000-00000000002a",
        assetType: "video",
      },
    ]);
    rows([
      {
        id: "00000000-0000-4000-8000-000000000008",
        nodeType: "asset",
        assetId: "00000000-0000-4000-8000-00000000002b",
        assetType: "note",
        frontIndex: 9,
      },
    ]);
    rows([{ id: "00000000-0000-4000-8000-000000000003", frontIndex: 12 }]);
    await expect(
      new CanvasStackingService().bringItemsToFront("org", "user", "ideas", {
        itemIds: ["video-00000000-0000-4000-8000-00000000002a"],
        expectedParentFolderNodeId: null,
      }),
    ).resolves.toEqual({
      items: [
        { id: "video-00000000-0000-4000-8000-00000000002a", frontIndex: 13 },
      ],
    });
    expect(mocks.set).toHaveBeenCalledWith({ frontIndex: 13 });
  });

  it("rejects an item that left the expected canvas", async () => {
    rows([]);
    await expect(
      new CanvasStackingService().bringItemsToFront("org", "user", "ideas", {
        itemIds: ["video-00000000-0000-4000-8000-00000000002a"],
        expectedParentFolderNodeId: null,
      }),
    ).rejects.toThrow("Canvas item moved");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("reserves a new layer above both cards and text under the scope lock", async () => {
    rows([{ maximum: 4 }]);
    rows([{ maximum: 19 }]);
    await expect(
      reserveCanvasFrontIndex(
        mocks as never,
        "org",
        "00000000-0000-4000-8000-00000000000a",
        null,
      ),
    ).resolves.toBe(20);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(mocks.execute.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.select.mock.invocationCallOrder[0]!,
    );
  });

  it("starts an empty canvas at zero", async () => {
    rows([{ maximum: null }]);
    rows([{ maximum: null }]);
    await expect(
      reserveCanvasFrontIndex(
        mocks as never,
        "org",
        "00000000-0000-4000-8000-00000000000a",
        "00000000-0000-4000-8000-000000000002",
      ),
    ).resolves.toBe(0);
  });

  it("rebases a full index range before reserving a new top layer", async () => {
    rows([{ maximum: 100_000 }]);
    rows([{ maximum: 9 }]);
    rows([
      {
        id: "00000000-0000-4000-8000-000000000008",
        nodeType: "asset",
        assetId: "00000000-0000-4000-8000-00000000002b",
        assetType: "note",
        frontIndex: 100_000,
      },
    ]);
    rows([{ id: "00000000-0000-4000-8000-000000000003", frontIndex: 9 }]);
    await expect(
      reserveCanvasFrontIndex(
        mocks as never,
        "org",
        "00000000-0000-4000-8000-00000000000a",
        null,
      ),
    ).resolves.toBe(2);
    expect(mocks.set.mock.calls).toEqual([
      [{ frontIndex: 0 }],
      [{ frontIndex: 1 }],
    ]);
  });
});
