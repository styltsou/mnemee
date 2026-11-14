import { describe, expect, it } from "vitest";

import {
  classifyClipboardText,
  getDroppedHttpUrl,
  getPreferredClipboardText,
  parsePastedColor,
} from "./clipboard";

describe("clipboard text classification", () => {
  it.each([
    [" #AbC ", "#aabbcc"],
    ["#abcd", "#aabbccdd"],
    ["#12345678", "#12345678"],
  ])("recognizes %s as a color", (input, hex) => {
    expect(classifyClipboardText(input)).toEqual({ kind: "color-hex", hex });
  });

  it("keeps URLs and ordinary or invalid text in their original categories", () => {
    expect(classifyClipboardText("https://example.com/#abc")).toEqual({
      kind: "link-url",
      url: "https://example.com/#abc",
    });
    for (const text of ["#12345", "#hello", "red", "color: #abc"]) {
      expect(classifyClipboardText(text)).toEqual({
        kind: "text-note",
        content: text,
      });
    }
    expect(parsePastedColor("#12zzzz")).toBeUndefined();
  });
});

describe("getPreferredClipboardText", () => {
  it("prefers the Markdown clipboard representation", () => {
    const clipboard = {
      getData: (type: string) =>
        type === "text/markdown" ? "# Heading\n\nBody" : "Heading Body",
    } as Pick<DataTransfer, "getData">;

    expect(getPreferredClipboardText(clipboard)).toBe("# Heading\n\nBody");
  });

  it("preserves whitespace in the plain-text fallback", () => {
    const content = "    indented code\nline with a hard break  \n";
    const clipboard = {
      getData: (type: string) => (type === "text/plain" ? content : ""),
    } as Pick<DataTransfer, "getData">;

    expect(getPreferredClipboardText(clipboard)).toBe(content);
  });
});

describe("getDroppedHttpUrl", () => {
  it("uses the first non-comment URI-list entry", () => {
    const transfer = {
      getData: (type: string) =>
        type === "text/uri-list"
          ? "# browser source\nhttps://example.com/path\n"
          : "",
    } as Pick<DataTransfer, "getData">;
    expect(getDroppedHttpUrl(transfer)).toBe("https://example.com/path");
  });

  it("rejects non-HTTP drops", () => {
    const transfer = {
      getData: () => "javascript:alert(1)",
    } as Pick<DataTransfer, "getData">;
    expect(getDroppedHttpUrl(transfer)).toBeUndefined();
  });
});
