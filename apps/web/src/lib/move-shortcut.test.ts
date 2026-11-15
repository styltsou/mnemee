import { describe, expect, it } from "vitest";
import { isMoveShortcut } from "./move-shortcut";

const moveKey = {
  key: "m",
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  isComposing: false,
  defaultPrevented: false,
};

describe("Move shortcut", () => {
  it("accepts an unmodified M key", () => {
    expect(isMoveShortcut(moveKey)).toBe(true);
  });

  it.each([
    "ctrlKey",
    "metaKey",
    "altKey",
    "shiftKey",
    "repeat",
    "isComposing",
    "defaultPrevented",
  ] as const)("ignores %s", (flag) => {
    expect(isMoveShortcut({ ...moveKey, [flag]: true })).toBe(false);
  });

  it("ignores other keys", () => {
    expect(isMoveShortcut({ ...moveKey, key: "Delete" })).toBe(false);
  });
});
