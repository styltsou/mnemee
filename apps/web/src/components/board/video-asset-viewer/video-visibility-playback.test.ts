import { describe, expect, it, vi } from "vitest";

import { createVideoVisibilityPlayback } from "./video-visibility-playback";

class VisibilityPage extends EventTarget {
  hidden = false;

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.dispatchEvent(new Event("visibilitychange"));
  }
}

function setup({ playing = true, hidden = false } = {}) {
  const page = new VisibilityPage();
  page.hidden = hidden;
  const player = {
    playing,
    currentTime: 42.75,
    isPlaying: () => player.playing,
    pause: vi.fn(() => {
      player.playing = false;
    }),
    play: vi.fn(() => {
      player.playing = true;
    }),
  };
  const playback = createVideoVisibilityPlayback(player, page);
  return { page, player, playback };
}

describe("video visibility playback", () => {
  it("pauses on leaving the tab and resumes at the same position on return", () => {
    const { page, player } = setup();
    page.setHidden(true);
    expect(player.pause).toHaveBeenCalledOnce();
    expect(player.playing).toBe(false);

    page.setHidden(false);
    expect(player.play).toHaveBeenCalledOnce();
    expect(player.playing).toBe(true);
    expect(player.currentTime).toBe(42.75);
  });

  it("leaves a manually paused or not-yet-started video paused", () => {
    const { page, player } = setup({ playing: false });
    page.setHidden(true);
    page.setHidden(false);
    expect(player.pause).not.toHaveBeenCalled();
    expect(player.play).not.toHaveBeenCalled();
  });

  it("consumes each automatic pause once, including repeated visibility events", () => {
    const { page, player } = setup();
    page.setHidden(true);
    page.setHidden(true);
    page.setHidden(false);
    page.setHidden(false);
    expect(player.pause).toHaveBeenCalledOnce();
    expect(player.play).toHaveBeenCalledOnce();

    player.playing = false;
    page.setHidden(true);
    page.setHidden(false);
    expect(player.play).toHaveBeenCalledOnce();

    player.playing = true;
    page.setHidden(true);
    page.setHidden(false);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it("pauses a player that becomes ready while the tab is already hidden", () => {
    const { page, player } = setup({ hidden: true });
    expect(player.pause).toHaveBeenCalledOnce();
    page.setHidden(false);
    expect(player.play).toHaveBeenCalledOnce();
  });

  it("handles delayed autoplay while hidden without changing its position", () => {
    const { page, player, playback } = setup({ playing: false });
    page.setHidden(true);
    player.playing = true;
    playback.pauseWhenHidden();
    expect(player.pause).toHaveBeenCalledOnce();
    page.setHidden(false);
    expect(player.play).toHaveBeenCalledOnce();
    expect(player.currentTime).toBe(42.75);
  });

  it("leaves existing autoplay alone while visible", () => {
    const { player, playback } = setup();
    playback.pauseWhenHidden();
    expect(player.pause).not.toHaveBeenCalled();
    expect(player.play).not.toHaveBeenCalled();
    expect(player.playing).toBe(true);
  });

  it("cancels a pending resume after explicit playback changes, end, or error", () => {
    const { page, player, playback } = setup();
    page.setHidden(true);
    playback.cancelResume();
    page.setHidden(false);
    expect(player.play).not.toHaveBeenCalled();
  });

  it("does not resume a closed player or react to later tab changes", () => {
    const { page, player, playback } = setup();
    page.setHidden(true);
    playback.dispose();
    page.setHidden(false);
    expect(player.play).not.toHaveBeenCalled();

    player.playing = true;
    page.setHidden(true);
    expect(player.pause).toHaveBeenCalledOnce();
  });

  it("does not retry a blocked resume without another automatic pause", () => {
    const { page, player } = setup();
    player.play.mockImplementation(() => {});
    page.setHidden(true);
    page.setHidden(false);
    page.setHidden(true);
    page.setHidden(false);
    expect(player.play).toHaveBeenCalledOnce();
  });
});
