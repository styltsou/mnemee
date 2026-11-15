import { describe, expect, it } from "vitest";

import {
  MAX_CANVAS_FRONT_INDEX,
  planCanvasFrontIndexUpdates,
} from "./canvas-stacking-order";

describe("canvas stacking order", () => {
  it("places requested items above the existing maximum", () => {
    expect(
      planCanvasFrontIndexUpdates(
        [
          { id: "note-00000000-0000-4000-8000-000000000001", frontIndex: 2 },
          { id: "text-00000000-0000-4000-8000-000000000002", frontIndex: 8 },
        ],
        [
          "image-00000000-0000-4000-8000-000000000003",
          "note-00000000-0000-4000-8000-000000000001",
        ],
      ),
    ).toEqual([
      { id: "image-00000000-0000-4000-8000-000000000003", frontIndex: 9 },
      { id: "note-00000000-0000-4000-8000-000000000001", frontIndex: 10 },
    ]);
  });

  it("rebases retained items before assigning the requested group", () => {
    expect(
      planCanvasFrontIndexUpdates(
        [
          {
            id: "note-00000000-0000-4000-8000-000000000001",
            frontIndex: MAX_CANVAS_FRONT_INDEX,
          },
          { id: "text-00000000-0000-4000-8000-000000000002", frontIndex: 4 },
          { id: "image-00000000-0000-4000-8000-000000000003", frontIndex: 12 },
        ],
        [
          "image-00000000-0000-4000-8000-000000000003",
          "text-00000000-0000-4000-8000-000000000002",
        ],
      ),
    ).toEqual([
      { id: "note-00000000-0000-4000-8000-000000000001", frontIndex: 0 },
      { id: "image-00000000-0000-4000-8000-000000000003", frontIndex: 1 },
      { id: "text-00000000-0000-4000-8000-000000000002", frontIndex: 2 },
    ]);
  });
});
