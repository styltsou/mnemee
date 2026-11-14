type DeleteKeyEvent = Pick<
  KeyboardEvent,
  | "key"
  | "ctrlKey"
  | "metaKey"
  | "altKey"
  | "shiftKey"
  | "repeat"
  | "isComposing"
  | "defaultPrevented"
>;

export function isDeleteShortcut(event: DeleteKeyEvent): boolean {
  return (
    event.key === "Delete" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.shiftKey &&
    !event.repeat &&
    !event.isComposing &&
    !event.defaultPrevented
  );
}

export function isDeleteTargetEditable(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox'], .cm-editor",
      ),
    )
  );
}

export function isDeleteSurfaceBlocked(
  target: EventTarget | null,
  surface: "board" | "asset",
): boolean {
  if (isDeleteTargetEditable(target)) return true;
  if (
    window.getSelection()?.isCollapsed === false &&
    !(
      target instanceof Element &&
      target.closest(
        "button, a, [role='button'], [role='toolbar'], [data-arrow-focus-id]",
      )
    )
  )
    return true;
  if (
    target instanceof Element &&
    target.closest(
      "[data-delete-shortcut-local], [data-selection-shortcut-block], [role='menu'], [role='listbox']",
    )
  )
    return true;
  if (
    surface === "board" &&
    document.querySelector(
      "[data-workspace-asset-modal]:not([inert]), [aria-label='Peeked reference']:focus-within",
    )
  )
    return true;
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      "[role='dialog'], [role='alertdialog'], [role='menu'], [role='listbox']",
    ),
  ).some((overlay) => {
    if (
      overlay.closest("[inert], [aria-hidden='true']") ||
      overlay.getClientRects().length === 0
    )
      return false;
    // Asset viewers are the owning surface, while nested dialogs and menus
    // still block deletion of the asset behind them.
    return !(
      surface === "asset" &&
      (overlay.matches("[data-workspace-asset-modal]") ||
        overlay.querySelector("[data-workspace-asset-modal]"))
    );
  });
}

/** Remove a focused local entry and retain a useful keyboard destination. */
export function removeFocusedEntry(element: HTMLElement, remove: () => void) {
  const group = element.closest<HTMLElement>("[data-delete-entry-group]");
  const entries = group
    ? Array.from(
        group.querySelectorAll<HTMLElement>("[data-delete-entry]"),
      ).filter((entry) => !entry.hasAttribute("disabled"))
    : [];
  const index = entries.indexOf(element);
  const next = entries[index + 1] ?? entries[index - 1];
  const scope =
    group?.closest<HTMLElement>(
      "[data-delete-focus-scope], [role='dialog'], [aria-label='Pexels browser']",
    ) ?? group;
  const fallback = scope?.querySelector<HTMLElement>(
    "input:not([type='hidden']):not([type='file']):not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-delete-entry]), [tabindex='0']:not([data-delete-entry])",
  );
  // Focus traps can close a popup when its focused node disappears. Transfer
  // focus while both nodes still exist, before React removes the old entry.
  if (next?.isConnected) next.focus();
  else fallback?.focus();
  remove();
}

export function handleDeleteEntryKey(
  event: {
    nativeEvent: KeyboardEvent;
    currentTarget: HTMLElement;
    preventDefault: () => void;
    stopPropagation: () => void;
  },
  remove: () => void,
) {
  if (
    !isDeleteShortcut(event.nativeEvent) ||
    isDeleteTargetEditable(event.nativeEvent.target)
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  removeFocusedEntry(event.currentTarget, remove);
}
