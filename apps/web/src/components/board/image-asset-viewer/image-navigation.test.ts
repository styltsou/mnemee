import { describe, expect, it } from "vitest";

import type { ImageAsset } from "@/types/asset";
import { getImageNavigation } from "./image-navigation";

const images = [
  "image-00000000-0000-4000-8000-000000000001",
  "image-00000000-0000-4000-8000-000000000002",
  "image-00000000-0000-4000-8000-000000000003",
].map(
  (id): ImageAsset => ({
    id,
    type: "image",
    url: `https://example.com/${id}.webp`,
    width: 100,
    height: 100,
  }),
);

describe("image viewer navigation", () => {
  it("stops at the beginning of the list", () => {
    const navigation = getImageNavigation(
      images,
      "image-00000000-0000-4000-8000-000000000001",
    );

    expect(navigation.currentIndex).toBe(0);
    expect(navigation.previousAsset).toBeUndefined();
    expect(navigation.nextAsset?.id).toBe(
      "image-00000000-0000-4000-8000-000000000002",
    );
  });

  it("provides both directions from the middle", () => {
    const navigation = getImageNavigation(
      images,
      "image-00000000-0000-4000-8000-000000000002",
    );

    expect(navigation.previousAsset?.id).toBe(
      "image-00000000-0000-4000-8000-000000000001",
    );
    expect(navigation.nextAsset?.id).toBe(
      "image-00000000-0000-4000-8000-000000000003",
    );
  });

  it("stops at the end of the list", () => {
    const navigation = getImageNavigation(
      images,
      "image-00000000-0000-4000-8000-000000000003",
    );

    expect(navigation.previousAsset?.id).toBe(
      "image-00000000-0000-4000-8000-000000000002",
    );
    expect(navigation.nextAsset).toBeUndefined();
  });

  it("disables navigation when the current image is unavailable", () => {
    expect(
      getImageNavigation(images, "image-00000000-0000-4000-8000-000000000063"),
    ).toEqual({
      currentIndex: -1,
      previousAsset: undefined,
      nextAsset: undefined,
    });
  });
});
