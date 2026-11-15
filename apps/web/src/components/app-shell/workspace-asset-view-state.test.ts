import { describe, expect, it } from "vitest";

import {
  openAssetPresentation,
  syncAssetPresentationToUrl,
} from "./workspace-asset-view-state";

describe("workspace asset presentation", () => {
  it("opens immediately while the URL navigation is pending", () => {
    expect(
      openAssetPresentation("image-00000000-0000-4000-8000-000000000002"),
    ).toEqual({
      assetId: "image-00000000-0000-4000-8000-000000000002",
      open: true,
      urlStatus: "pending",
    });
  });

  it("acknowledges the matching URL without closing the presentation", () => {
    const pending = openAssetPresentation(
      "image-00000000-0000-4000-8000-000000000002",
    );

    expect(
      syncAssetPresentationToUrl(
        pending,
        "image-00000000-0000-4000-8000-000000000002",
      ),
    ).toEqual({
      assetId: "image-00000000-0000-4000-8000-000000000002",
      open: true,
      urlStatus: "committed",
    });
  });

  it("switches directly to a browser-history asset", () => {
    const current = openAssetPresentation(
      "image-00000000-0000-4000-8000-000000000002",
      "image-00000000-0000-4000-8000-000000000002",
    );

    expect(
      syncAssetPresentationToUrl(
        current,
        "color-00000000-0000-4000-8000-000000000004",
      ),
    ).toEqual({
      assetId: "color-00000000-0000-4000-8000-000000000004",
      open: true,
      urlStatus: "committed",
    });
  });

  it("animates a URL close without another history mutation", () => {
    const current = openAssetPresentation(
      "image-00000000-0000-4000-8000-000000000008",
      "image-00000000-0000-4000-8000-000000000008",
    );
    const closing = syncAssetPresentationToUrl(current);

    expect(closing).toMatchObject({ open: false });
    expect(
      syncAssetPresentationToUrl(
        closing,
        "image-00000000-0000-4000-8000-000000000008",
      ),
    ).toEqual(current);
  });

  it("does not mistake the pre-commit URL for an external navigation", () => {
    const pending = openAssetPresentation(
      "image-00000000-0000-4000-8000-000000000009",
      "image-00000000-0000-4000-8000-000000000008",
    );

    expect(syncAssetPresentationToUrl(pending)).toBe(pending);
  });
});
