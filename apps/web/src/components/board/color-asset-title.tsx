import { toast } from "sonner";
import { useUpdateColor } from "@/api/collection";
import type { UpdateColorInput } from "@/api/collection/types";
import { InlineAssetTitle } from "@/components/board/inline-asset-title";
import { getUserFacingApiErrorMessage } from "@/lib/api";
import { GRADIENT_NAME_SHIMMER } from "@/lib/gradient-name-shimmer";
import { useGradientNaming } from "@/lib/gradient-naming";
import type { ColorAsset } from "@/types/asset";

export function ColorAssetTitle({
  color,
  workspaceSlug,
}: {
  color: ColorAsset;
  workspaceSlug: string;
}) {
  const updateColor = useUpdateColor(workspaceSlug);
  const naming = useGradientNaming((state) => Boolean(state.pending[color.id]));

  function saveTitle(data: UpdateColorInput) {
    updateColor.mutate(
      { assetId: color.id, ...data },
      {
        onError: (error) =>
          toast.error(
            getUserFacingApiErrorMessage(
              error,
              data.regenerateTitle
                ? "Unable to regenerate title."
                : "Unable to rename color.",
            ),
          ),
      },
    );
  }

  return (
    <InlineAssetTitle
      value={color.title?.trim() ?? ""}
      fallback={color.hex?.toUpperCase() || "Color"}
      onSave={(title) => saveTitle({ title: title || null })}
      onRegenerate={
        color.nameEditedByUser && !naming
          ? () => saveTitle({ regenerateTitle: true })
          : undefined
      }
      disabled={updateColor.isPending}
      titleClassName={naming ? GRADIENT_NAME_SHIMMER : undefined}
    />
  );
}
