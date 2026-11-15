import { describe, expect, it } from "vitest";
import {
  mergeWorkspaceOverlaySearch,
  openMainAssetSearchPatch,
} from "./workspace-overlay-search";

describe("workspace overlay search transitions", () => {
  it("preserves an existing peek when opening a different main asset", () => {
    const current = {
      peek: "color-00000000-0000-4000-8000-000000000004",
      peekScope: "collection:ideas/references",
      peekDescendants: true,
    } as const;

    expect(
      mergeWorkspaceOverlaySearch(
        current,
        openMainAssetSearchPatch({
          currentPeekId: current.peek,
          nextAssetId: "note-00000000-0000-4000-8000-000000000002",
          fullscreen: false,
        }),
      ),
    ).toEqual({
      ...current,
      asset: undefined,
      view: undefined,
    });
  });

  it("removes the peek when that same asset is promoted to main", () => {
    expect(
      mergeWorkspaceOverlaySearch(
        { peek: "note-00000000-0000-4000-8000-000000000002", settings: true },
        openMainAssetSearchPatch({
          currentPeekId: "note-00000000-0000-4000-8000-000000000002",
          nextAssetId: "note-00000000-0000-4000-8000-000000000002",
          fullscreen: false,
        }),
      ),
    ).toEqual({
      asset: undefined,
      peek: undefined,
      peekScope: undefined,
      peekDescendants: undefined,
      settings: true,
      view: undefined,
    });
  });

  it("opens a promoted image in full view and clears its peek", () => {
    expect(
      mergeWorkspaceOverlaySearch(
        {
          peek: "image-00000000-0000-4000-8000-000000000001",
          peekScope: "collection:inspiration",
        },
        openMainAssetSearchPatch({
          currentPeekId: "image-00000000-0000-4000-8000-000000000001",
          nextAssetId: "image-00000000-0000-4000-8000-000000000001",
          fullscreen: true,
        }),
      ),
    ).toEqual({
      asset: undefined,
      peek: undefined,
      peekScope: undefined,
      peekDescendants: undefined,
      view: "full",
    });
  });

  it("makes the previous main the peek when swapping", () => {
    expect(
      mergeWorkspaceOverlaySearch(
        {
          peek: "color-00000000-0000-4000-8000-000000000004",
          peekScope: "collection:ideas",
          peekDescendants: true,
        },
        openMainAssetSearchPatch({
          currentPeekId: "color-00000000-0000-4000-8000-000000000004",
          nextAssetId: "note-00000000-0000-4000-8000-000000000002",
          peekAfter: "note-00000000-0000-4000-8000-000000000001",
          fullscreen: false,
        }),
      ),
    ).toEqual({
      asset: undefined,
      peek: "note-00000000-0000-4000-8000-000000000001",
      peekScope: undefined,
      peekDescendants: undefined,
      view: undefined,
    });
  });

  it("preserves unrelated URL state while changing presentation", () => {
    expect(
      mergeWorkspaceOverlaySearch(
        { peek: "note-00000000-0000-4000-8000-000000000001", settings: true },
        openMainAssetSearchPatch({
          currentPeekId: "note-00000000-0000-4000-8000-000000000001",
          nextAssetId: "link-00000000-0000-4000-8000-000000000003",
          fullscreen: true,
        }),
      ),
    ).toEqual({
      asset: undefined,
      peek: "note-00000000-0000-4000-8000-000000000001",
      settings: true,
      view: "full",
    });
  });
});
