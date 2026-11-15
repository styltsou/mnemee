import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ColorAssetCard } from "./color-asset-card";

const namingState = vi.hoisted(() => ({
  pending: {} as Record<string, boolean>,
}));
vi.mock("@/lib/gradient-naming", () => ({
  useGradientNaming: (selector: (state: typeof namingState) => boolean) =>
    selector(namingState),
}));

describe("ColorAssetCard", () => {
  it("stacks a square swatch above the card surface", () => {
    const html = renderToStaticMarkup(
      <ColorAssetCard
        asset={{
          id: "color-00000000-0000-4000-8000-000000000001",
          type: "color",
          hex: "#1a2b3c",
          title: "Midnight blue",
          isFavorite: false,
        }}
      />,
    );

    expect(html).toContain("aspect-square w-full");
    expect(html).toContain("aspect-square w-full overflow-hidden rounded-b-lg");
    expect(html).toContain("rounded-b-lg border-b border-border");
    expect(html).not.toContain('class="p-3"');
    expect(html).toContain("data-asset-card-outline");
    expect(html).toContain("hover:border-sidebar-foreground/20");
    expect(html).toContain("transition-colors duration-100");
    expect(html).not.toContain("transition-all");
    expect(html).toContain(
      "flex min-w-0 items-center gap-3 bg-sidebar p-3 leading-6",
    );
    expect(html).not.toContain("border-t border-sidebar-foreground/10");
  });

  it("promotes the hex value when the color has no name", () => {
    const html = renderToStaticMarkup(
      <ColorAssetCard
        asset={{
          id: "color-00000000-0000-4000-8000-000000000001",
          type: "color",
          hex: "#1a2b3c",
          title: null,
          isFavorite: false,
        }}
      />,
    );

    expect(html.match(/#1A2B3C/g)).toHaveLength(1);
    expect(html).toContain("font-mono text-lg font-semibold");
  });

  it("uses title typography for the shimmering fallback while naming", () => {
    const id = "color-00000000-0000-4000-8000-000000000002";
    namingState.pending[id] = true;
    try {
      const html = renderToStaticMarkup(
        <ColorAssetCard
          asset={{
            id,
            type: "color",
            hex: "#1a2b3c",
            title: null,
            isFavorite: false,
          }}
        />,
      );

      expect(html).toContain("animate-gradient-name-sweep");
      expect(html).toContain("text-base");
      expect(html).not.toContain("font-mono text-lg font-semibold");
    } finally {
      delete namingState.pending[id];
    }
  });

  it("uses the saved gradient title instead of its first stop", () => {
    const html = renderToStaticMarkup(
      <ColorAssetCard
        asset={{
          id: "color-00000000-0000-4000-8000-000000000001",
          type: "color",
          hex: null,
          title: "Radial Gradient",
          isFavorite: false,
          gradient: {
            from: "#f43f5e",
            to: "#7c3aed",
            angle: 135,
            type: "radial",
          },
        }}
      />,
    );

    expect(html).toContain("Radial Gradient");
    expect(html).not.toContain("#F43F5E");
  });
});
