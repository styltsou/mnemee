import { describe, expect, it } from "vitest";
import { getBreadcrumbLayout } from "./breadcrumb-layout";

describe("breadcrumb layout", () => {
  it("prioritizes trailing segments beside selection actions", () => {
    expect(getBreadcrumbLayout([140, 80, 80, 80, 80], 500, true)).toEqual({
      showRoot: false,
      tailCount: 4,
    });
  });
  it("retains the current segment when selection leaves very little space", () => {
    expect(getBreadcrumbLayout([140, 80, 200], 80, true)).toEqual({
      showRoot: false,
      tailCount: 1,
    });
  });
  it("keeps short paths visible when there is room", () => {
    expect(getBreadcrumbLayout([80, 80, 80], 400)).toEqual({
      showRoot: true,
      tailCount: 2,
    });
  });
  it("folds older locations on a narrow header even when they fit", () => {
    expect(getBreadcrumbLayout([60, 60, 60, 60, 60], 450)).toEqual({
      showRoot: true,
      tailCount: 2,
    });
  });
  it("reserves breathing room and retains the current location", () => {
    expect(getBreadcrumbLayout([90, 100, 120], 280)).toEqual({
      showRoot: false,
      tailCount: 1,
    });
  });
  it("keeps more of a path on wide headers", () => {
    expect(getBreadcrumbLayout([60, 60, 60, 60, 60], 700)).toEqual({
      showRoot: true,
      tailCount: 4,
    });
  });
});
