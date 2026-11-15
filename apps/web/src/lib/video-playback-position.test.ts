import { afterEach, describe, expect, it, vi } from "vitest";

import {
  consumeVideoPlaybackPosition,
  recordVideoPlaybackPosition,
} from "./video-playback-position";

describe("video playback position handoff", () => {
  afterEach(() => vi.useRealTimers());

  it("hands a recent preview position to the viewer once", () => {
    recordVideoPlaybackPosition(
      "video-00000000-0000-4000-8000-000000000001",
      12.75,
    );

    expect(
      consumeVideoPlaybackPosition(
        "video-00000000-0000-4000-8000-000000000001",
      ),
    ).toBe(12.75);
    expect(
      consumeVideoPlaybackPosition(
        "video-00000000-0000-4000-8000-000000000001",
      ),
    ).toBeUndefined();
  });

  it("expires an activation handoff that no viewer consumes", () => {
    vi.useFakeTimers();
    recordVideoPlaybackPosition(
      "video-00000000-0000-4000-8000-000000000002",
      4,
    );
    vi.advanceTimersByTime(1_000);

    expect(
      consumeVideoPlaybackPosition(
        "video-00000000-0000-4000-8000-000000000002",
      ),
    ).toBeUndefined();
  });
});
