export function migratePersistedAppStore(
  state: unknown,
  legacyViews?: unknown,
): Record<string, unknown> {
  const persistedState = isRecord(state) ? state : {};
  const {
    workspaceBoardActionRails: _workspaceBoardActionRails,
    boardActionRailVisible: _boardActionRailVisible,
    canvasFloatingSidebar: _canvasFloatingSidebar,
    ...remainingState
  } = persistedState;

  return {
    ...remainingState,
    boardActionRailVisibilityByUser: isRecord(
      persistedState.boardActionRailVisibilityByUser,
    )
      ? persistedState.boardActionRailVisibilityByUser
      : {},
    collectionViews: isRecord(persistedState.collectionViews)
      ? persistedState.collectionViews
      : isRecord(legacyViews)
        ? legacyViews
        : {},
  };
}

export function mergePersistedAppStore<T extends object>(
  persistedState: unknown,
  currentState: T,
): T {
  return {
    ...currentState,
    ...migratePersistedAppStore(persistedState),
  } as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
