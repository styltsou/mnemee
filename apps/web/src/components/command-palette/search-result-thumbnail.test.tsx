import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LinkSearchResultPreview } from "./search-result-thumbnail";

describe("command palette link thumbnails", () => {
  it.each([false, true])(
    "shows a blur while loading a link thumbnail (video: %s)",
    (isVideo) => {
      const html = renderToStaticMarkup(
        <LinkSearchResultPreview
          previewUrl="https://media.example/thumbnail.webp"
          blurDataURL="data:image/webp;base64,blur"
          isVideo={isVideo}
        />,
      );
      expect(html).toContain('src="data:image/webp;base64,blur"');
      expect(html).toContain('src="https://media.example/thumbnail.webp"');
      expect(html).toContain("opacity:0");
      expect(html).not.toContain("animate-image-shimmer");
    },
  );

  it("uses a skeleton for older thumbnails without blur data", () => {
    const html = renderToStaticMarkup(
      <LinkSearchResultPreview previewUrl="https://media.example/thumbnail.webp" />,
    );
    expect(html).toContain("animate-image-shimmer");
  });

  it("keeps favicons unblurred when a preview is unavailable", () => {
    const html = renderToStaticMarkup(
      <LinkSearchResultPreview
        faviconUrl="https://media.example/favicon.webp"
        blurDataURL="data:image/webp;base64,blur"
      />,
    );
    expect(html).toContain('src="https://media.example/favicon.webp"');
    expect(html).not.toContain('src="data:image/webp;base64,blur"');
    expect(html).not.toContain("animate-image-shimmer");
  });
});
