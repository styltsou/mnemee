import { describe, expect, it } from "vitest";

import { activeCanvasObjectFocus } from "./canvas-object-focus";

describe("activeCanvasObjectFocus", () => {
  it("keeps explicit focus for a matching single selection", () => {
    expect(
      activeCanvasObjectFocus("text-00000000-0000-4000-8000-000000000001", [
        "text-00000000-0000-4000-8000-000000000001",
      ]),
    ).toBe("text-00000000-0000-4000-8000-000000000001");
  });

  it("hides object focus for multi-selection", () => {
    expect(
      activeCanvasObjectFocus("text-00000000-0000-4000-8000-000000000001", [
        "text-00000000-0000-4000-8000-000000000001",
        "arrow-00000000-0000-4000-8000-000000000002",
      ]),
    ).toBe(undefined);
  });

  it("does not infer focus from selection alone", () => {
    expect(
      activeCanvasObjectFocus(undefined, [
        "text-00000000-0000-4000-8000-000000000001",
      ]),
    ).toBe(undefined);
    expect(
      activeCanvasObjectFocus("arrow-00000000-0000-4000-8000-000000000002", [
        "text-00000000-0000-4000-8000-000000000001",
      ]),
    ).toBe(undefined);
  });
});
