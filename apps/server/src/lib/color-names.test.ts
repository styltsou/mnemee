import { describe, expect, it } from "vitest";
import { getColorName } from "./color-names";

describe("automatic color names", () => {
  it.each([
    ["#ff0000", "Red"],
    ["#008000", "Green"],
    ["#00ff00", "Lime"],
    ["#663399", "Rebecca Purple"],
    ["#f0f8ff", "Alice Blue"],
    ["#fafad2", "Light Goldenrod Yellow"],
    ["#808080", "Gray"],
    ["#00ffff", "Cyan"],
    ["#ff00ff", "Magenta"],
  ])("prefers the CSS name for %s", (hex, name) => {
    expect(getColorName(hex)).toBe(name);
  });

  it.each([
    ["#16161d", "Eigengrau"],
    ["#abcdef", "Alphabet Blue"],
    ["#123456", "Incremental Blue"],
  ])("uses the full dictionary for exact match %s", (hex, name) => {
    expect(getColorName(hex)).toBe(name);
  });

  it("uses perceptual proximity across the full dictionary", () => {
    expect(getColorName("#123457")).toBe("Incremental Blue");
    expect(getColorName("#f1c1d1")).toBe("Guava Glow");
    expect(getColorName("#d94732")).toBe("Goblet Waxcap");
    // Repeated lookups give stable results after coordinates are initialized.
    expect(getColorName("#123457")).toBe("Incremental Blue");
  });

  it("normalizes shorthand and case and ignores alpha", () => {
    for (const hex of ["#F00", "#F000", "#FF000080", " #FF0000 "]) {
      expect(getColorName(hex)).toBe("Red");
    }
    expect(getColorName("#ABCD")).toBe(getColorName("#aabbcc"));
    expect(getColorName("#16161d00")).toBe("Eigengrau");
  });

  it.each(["", "red", "#12", "#gggggg", "#12345", "#123456789"])(
    "returns null for invalid hex %s",
    (hex) => expect(getColorName(hex)).toBeNull(),
  );
});
