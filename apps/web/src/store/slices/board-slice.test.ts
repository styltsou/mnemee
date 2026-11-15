import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import { createPersistedBoardSlice } from "./board-slice";

describe("board action rail preferences", () => {
  it("keeps visibility choices independent for each user", () => {
    const store = createStore(createPersistedBoardSlice);
    store.getState().setBoardActionRailVisible("alice", false);
    store.getState().setBoardActionRailVisible("bob", true);

    expect(store.getState().boardActionRailVisibilityByUser).toEqual({
      alice: false,
      bob: true,
    });
  });
});
