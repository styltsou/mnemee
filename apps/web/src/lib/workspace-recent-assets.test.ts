import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getRecentWorkspaceAssetIds,
  recordRecentWorkspaceAsset,
} from "./workspace-recent-assets";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("workspace recent assets", () => {
  it("keeps the most recently opened assets first without duplicates", () => {
    recordRecentWorkspaceAsset(
      "design",
      "note-00000000-0000-4000-8000-000000000001",
    );
    recordRecentWorkspaceAsset(
      "design",
      "image-00000000-0000-4000-8000-000000000002",
    );
    recordRecentWorkspaceAsset(
      "design",
      "note-00000000-0000-4000-8000-000000000001",
    );

    expect(getRecentWorkspaceAssetIds("design")).toEqual([
      "note-00000000-0000-4000-8000-000000000001",
      "image-00000000-0000-4000-8000-000000000002",
    ]);
  });

  it("ignores malformed stored values and asset identifiers", () => {
    storage.set(
      "mnemee.workspace-recent-assets:design",
      '["folder-00000000-0000-4000-8000-000000000001", 3]',
    );

    expect(getRecentWorkspaceAssetIds("design")).toEqual([]);
    recordRecentWorkspaceAsset(
      "design",
      "folder-00000000-0000-4000-8000-000000000001",
    );
    expect(getRecentWorkspaceAssetIds("design")).toEqual([]);
  });
});
