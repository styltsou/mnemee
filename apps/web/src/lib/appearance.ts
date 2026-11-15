import { create } from "zustand";
import { apiGet, apiPatch } from "@/lib/api";
import {
  ACTIVE_ACCOUNT_KEY,
  appearanceCacheKey,
  DEFAULT_APPEARANCE,
  EMPTY_APPEARANCE_CACHE,
  readAppearanceCache,
  readAppearanceStorage,
  readLegacyAppearance,
  rememberAppearanceAccount,
  writeAppearanceCache,
  type Appearance,
  type AppearanceCache,
  type AppearanceChanges,
} from "@/lib/appearance-cache";

const APPEARANCE_URL = "/api/v1/me/appearance";

type SavedAppearance = {
  userId: string;
  preferences: AppearanceChanges;
  revision: number;
};

let displayedAccount = readAppearanceStorage(ACTIVE_ACCOUNT_KEY);
let confirmedAccount: string | null = null;
let cache = readAppearanceCache(displayedAccount) ?? EMPTY_APPEARANCE_CACHE;
let legacy = readLegacyAppearance(displayedAccount);
const savingAccounts = new Set<string>();
const refreshingAccounts = new Set<string>();

function getAppearance(): Appearance {
  return { ...DEFAULT_APPEARANCE, ...legacy, ...cache.saved, ...cache.pending };
}

export const useAppearance = create<Appearance & { saveFailed: boolean }>()(
  () => ({ ...getAppearance(), saveFailed: false }),
);

function publish(next: AppearanceCache, saveFailed = false) {
  cache = next;
  useAppearance.setState({ ...getAppearance(), saveFailed });
}

function updateCache(userId: string | null, next: AppearanceCache) {
  writeAppearanceCache(userId, next);
  if (displayedAccount === userId) publish(next);
}

function displayAccount(userId: string | null) {
  displayedAccount = userId;
  legacy = readLegacyAppearance(userId);
  publish(readAppearanceCache(userId) ?? EMPTY_APPEARANCE_CACHE);
}

export function setAppearanceAccount(userId: string | null) {
  rememberAppearanceAccount(userId);
  if (userId === displayedAccount && userId === confirmedAccount) return;

  confirmedAccount = userId;
  displayAccount(userId);

  if (userId !== null) reconnectAppearance();
}

export function changeAppearance(changes: AppearanceChanges) {
  if (Object.keys(changes).length === 0) return;
  if (confirmedAccount !== displayedAccount) displayAccount(confirmedAccount);
  const latest = readAppearanceCache(confirmedAccount) ?? cache;
  const target = confirmedAccount === null ? "saved" : "pending";
  updateCache(confirmedAccount, {
    ...latest,
    [target]: { ...latest[target], ...changes },
  });
  void savePendingAppearance();
}

function applySaved(
  local: AppearanceCache,
  remote: SavedAppearance,
): AppearanceCache {
  if (remote.revision <= local.revision) return local;
  return { ...local, saved: remote.preferences, revision: remote.revision };
}

async function refreshAppearance(userId: string) {
  if (refreshingAccounts.has(userId)) return;
  refreshingAccounts.add(userId);
  try {
    const remote = await apiGet<SavedAppearance>(APPEARANCE_URL);
    if (confirmedAccount !== userId || remote.userId !== userId) return;

    const latest = readAppearanceCache(userId) ?? cache;
    const next = applySaved(latest, remote);
    if (next !== latest) {
      writeAppearanceCache(userId, next);
      publish(next, useAppearance.getState().saveFailed);
    }
  } catch {
    // The workspace can use its cached appearance during a read failure.
  } finally {
    refreshingAccounts.delete(userId);
  }
}

export async function savePendingAppearance() {
  const userId = confirmedAccount;
  if (userId === null || savingAccounts.has(userId)) return;
  if (
    Object.keys((readAppearanceCache(userId) ?? cache).pending).length === 0
  ) {
    return;
  }
  savingAccounts.add(userId);
  useAppearance.setState({ saveFailed: false });

  async function flush() {
    while (confirmedAccount === userId) {
      const { pending } = readAppearanceCache(userId) ?? cache;
      if (Object.keys(pending).length === 0) return;

      const remote = await apiPatch<SavedAppearance>(APPEARANCE_URL, {
        userId,
        changes: pending,
      });
      if (remote.userId !== userId)
        throw new Error("Appearance account changed");

      const latest =
        readAppearanceCache(userId) ??
        (displayedAccount === userId ? cache : undefined);
      if (!latest) return;
      const remaining = Object.fromEntries(
        (Object.keys(latest.pending) as (keyof Appearance)[])
          .filter((key) => latest.pending[key] !== pending[key])
          .map((key) => [key, latest.pending[key]]),
      );
      updateCache(userId, {
        ...applySaved(latest, remote),
        pending: remaining,
      });
    }
  }

  try {
    // Tabs share a pending patch. Send it in order when the browser supports locks.
    if (navigator.locks)
      await navigator.locks.request(appearanceCacheKey(userId), flush);
    else await flush();
  } catch {
    if (confirmedAccount === userId) {
      useAppearance.setState({ saveFailed: true });
    }
    return;
  } finally {
    savingAccounts.delete(userId);
  }

  // An edit can arrive after the queue drains but before the lock releases.
  if (confirmedAccount === userId) void savePendingAppearance();
}

function reconnectAppearance() {
  if (confirmedAccount === null) return;
  void refreshAppearance(confirmedAccount);
  void savePendingAppearance();
}

export function listenForAppearanceChanges() {
  window.addEventListener("focus", reconnectAppearance);
  window.addEventListener("online", reconnectAppearance);
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key === ACTIVE_ACCOUNT_KEY) {
      if (readAppearanceStorage(ACTIVE_ACCOUNT_KEY) !== displayedAccount) {
        confirmedAccount = null;
        displayAccount(null);
      }
    }
    if (
      event.key === appearanceCacheKey(displayedAccount) ||
      event.key === null
    ) {
      const next =
        readAppearanceCache(displayedAccount) ?? EMPTY_APPEARANCE_CACHE;
      publish(
        next,
        Object.keys(next.pending).length > 0 &&
          useAppearance.getState().saveFailed,
      );
    }
  });
}
