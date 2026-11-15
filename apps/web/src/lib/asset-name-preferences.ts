import { changeAppearance, useAppearance } from "@/lib/appearance";
import type { Appearance } from "@/lib/appearance-cache";

export const ASSET_NAME_POSITIONS = [
  { value: "inside-top", label: "Inside top" },
  { value: "inside-bottom", label: "Inside bottom" },
  { value: "above", label: "Above card" },
  { value: "below", label: "Below card" },
] as const;
export type AssetNamePosition = Appearance["assetNamePosition"];
type Preferences = { alwaysVisible: boolean; position: AssetNamePosition };

export function useAssetNamePreferences() {
  const alwaysVisible = useAppearance((state) => state.assetNamesAlwaysVisible);
  const position = useAppearance((state) => state.assetNamePosition);
  return { alwaysVisible, position, setPreferences };
}

function setPreferences({ alwaysVisible, position }: Partial<Preferences>) {
  changeAppearance({
    ...(alwaysVisible !== undefined && {
      assetNamesAlwaysVisible: alwaysVisible,
    }),
    ...(position !== undefined && { assetNamePosition: position }),
  });
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
