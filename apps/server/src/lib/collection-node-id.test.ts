import { describe, expect, it } from "vitest";

import { parseAssetNodeId, parseCollectionNodeId } from "./collection-node-id";

describe("collection node identifiers", () => {
  it("parses folder and asset collection node identifiers", () => {
    expect(
      parseCollectionNodeId("folder-00000000-0000-4000-8000-000000000007"),
    ).toEqual({
      nodeType: "folder",
      entityId: "00000000-0000-4000-8000-000000000007",
    });
    expect(
      parseCollectionNodeId("image-00000000-0000-4000-8000-00000000002a"),
    ).toEqual({
      nodeType: "asset",
      assetType: "image",
      entityId: "00000000-0000-4000-8000-00000000002a",
    });
    expect(
      parseCollectionNodeId("note-00000000-0000-4000-8000-000000000005"),
    ).toEqual({
      nodeType: "asset",
      assetType: "note",
      entityId: "00000000-0000-4000-8000-000000000005",
    });
    expect(
      parseCollectionNodeId("link-00000000-0000-4000-8000-000000000009"),
    ).toEqual({
      nodeType: "asset",
      assetType: "link",
      entityId: "00000000-0000-4000-8000-000000000009",
    });
  });

  it("parses image, note, and link identifiers as assets", () => {
    expect(
      parseAssetNodeId("image-00000000-0000-4000-8000-00000000002a"),
    ).toEqual({
      assetType: "image",
      entityId: "00000000-0000-4000-8000-00000000002a",
    });
    expect(
      parseAssetNodeId("note-00000000-0000-4000-8000-000000000005"),
    ).toEqual({
      assetType: "note",
      entityId: "00000000-0000-4000-8000-000000000005",
    });
    expect(
      parseAssetNodeId("link-00000000-0000-4000-8000-000000000009"),
    ).toEqual({
      assetType: "link",
      entityId: "00000000-0000-4000-8000-000000000009",
    });
    expect(() =>
      parseAssetNodeId("folder-00000000-0000-4000-8000-000000000007"),
    ).toThrow("Invalid asset id");
  });

  it("rejects malformed and unsafe collection node identifiers", () => {
    for (const nodeId of [
      "asset-1",
      "folder-",
      "folder-00000000-0000-4000-8000-000000000001-extra",
      "image--1",
      "note-00000000-0000-4000-8000-20000000000000",
    ]) {
      expect(() => parseCollectionNodeId(nodeId)).toThrow("Invalid node id");
    }
  });
});
