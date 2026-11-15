import { describe, expect, it } from "vitest";

import { arrowHasIdentity, arrowIsSelected } from "./canvas-arrow-identity";

describe("canvas arrow identity", () => {
  it("does not match an absent object id to an absent client id", () => {
    expect(
      arrowHasIdentity(
        { id: "arrow-00000000-0000-4000-8000-000000000001" },
        undefined,
      ),
    ).toBe(false);
  });

  it("matches either the persisted id or a defined optimistic client id", () => {
    const arrow = {
      id: "arrow-00000000-0000-4000-8000-000000000001",
      clientId: "arrow-draft-1",
    };

    expect(
      arrowHasIdentity(arrow, "arrow-00000000-0000-4000-8000-000000000001"),
    ).toBe(true);
    expect(arrowHasIdentity(arrow, "arrow-draft-1")).toBe(true);
    expect(
      arrowHasIdentity(arrow, "arrow-00000000-0000-4000-8000-000000000002"),
    ).toBe(false);
  });

  it("selects by persisted or optimistic identity without matching undefined", () => {
    expect(
      arrowIsSelected(
        { id: "arrow-00000000-0000-4000-8000-000000000001" },
        new Set(["arrow-00000000-0000-4000-8000-000000000001"]),
      ),
    ).toBe(true);
    expect(
      arrowIsSelected(
        {
          id: "arrow-00000000-0000-4000-8000-000000000001",
          clientId: "arrow-draft-1",
        },
        new Set(["arrow-draft-1"]),
      ),
    ).toBe(true);
    expect(
      arrowIsSelected(
        { id: "arrow-00000000-0000-4000-8000-000000000001" },
        new Set(),
      ),
    ).toBe(false);
  });
});
