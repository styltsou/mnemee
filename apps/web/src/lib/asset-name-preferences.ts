import { useSyncExternalStore } from "react";

export const ASSET_NAME_POSITIONS = [
  { value: "inside-top", label: "Inside top" },
  { value: "inside-bottom", label: "Inside bottom" },
  { value: "above", label: "Above card" },
  { value: "below", label: "Below card" },
] as const;
export type AssetNamePosition = (typeof ASSET_NAME_POSITIONS)[number]["value"];
type Preferences = { alwaysVisible: boolean; position: AssetNamePosition };
const defaults: Preferences = {
  alwaysVisible: false,
  position: "inside-bottom",
};
const key = "mnemee:asset-names";
const event = "mnemee:asset-names-change";
let cachedValue: string | null = null;
let cachedPreferences = defaults;

function getSnapshot(): Preferences {
  if (typeof window === "undefined") return defaults;
  let value: string | null;
  try {
    value = window.localStorage.getItem(key);
  } catch {
    return defaults;
  }
  if (value === cachedValue) return cachedPreferences;
  cachedValue = value;
  try {
    const saved = JSON.parse(value ?? "null");
    cachedPreferences = {
      alwaysVisible: saved?.alwaysVisible === true,
      position: ASSET_NAME_POSITIONS.some(
        (option) => option.value === saved?.position,
      )
        ? saved.position
        : defaults.position,
    };
  } catch {
    cachedPreferences = defaults;
  }
  return cachedPreferences;
}

function subscribe(onChange: () => void) {
  window.addEventListener(event, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(event, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useAssetNamePreferences() {
  const preferences = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => defaults,
  );
  return { ...preferences, setPreferences };
}

function setPreferences(next: Partial<Preferences>) {
  const updated = { ...getSnapshot(), ...next };
  window.localStorage.setItem(key, JSON.stringify(updated));
  window.dispatchEvent(new Event(event));
}

export function getMediaAssetName(asset: {
  type: "image" | "video";
  title?: string | null;
}) {
  return (
    asset.title?.trim() ||
    (asset.type === "image" ? "Untitled image" : "Untitled video")
  );
}
