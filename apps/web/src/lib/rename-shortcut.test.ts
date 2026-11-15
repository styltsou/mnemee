import { describe, expect, it } from "vitest";
import { isRenameShortcut } from "./rename-shortcut";

const key = {
  key: "r",
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  isComposing: false,
  defaultPrevented: false,
};

describe("Rename shortcut", () => {
  it("accepts R without modifiers", () =>
    expect(isRenameShortcut(key)).toBe(true));
  it.each([
    "ctrlKey",
    "metaKey",
    "altKey",
    "shiftKey",
    "repeat",
    "isComposing",
    "defaultPrevented",
  ] as const)("ignores %s", (flag) => {
    expect(isRenameShortcut({ ...key, [flag]: true })).toBe(false);
  });
  it("ignores other keys", () =>
    expect(isRenameShortcut({ ...key, key: "m" })).toBe(false));
});
