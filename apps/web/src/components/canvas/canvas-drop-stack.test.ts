import { describe, expect, it } from "vitest";

import {
  getCanvasDropStackPlacementOrder,
  getDropStackPlacementOrder,
  makeCanvasDropStackStyles,
} from "./canvas-drop-stack";

describe("canvas drop stack", () => {
  it("places the grabbed card on top of the same trailing order shown in flight", () => {
    const origins = new Map([
      ["image-00000000-0000-4000-8000-000000000001", { x: 400, y: 40 }],
      ["note-00000000-0000-4000-8000-000000000002", { x: 100, y: 100 }],
      ["color-00000000-0000-4000-8000-000000000003", { x: -80, y: 250 }],
    ]);
    const styles = makeCanvasDropStackStyles(
      "note-00000000-0000-4000-8000-000000000002",
      origins,
    );
    const placementOrder = getCanvasDropStackPlacementOrder(
      "note-00000000-0000-4000-8000-000000000002",
      origins,
    );

    expect(placementOrder).toEqual([
      "color-00000000-0000-4000-8000-000000000003",
      "image-00000000-0000-4000-8000-000000000001",
      "note-00000000-0000-4000-8000-000000000002",
    ]);
    expect([...placementOrder].reverse()).toEqual(
      [...styles.entries()]
        .sort((left, right) => right[1].stackOrder - left[1].stackOrder)
        .map(([id]) => id),
    );
  });

  it("uses the same back-to-front order for grid moves", () => {
    expect(
      getDropStackPlacementOrder("note-00000000-0000-4000-8000-000000000002", [
        "image-00000000-0000-4000-8000-000000000001",
        "note-00000000-0000-4000-8000-000000000002",
        "color-00000000-0000-4000-8000-000000000003",
      ]),
    ).toEqual([
      "color-00000000-0000-4000-8000-000000000003",
      "image-00000000-0000-4000-8000-000000000001",
      "note-00000000-0000-4000-8000-000000000002",
    ]);
  });

  it("keeps the grabbed card fixed and stacks the other cards around it", () => {
    const styles = makeCanvasDropStackStyles(
      "note-00000000-0000-4000-8000-000000000002",
      new Map([
        ["image-00000000-0000-4000-8000-000000000001", { x: 400, y: 40 }],
        ["note-00000000-0000-4000-8000-000000000002", { x: 100, y: 100 }],
        ["folder-00000000-0000-4000-8000-000000000003", { x: -80, y: 250 }],
      ]),
    );

    expect(
      styles.get("note-00000000-0000-4000-8000-000000000002"),
    ).toMatchObject({
      translateX: 0,
      translateY: 0,
      rotation: 0,
      scale: 0.72,
    });
    expect(
      styles.get("image-00000000-0000-4000-8000-000000000001"),
    ).toMatchObject({
      translateX: -315,
      translateY: 106,
      rotation: -3.5,
      scale: 0.72,
    });
    expect(
      styles.get("folder-00000000-0000-4000-8000-000000000003"),
    ).toMatchObject({
      translateX: 203,
      translateY: -68,
      rotation: 5,
      scale: 0.72,
    });
    expect(
      styles.get("note-00000000-0000-4000-8000-000000000002")!.stackOrder,
    ).toBeGreaterThan(
      styles.get("image-00000000-0000-4000-8000-000000000001")!.stackOrder,
    );
    expect(
      styles.get("note-00000000-0000-4000-8000-000000000002")!.stackOrder,
    ).toBeGreaterThan(
      styles.get("folder-00000000-0000-4000-8000-000000000003")!.stackOrder,
    );
  });

  it("uses one scale while increasing each trailing card's visible peek", () => {
    const origins = new Map(
      Array.from({ length: 12 }, (_, index) => [
        `note-${index + 1}`,
        { x: index * 100, y: index * 50 },
      ]),
    );
    const styles = makeCanvasDropStackStyles(
      "note-00000000-0000-4000-8000-000000000001",
      origins,
    );
    let previousStackedY = 0;

    for (const [nodeId, style] of styles) {
      if (nodeId === "note-00000000-0000-4000-8000-000000000001") continue;
      const origin = origins.get(nodeId)!;
      const stackedX = origin.x + style.translateX;
      const stackedY = origin.y + style.translateY;

      expect(Math.abs(stackedX)).toBeLessThanOrEqual(23);
      expect(stackedY).toBeGreaterThanOrEqual(16);
      expect(stackedY).toBeLessThanOrEqual(82);
      expect(Math.abs(style.rotation)).toBeLessThanOrEqual(5);
      expect(style.scale).toBe(0.72);
      expect(style.delayMs).toBeLessThanOrEqual(32);
      expect(stackedY).toBeGreaterThan(previousStackedY);

      previousStackedY = stackedY;
    }
  });

  it("compresses a single grabbed card over a folder target", () => {
    const styles = makeCanvasDropStackStyles(
      "note-00000000-0000-4000-8000-000000000001",
      new Map([["note-00000000-0000-4000-8000-000000000001", { x: 0, y: 0 }]]),
    );

    expect(
      styles.get("note-00000000-0000-4000-8000-000000000001"),
    ).toMatchObject({
      translateX: 0,
      translateY: 0,
      rotation: 0,
      scale: 0.72,
    });
  });

  it("keeps portrait and landscape cards aligned regardless of the drag handle", () => {
    const portraitHeight = 480;
    const landscapeHeight = 180;
    const landscapePrimary = makeCanvasDropStackStyles(
      "landscape",
      new Map([
        ["landscape", { x: 100, y: 100, height: landscapeHeight }],
        ["portrait", { x: 20, y: 40, height: portraitHeight }],
      ]),
    );
    const portraitPrimary = makeCanvasDropStackStyles(
      "portrait",
      new Map([
        ["landscape", { x: 20, y: 40, height: landscapeHeight }],
        ["portrait", { x: 100, y: 100, height: portraitHeight }],
      ]),
    );

    expect(visibleTop("landscape", 100, landscapePrimary)).toBeCloseTo(
      visibleTop("portrait", 40, landscapePrimary) - 82,
    );
    expect(visibleTop("portrait", 100, portraitPrimary)).toBeCloseTo(
      visibleTop("landscape", 40, portraitPrimary) - 82,
    );
  });

  it("returns no stack for a missing grabbed card", () => {
    expect(
      makeCanvasDropStackStyles(
        "note-00000000-0000-4000-8000-000000000009",
        new Map([
          ["note-00000000-0000-4000-8000-000000000001", { x: 0, y: 0 }],
          ["note-00000000-0000-4000-8000-000000000002", { x: 100, y: 0 }],
        ]),
      ),
    ).toEqual(new Map());
  });
});

function visibleTop(
  nodeId: string,
  originY: number,
  styles: ReturnType<typeof makeCanvasDropStackStyles>,
) {
  const style = styles.get(nodeId)!;
  const height = nodeId === "portrait" ? 480 : 180;
  return originY + style.translateY + height * (1 - style.scale);
}
