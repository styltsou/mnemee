function transformToRect(from: DOMRect, to: DOMRect) {
  return `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`;
}

function createThumbnailPreview(
  cardHero: HTMLElement,
  modalHero: HTMLElement,
  rect: DOMRect,
) {
  const thumbnail = Array.from(cardHero.querySelectorAll("img"))
    .reverse()
    .find(
      (image) =>
        image.complete &&
        image.naturalWidth > 0 &&
        Number(getComputedStyle(image).opacity) > 0,
    );
  if (!thumbnail?.currentSrc) return undefined;

  const preview = document.createElement("img");
  preview.dataset.assetMorphHero = "";
  preview.setAttribute("aria-hidden", "true");
  preview.alt = "";
  preview.decoding = "async";
  preview.src = thumbnail.currentSrc;
  Object.assign(preview.style, {
    position: "fixed",
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius: getComputedStyle(modalHero).borderRadius,
    objectFit: "cover",
    transformOrigin: "top left",
    zIndex: "111",
    pointerEvents: "none",
  });
  document.body.append(preview);
  return preview;
}

export function startImageAssetModalMorph({
  direction,
  card,
  cardHero,
  cardHeroRect,
  surfaceRect,
  modal,
  modalHero,
  modalHeroRect,
  modalRect,
  backdrop,
  timing,
  restoredCardVisibility,
}: {
  direction: "open" | "close";
  card: HTMLElement;
  cardHero: HTMLElement;
  cardHeroRect: DOMRect;
  surfaceRect: DOMRect;
  modal: HTMLElement;
  modalHero: HTMLElement;
  modalHeroRect: DOMRect;
  modalRect: DOMRect;
  backdrop?: HTMLElement | null;
  timing: KeyframeAnimationOptions;
  restoredCardVisibility?: string;
}) {
  const opening = direction === "open";
  const panelAtCard = transformToRect(modalRect, surfaceRect);
  const previousCardVisibility = card.style.visibility;
  // Keep the dialog at its final layout and move a single, already loaded image
  // with it. The real image takes over at the end of the opening animation.
  const preview = createThumbnailPreview(cardHero, modalHero, modalHeroRect);
  modal.dataset.assetImageMorphing = direction;
  card.style.visibility = "hidden";

  const animations: Animation[] = [];
  let cleanedUp = false;
  const cleanup = (completed: boolean) => {
    if (cleanedUp) return;
    cleanedUp = true;
    for (const animation of animations) animation.cancel();
    preview?.remove();
    delete modal.dataset.assetImageMorphing;
    if (!completed || !opening) {
      card.style.visibility = completed
        ? (restoredCardVisibility ?? previousCardVisibility)
        : previousCardVisibility;
    }
  };

  try {
    const panelAnimation = modal.animate(
      opening
        ? [
            { transform: panelAtCard, opacity: 0, offset: 0 },
            { opacity: 0, offset: 0.35 },
            { opacity: 1, offset: 0.85 },
            { transform: "none", opacity: 1, offset: 1 },
          ]
        : [
            { transform: "none", opacity: 1, offset: 0 },
            { opacity: 1, offset: 0.15 },
            { opacity: 0, offset: 0.85 },
            { transform: panelAtCard, opacity: 0, offset: 1 },
          ],
      timing,
    );
    animations.push(panelAnimation);
    if (preview) {
      const imageAtCard = transformToRect(modalHeroRect, cardHeroRect);
      animations.push(
        preview.animate(
          opening
            ? [{ transform: imageAtCard }, { transform: "none" }]
            : [{ transform: "none" }, { transform: imageAtCard }],
          timing,
        ),
      );
      animations.push(
        modalHero.animate([{ opacity: 0 }, { opacity: 0 }], timing),
      );
    }
    if (backdrop) {
      animations.push(
        backdrop.animate(
          opening
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 1 }, { opacity: 0 }],
          { ...timing, easing: "linear" },
        ),
      );
    }
    const finished = Promise.all(
      animations.map((animation) => animation.finished),
    ).then(
      () => cleanup(true),
      () => cleanup(false),
    );
    return { finished, cancel: () => cleanup(false) };
  } catch {
    for (const animation of animations) void animation.finished.catch(() => {});
    cleanup(false);
    return undefined;
  }
}
