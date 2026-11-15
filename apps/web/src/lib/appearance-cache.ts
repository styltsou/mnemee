import { z } from "zod";

const AppearanceSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  canvasPattern: z.enum(["none", "dots", "lines", "cross"]),
  assetNamesAlwaysVisible: z.boolean(),
  assetNamePosition: z.enum(["inside-top", "inside-bottom", "above", "below"]),
});

export type Appearance = z.infer<typeof AppearanceSchema>;
export type AppearanceChanges = Partial<Appearance>;

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "system",
  canvasPattern: "dots",
  assetNamesAlwaysVisible: false,
  assetNamePosition: "inside-bottom",
};

const ChangesSchema = AppearanceSchema.partial();
const CacheSchema = z.object({
  saved: ChangesSchema,
  pending: ChangesSchema,
  revision: z.number().int().nonnegative(),
});

export type AppearanceCache = z.infer<typeof CacheSchema>;
export const EMPTY_APPEARANCE_CACHE: AppearanceCache = {
  saved: {},
  pending: {},
  revision: 0,
};

// The first-paint script in index.html reads the same versioned cache.
const STORAGE_PREFIX = "mnemee:appearance:v1:";
export const ACTIVE_ACCOUNT_KEY = `${STORAGE_PREFIX}active-account`;
const LEGACY_OWNER_KEY = `${STORAGE_PREFIX}legacy-owner`;

export function appearanceCacheKey(userId: string | null) {
  return `${STORAGE_PREFIX}${userId === null ? "guest" : `user:${userId}`}`;
}

let storageUnavailable = false;

export function readAppearanceStorage(key: string) {
  if (storageUnavailable || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    storageUnavailable = true;
    return null;
  }
}

function writeAppearanceStorage(key: string, value: string | null) {
  if (storageUnavailable || typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    storageUnavailable = true;
  }
}

function readJson(key: string): unknown {
  const raw = readAppearanceStorage(key);
  try {
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readAppearanceCache(userId: string | null) {
  return CacheSchema.safeParse(readJson(appearanceCacheKey(userId))).data;
}

export function writeAppearanceCache(
  userId: string | null,
  cache: AppearanceCache,
) {
  writeAppearanceStorage(appearanceCacheKey(userId), JSON.stringify(cache));
}

export function rememberAppearanceAccount(userId: string | null) {
  if (userId !== null && readAppearanceStorage(LEGACY_OWNER_KEY) === null) {
    writeAppearanceStorage(LEGACY_OWNER_KEY, userId);
  }
  writeAppearanceStorage(ACTIVE_ACCOUNT_KEY, userId);
}

export function readLegacyAppearance(userId: string | null): AppearanceChanges {
  const owner = readAppearanceStorage(LEGACY_OWNER_KEY);
  if (owner !== userId) return {};

  const assetNames = z
    .object({
      alwaysVisible: AppearanceSchema.shape.assetNamesAlwaysVisible.optional(),
      position: AppearanceSchema.shape.assetNamePosition.optional(),
    })
    .safeParse(readJson("mnemee:asset-names")).data;

  return {
    theme:
      AppearanceSchema.shape.theme.safeParse(readAppearanceStorage("theme"))
        .data ?? DEFAULT_APPEARANCE.theme,
    canvasPattern:
      AppearanceSchema.shape.canvasPattern.safeParse(
        readAppearanceStorage("mnemee:canvas-pattern"),
      ).data ?? DEFAULT_APPEARANCE.canvasPattern,
    assetNamesAlwaysVisible:
      assetNames?.alwaysVisible ?? DEFAULT_APPEARANCE.assetNamesAlwaysVisible,
    assetNamePosition:
      assetNames?.position ?? DEFAULT_APPEARANCE.assetNamePosition,
  };
}
