import { useIsMutating } from "@tanstack/react-query";
import type { UpdateColorInput } from "@/api/collection/types";
import type { ColorAsset } from "@/types/asset";

export function isSolidNameUpdate(
  color: ColorAsset,
  draft: (UpdateColorInput & { assetId: string }) | undefined,
) {
  if (!draft || draft.assetId !== color.id) return false;
  const gradient =
    draft.gradient === undefined ? color.gradient : draft.gradient;
  if (gradient) return false;
  return Boolean(
    draft.regenerateTitle ||
    draft.title === null ||
    (draft.hex !== undefined &&
      !color.nameEditedByUser &&
      draft.title === undefined),
  );
}

export function useSolidNamePending(color: ColorAsset) {
  return (
    useIsMutating({
      mutationKey: ["update-color"],
      predicate: (mutation) =>
        isSolidNameUpdate(
          color,
          mutation.state.variables as
            | (UpdateColorInput & { assetId: string })
            | undefined,
        ),
    }) > 0
  );
}
