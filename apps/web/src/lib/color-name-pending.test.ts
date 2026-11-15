import { describe, expect, it } from "vitest";
import type { ColorAsset } from "@/types/asset";
import { isSolidNameUpdate } from "./color-name-pending";

const color: ColorAsset = {
  id: "color-1",
  type: "color",
  hex: "#123456",
  title: "Blue",
  isFavorite: false,
};

describe("solid color naming updates", () => {
  it("tracks automatic names during color edits and title regeneration", () => {
    expect(
      isSolidNameUpdate(color, {
        assetId: color.id,
        hex: "#abcdef",
        gradient: null,
      }),
    ).toBe(true);
    expect(
      isSolidNameUpdate(
        { ...color, nameEditedByUser: true },
        { assetId: color.id, regenerateTitle: true },
      ),
    ).toBe(true);
    expect(isSolidNameUpdate(color, { assetId: color.id, title: null })).toBe(
      true,
    );
  });

  it("ignores manual names, notes, other colors, and gradients", () => {
    expect(
      isSolidNameUpdate(
        { ...color, nameEditedByUser: true },
        { assetId: color.id, hex: "#abcdef" },
      ),
    ).toBe(false);
    expect(
      isSolidNameUpdate(color, { assetId: color.id, title: "Custom" }),
    ).toBe(false);
    expect(isSolidNameUpdate(color, { assetId: color.id, note: "Note" })).toBe(
      false,
    );
    expect(isSolidNameUpdate(color, { assetId: "other", hex: "#abcdef" })).toBe(
      false,
    );
    expect(
      isSolidNameUpdate(color, {
        assetId: color.id,
        gradient: { from: "#123456", to: "#abcdef", angle: 90, type: "linear" },
      }),
    ).toBe(false);
  });
});
