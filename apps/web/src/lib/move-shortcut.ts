export function isMoveShortcut(
  event: Pick<
    KeyboardEvent,
    | "key"
    | "ctrlKey"
    | "metaKey"
    | "altKey"
    | "shiftKey"
    | "repeat"
    | "isComposing"
    | "defaultPrevented"
  >,
): boolean {
  return (
    event.key.toLowerCase() === "m" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.shiftKey &&
    !event.repeat &&
    !event.isComposing &&
    !event.defaultPrevented
  );
}
