import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ColorAssetTitle } from "./color-asset-title";

const namingState = vi.hoisted(() => ({
  pending: {} as Record<string, boolean>,
}));
vi.mock("@/lib/gradient-naming", () => ({
  useGradientNaming: (selector: (state: typeof namingState) => boolean) =>
    selector(namingState),
}));
vi.mock("@/api/collection", () => ({
  useUpdateColor: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/color-name-pending", () => ({
  useSolidNamePending: () => false,
}));

describe("ColorAssetTitle", () => {
  it("keeps the view's inherited typography while its title shimmers", () => {
    const id = "color-00000000-0000-4000-8000-000000000003";
    const color = {
      id,
      type: "color" as const,
      title: "Ocean Mist",
      hex: "#1a2b3c",
      isFavorite: false,
    };
    const renderTitle = () =>
      renderToStaticMarkup(
        <ColorAssetTitle color={color} workspaceSlug="workspace" />,
      );

    expect(renderTitle()).toContain("[font:inherit]");
    namingState.pending[id] = true;
    try {
      const html = renderTitle();
      expect(html).toContain("[font:inherit]");
      expect(html).toContain("animate-gradient-name-sweep");
      expect(html).toContain("Ocean Mist");
    } finally {
      delete namingState.pending[id];
    }
  });
});
