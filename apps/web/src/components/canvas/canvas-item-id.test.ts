import { describe, expect, it } from "vitest";

import {
  isPersistedCanvasItemId,
  isPersistedCollectionNodeId,
} from "./canvas-item-id";

describe("canvas item IDs", () => {
  it("allows persisted videos in canvas move operations", () => {
    expect(
      isPersistedCanvasItemId("video-00000000-0000-4000-8000-00000000000c"),
    ).toBe(true);
    expect(
      isPersistedCollectionNodeId("video-00000000-0000-4000-8000-00000000000c"),
    ).toBe(true);
  });

  it("allows mixed persisted asset selections while excluding transient IDs", () => {
    const selectedIds = [
      "video-00000000-0000-4000-8000-00000000000c",
      "image-00000000-0000-4000-8000-000000000004",
      "note-00000000-0000-4000-8000-000000000008",
    ];

    expect(selectedIds.every(isPersistedCanvasItemId)).toBe(true);
    expect(selectedIds.every(isPersistedCollectionNodeId)).toBe(true);
    expect(isPersistedCanvasItemId("video-pending")).toBe(false);
  });

  it("keeps canvas-only objects out of collection-node geometry updates", () => {
    expect(
      isPersistedCanvasItemId("arrow-00000000-0000-4000-8000-000000000002"),
    ).toBe(true);
    expect(
      isPersistedCollectionNodeId("arrow-00000000-0000-4000-8000-000000000002"),
    ).toBe(false);
    expect(
      isPersistedCollectionNodeId("text-00000000-0000-4000-8000-000000000002"),
    ).toBe(false);
  });
});
