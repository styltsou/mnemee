import { describe, expect, it } from "vitest";

import {
  parseWorkspaceAssetId,
  parseWorkspaceAssetPath,
  workspaceAssetPath,
} from "./workspace-asset-url";

describe("parseWorkspaceAssetId", () => {
  it.each([
    "image-00000000-0000-4000-8000-000000000001",
    "video-00000000-0000-4000-8000-000000000003",
    "note-00000000-0000-4000-8000-000000000018",
    "link-00000000-0000-4000-8000-000000000008",
    "color-00000000-0000-4000-8000-00000000012c",
  ])("accepts %s", (assetId) => {
    expect(parseWorkspaceAssetId(assetId)).toBe(assetId);
  });

  it.each([
    undefined,
    null,
    12,
    "folder-00000000-0000-4000-8000-000000000001",
    "note-x",
    "note-00000000-0000-4000-8000-000000000001-more",
  ])("rejects %s", (assetId) => {
    expect(parseWorkspaceAssetId(assetId)).toBeUndefined();
  });
});

describe("workspace asset paths", () => {
  it("uses the asset route segment", () => {
    expect(
      workspaceAssetPath(
        "/work/collections/ideas",
        "note-00000000-0000-4000-8000-000000000001",
      ),
    ).toBe(
      "/work/collections/ideas/asset/note-00000000-0000-4000-8000-000000000001",
    );
  });

  it.each([
    ["/work", "note-00000000-0000-4000-8000-000000000001"],
    ["/work/inbox", "image-00000000-0000-4000-8000-000000000002"],
    ["/work/inbox", "video-00000000-0000-4000-8000-000000000004"],
    [
      "/work/collections/ideas/nested",
      "color-00000000-0000-4000-8000-000000000003",
    ],
  ])("round-trips %s with %s", (boardPathname, assetId) => {
    expect(
      parseWorkspaceAssetPath(workspaceAssetPath(boardPathname, assetId)),
    ).toEqual({ boardPathname, assetId });
  });

  it("does not treat a malformed suffix as an asset", () => {
    expect(
      parseWorkspaceAssetPath("/work/collections/ideas/asset/note-x"),
    ).toEqual({ boardPathname: "/work/collections/ideas/asset/note-x" });
  });
});
