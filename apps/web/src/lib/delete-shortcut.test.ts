import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isDeleteShortcut,
  isDeleteSurfaceBlocked,
  removeFocusedEntry,
} from "./delete-shortcut";

afterEach(() => vi.unstubAllGlobals());

const deleteKey = {
  key: "Delete",
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  isComposing: false,
  defaultPrevented: false,
};

describe("Delete shortcut", () => {
  it("accepts the unmodified Delete key", () => {
    expect(isDeleteShortcut(deleteKey)).toBe(true);
  });

  it.each([
    "ctrlKey",
    "metaKey",
    "altKey",
    "shiftKey",
    "repeat",
    "isComposing",
    "defaultPrevented",
  ] as const)("ignores %s to avoid destructive surprises", (flag) => {
    expect(isDeleteShortcut({ ...deleteKey, [flag]: true })).toBe(false);
  });

  it.each(["Backspace", "Enter", "Escape", "Del"])(
    "does not treat %s as Delete",
    (key) => {
      expect(isDeleteShortcut({ ...deleteKey, key })).toBe(false);
    },
  );
});

// These fixtures model surface ownership; real browser checks cover the DOM
// selectors and focus behavior of the corresponding controls.
class Surface {
  closest = vi.fn<() => Surface | null>(() => null);
  matches = vi.fn(() => false);
  querySelector = vi.fn<() => Surface | null>(() => null);
  getClientRects = vi.fn(() => [{}]);
}

function setupSurface() {
  vi.stubGlobal("Element", Surface);
  const document = {
    querySelector: vi.fn(() => null as Surface | null),
    querySelectorAll: vi.fn(() => [] as Surface[]),
  };
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", { getSelection: () => null });
  return document;
}

describe("deletion surface ownership", () => {
  it("preserves selected text in read-only content", () => {
    setupSurface();
    vi.stubGlobal("window", { getSelection: () => ({ isCollapsed: false }) });
    expect(isDeleteSurfaceBlocked(null, "asset")).toBe(true);
  });
  it("honors explicit control focus even if an old text selection remains", () => {
    setupSurface();
    vi.stubGlobal("window", { getSelection: () => ({ isCollapsed: false }) });
    const button = new Surface();
    button.closest.mockReturnValueOnce(null).mockReturnValueOnce(button);
    expect(
      isDeleteSurfaceBlocked(button as unknown as EventTarget, "board"),
    ).toBe(false);
  });
  it("blocks board deletion while an asset viewer is open", () => {
    const document = setupSurface();
    document.querySelector.mockReturnValue(new Surface());
    expect(isDeleteSurfaceBlocked(null, "board")).toBe(true);
  });

  it("lets a viewer own its dialog but blocks its underlying board", () => {
    const document = setupSurface();
    const viewer = new Surface();
    viewer.matches.mockReturnValue(true);
    document.querySelectorAll.mockReturnValue([viewer]);
    expect(isDeleteSurfaceBlocked(null, "asset")).toBe(false);
    expect(isDeleteSurfaceBlocked(null, "board")).toBe(true);
  });

  it("blocks every surface while a confirmation or unrelated dialog is open", () => {
    const document = setupSurface();
    document.querySelectorAll.mockReturnValue([new Surface()]);
    expect(isDeleteSurfaceBlocked(null, "asset")).toBe(true);
    expect(isDeleteSurfaceBlocked(null, "board")).toBe(true);
  });

  it("ignores hidden and inert dialogs", () => {
    const document = setupSurface();
    const hidden = new Surface();
    hidden.getClientRects.mockReturnValue([]);
    const inert = new Surface();
    inert.closest.mockReturnValue(inert);
    document.querySelectorAll.mockReturnValue([hidden, inert]);
    expect(isDeleteSurfaceBlocked(null, "board")).toBe(false);
  });

  it("preserves editing inside a text control or contenteditable", () => {
    setupSurface();
    const input = new Surface();
    input.closest.mockReturnValue(input);
    expect(
      isDeleteSurfaceBlocked(input as unknown as EventTarget, "board"),
    ).toBe(true);
    expect(
      isDeleteSurfaceBlocked(input as unknown as EventTarget, "asset"),
    ).toBe(true);
  });

  it("does not let local removal controls delete a background selection", () => {
    setupSurface();
    const local = new Surface();
    local.closest.mockReturnValueOnce(null).mockReturnValue(local);
    expect(
      isDeleteSurfaceBlocked(local as unknown as EventTarget, "board"),
    ).toBe(true);
  });
});

describe("local removal focus", () => {
  it.each([0, 1, 2])(
    "moves focus to the next or previous surviving entry after removing index %s",
    (index) => {
      const entries = Array.from({ length: 3 }, () => ({
        hasAttribute: () => false,
        isConnected: true,
        focus: vi.fn(),
        closest: () => group,
      }));
      const group = {
        querySelectorAll: () => entries,
        closest: () => null,
        querySelector: () => null,
      };
      const remove = vi.fn();
      vi.stubGlobal("requestAnimationFrame", (callback: () => void) =>
        callback(),
      );
      removeFocusedEntry(entries[index] as unknown as HTMLElement, remove);
      expect(remove).toHaveBeenCalledOnce();
      expect(
        entries[index + 1]?.focus ?? entries[index - 1].focus,
      ).toHaveBeenCalledOnce();
      expect(entries[index].focus).not.toHaveBeenCalled();
      const focus = entries[index + 1]?.focus ?? entries[index - 1].focus;
      expect(focus.mock.invocationCallOrder[0]).toBeLessThan(
        remove.mock.invocationCallOrder[0],
      );
    },
  );
});
