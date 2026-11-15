import { describe, expect, it } from "vitest";
import { migratePersistedAppStore } from "./persisted-store-migration";

describe("persisted app store migration", () => {
  it("removes unscoped dock preferences and migrates current tab view choices", () => {
    expect(
      migratePersistedAppStore(
        {
          workspaceBoardActionRails: { studio: false, other: true },
          canvasFloatingSidebar: true,
          open: false,
        },
        { "studio:references": "grid" },
      ),
    ).toEqual({
      open: false,
      boardActionRailVisibilityByUser: {},
      collectionViews: { "studio:references": "grid" },
    });
  });

  it("removes unscoped preferences and handles malformed legacy values", () => {
    expect(
      migratePersistedAppStore(
        {
          workspaceBoardActionRails: null,
          boardActionRailVisible: false,
          collectionViews: { "studio:ideas": "canvas" },
        },
        { "studio:ideas": "grid" },
      ),
    ).toEqual({
      boardActionRailVisibilityByUser: {},
      collectionViews: { "studio:ideas": "canvas" },
    });
    expect(
      migratePersistedAppStore({ workspaceBoardActionRails: null }),
    ).toEqual({ boardActionRailVisibilityByUser: {}, collectionViews: {} });
  });
});
