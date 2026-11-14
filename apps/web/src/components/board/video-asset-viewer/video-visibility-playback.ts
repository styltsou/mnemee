type VisibilityPlayer = {
  isPlaying: () => boolean;
  pause: () => void;
  play: () => void;
};

export function createVideoVisibilityPlayback(
  player: VisibilityPlayer,
  page: Pick<
    Document,
    "hidden" | "addEventListener" | "removeEventListener"
  > = document,
) {
  let resumeOnReturn = false;

  const pauseWhenHidden = () => {
    if (!page.hidden || !player.isPlaying()) return;
    resumeOnReturn = true;
    player.pause();
  };

  const handleVisibilityChange = () => {
    if (page.hidden) {
      pauseWhenHidden();
    } else if (resumeOnReturn) {
      resumeOnReturn = false;
      player.play();
    }
  };

  page.addEventListener("visibilitychange", handleVisibilityChange);
  pauseWhenHidden();

  return {
    // Also check playback that starts asynchronously after the tab was hidden.
    pauseWhenHidden,
    cancelResume() {
      resumeOnReturn = false;
    },
    dispose() {
      resumeOnReturn = false;
      page.removeEventListener("visibilitychange", handleVisibilityChange);
    },
  };
}
