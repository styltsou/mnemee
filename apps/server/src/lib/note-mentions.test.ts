import { describe, expect, it } from "vitest";

import { extractNoteMentions, rewriteNoteMentionLabels } from "./note-mentions";

describe("note mention markdown", () => {
  it("extracts note, color, and image links while ignoring ordinary links", () => {
    expect(
      extractNoteMentions(
        "See [Plan](note:00000000-0000-4000-8000-00000000000c), [Blue](color:00000000-0000-4000-8000-000000000008), [Sunset](image:00000000-0000-4000-8000-000000000005), and [site](https://example.com).",
      ).map(({ targetAssetId, targetType, fallbackLabel }) => ({
        targetAssetId,
        targetType,
        fallbackLabel,
      })),
    ).toEqual([
      {
        targetAssetId: "00000000-0000-4000-8000-00000000000c",
        targetType: "note",
        fallbackLabel: "Plan",
      },
      {
        targetAssetId: "00000000-0000-4000-8000-000000000008",
        targetType: "color",
        fallbackLabel: "Blue",
      },
      {
        targetAssetId: "00000000-0000-4000-8000-000000000005",
        targetType: "image",
        fallbackLabel: "Sunset",
      },
    ]);
  });

  it("does not treat examples inside inline or fenced code as references", () => {
    const markdown = [
      "`[Inline](note:00000000-0000-4000-8000-000000000001)`",
      "",
      "```md",
      "[Fenced](color:00000000-0000-4000-8000-000000000002)",
      "```",
      "",
      "[Real](note:00000000-0000-4000-8000-000000000003)",
    ].join("\n");

    expect(extractNoteMentions(markdown)).toEqual([
      expect.objectContaining({
        targetAssetId: "00000000-0000-4000-8000-000000000003",
        targetType: "note",
      }),
    ]);
  });

  it("rewrites image fallbacks when labels change", () => {
    expect(
      rewriteNoteMentionLabels(
        "[Old image](image:00000000-0000-4000-8000-000000000007)",
        new Map([["image:00000000-0000-4000-8000-000000000007", "New image"]]),
      ),
    ).toBe("[New image](image:00000000-0000-4000-8000-000000000007)");
  });

  it("rewrites every matching fallback without reformatting the note", () => {
    const markdown =
      "[Old](note:00000000-0000-4000-8000-000000000004) and [Old again](note:00000000-0000-4000-8000-000000000004) plus `[Old](note:00000000-0000-4000-8000-000000000004)`.";
    expect(
      rewriteNoteMentionLabels(
        markdown,
        new Map([
          ["note:00000000-0000-4000-8000-000000000004", "New \\ title]"],
        ]),
      ),
    ).toBe(
      "[New _ title_](note:00000000-0000-4000-8000-000000000004) and [New _ title_](note:00000000-0000-4000-8000-000000000004) plus `[Old](note:00000000-0000-4000-8000-000000000004)`.",
    );
  });
});
