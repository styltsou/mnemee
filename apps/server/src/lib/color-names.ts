import chroma from "chroma-js";
import { colornames } from "color-name-list";

const HEX_PATTERN = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

// CSS Color 4 keywords, with readable labels. For aliases, prefer Gray,
// Cyan and Magenta. Keep this separate from the community dictionary so
// familiar CSS values always retain their standard meaning (notably Green).
const cssLabels = `Alice Blue|Antique White|Aquamarine|Azure|Beige|Bisque|Black|
Blanched Almond|Blue|Blue Violet|Brown|Burly Wood|Cadet Blue|Chartreuse|Chocolate|
Coral|Cornflower Blue|Cornsilk|Crimson|Cyan|Dark Blue|Dark Cyan|Dark Goldenrod|
Dark Gray|Dark Green|Dark Khaki|Dark Magenta|Dark Olive Green|Dark Orange|
Dark Orchid|Dark Red|Dark Salmon|Dark Sea Green|Dark Slate Blue|Dark Slate Gray|
Dark Turquoise|Dark Violet|Deep Pink|Deep Sky Blue|Dim Gray|Dodger Blue|Firebrick|
Floral White|Forest Green|Gainsboro|Ghost White|Gold|Goldenrod|Gray|Green|
Green Yellow|Honeydew|Hot Pink|Indian Red|Indigo|Ivory|Khaki|Lavender|
Lavender Blush|Lawn Green|Lemon Chiffon|Light Blue|Light Coral|Light Cyan|
Light Goldenrod Yellow|Light Gray|Light Green|Light Pink|Light Salmon|
Light Sea Green|Light Sky Blue|Light Slate Gray|Light Steel Blue|Light Yellow|
Lime|Lime Green|Linen|Magenta|Maroon|Medium Aquamarine|Medium Blue|Medium Orchid|
Medium Purple|Medium Sea Green|Medium Slate Blue|Medium Spring Green|
Medium Turquoise|Medium Violet Red|Midnight Blue|Mint Cream|Misty Rose|Moccasin|
Navajo White|Navy|Old Lace|Olive|Olive Drab|Orange|Orange Red|Orchid|
Pale Goldenrod|Pale Green|Pale Turquoise|Pale Violet Red|Papaya Whip|Peach Puff|
Peru|Pink|Plum|Powder Blue|Purple|Rebecca Purple|Red|Rosy Brown|Royal Blue|
Saddle Brown|Salmon|Sandy Brown|Sea Green|Seashell|Sienna|Silver|Sky Blue|
Slate Blue|Slate Gray|Snow|Spring Green|Steel Blue|Tan|Teal|Thistle|Tomato|
Turquoise|Violet|Wheat|White|White Smoke|Yellow|Yellow Green`;

const cssNames = new Map(
  cssLabels.split("|").map((label) => {
    const name = label.trim();
    return [chroma(name.toLowerCase().replaceAll(" ", "")).hex(), name];
  }),
);
const exactNames = new Map(colornames.map(({ hex, name }) => [hex, name]));
let perceptualColors:
  | Array<{ name: string; lab: [number, number, number] }>
  | undefined;

/**
 * Normalizes any accepted hex input into the canonical stored form:
 * lowercase, 6-digit when opaque, 8-digit only when transparency is present.
 */
export function normalizeHexColor(input: string): string {
  const raw = input.replace(/^#/, "").toLowerCase();

  if (raw.length === 3 || raw.length === 4) {
    return `#${[...raw].map((char) => char + char).join("")}`;
  }

  return `#${raw}`;
}

/** Returns true when the whole string is a hex color token. */
export function isHexColor(input: string): boolean {
  return HEX_PATTERN.test(input.trim());
}

/**
 * Prefer exact CSS names, then exact Color Names entries, then the closest
 * entry in the full dictionary using Euclidean OKLab distance. Alpha is
 * ignored: names describe the RGB identity of the color.
 */
export function getColorName(hex: string): string | null {
  if (!isHexColor(hex)) return null;
  const rgb = normalizeHexColor(hex.trim()).slice(0, 7);
  const exact = cssNames.get(rgb) ?? exactNames.get(rgb);
  if (exact) return exact;

  // Build only when proximity is needed; reuse coordinates across calls.
  perceptualColors ??= colornames.map(({ hex, name }) => ({
    name: cssNames.get(hex) ?? name,
    lab: chroma(hex).oklab(),
  }));
  const [l, a, b] = chroma(rgb).oklab();
  let closest: string | null = null;
  let minDistance = Infinity;
  for (const candidate of perceptualColors) {
    const [cl, ca, cb] = candidate.lab;
    const distance = (l - cl) ** 2 + (a - ca) ** 2 + (b - cb) ** 2;
    if (distance < minDistance) {
      minDistance = distance;
      closest = candidate.name;
    }
  }
  return closest;
}
