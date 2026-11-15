import { describe, expect, it } from "vitest";

import { createArrowPreviewSessionTracker } from "./canvas-arrow-preview-session";

describe("arrow preview sessions", () => {
  it("prevents an older request from owning a newer active preview", () => {
    const sessions = createArrowPreviewSessionTracker();
    const resize = sessions.begin("arrow-00000000-0000-4000-8000-000000000001");
    const rotation = sessions.begin(
      "arrow-00000000-0000-4000-8000-000000000001",
    );

    expect(
      sessions.owns("arrow-00000000-0000-4000-8000-000000000001", resize),
    ).toBe(false);
    expect(
      sessions.owns("arrow-00000000-0000-4000-8000-000000000001", rotation),
    ).toBe(true);
  });

  it("tracks different arrows independently", () => {
    const sessions = createArrowPreviewSessionTracker();
    const first = sessions.begin("arrow-00000000-0000-4000-8000-000000000001");
    const second = sessions.begin("arrow-00000000-0000-4000-8000-000000000002");

    expect(
      sessions.owns("arrow-00000000-0000-4000-8000-000000000001", first),
    ).toBe(true);
    expect(
      sessions.owns("arrow-00000000-0000-4000-8000-000000000002", second),
    ).toBe(true);
  });
});
