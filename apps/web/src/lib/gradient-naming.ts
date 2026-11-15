import { create } from "zustand";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchPeekableAsset } from "@/api/collection/fetchers";
import { ApiError } from "@/lib/api";

type NamingFailure =
  | "missing_api_key"
  | "usage_limit"
  | "provider_unavailable"
  | "internal_error";

export function showGradientNamingFailure(error?: NamingFailure) {
  const message =
    error === "missing_api_key"
      ? "Automatic naming needs a valid API key."
      : error === "usage_limit"
        ? "Automatic naming has reached its usage limit."
        : error === "provider_unavailable"
          ? "Automatic naming is unavailable right now."
          : error === "internal_error"
            ? "Unable to generate a gradient title."
            : "Automatic naming is unavailable right now.";
  toast.error(message);
}

type NamingState = {
  pending: Record<string, boolean>;
  setPending: (id: string, pending: boolean) => void;
};

export const useGradientNaming = create<NamingState>((set) => ({
  pending: {},
  setPending: (id, pending) =>
    set((state) => {
      const next = { ...state.pending };
      if (pending) next[id] = true;
      else delete next[id];
      return { pending: next };
    }),
}));

const activePolls = new Map<string, number>();

export function watchGradientName(
  queryClient: QueryClient,
  workspaceSlug: string,
  assetId: string,
  previousTitle: string | null,
  fingerprint?: string,
) {
  const generation = (activePolls.get(assetId) ?? 0) + 1;
  activePolls.set(assetId, generation);
  useGradientNaming.getState().setPending(assetId, true);
  void (async () => {
    try {
      while (activePolls.get(assetId) === generation) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        if (activePolls.get(assetId) !== generation) return;
        if (document.visibilityState === "hidden") continue;
        try {
          const fetched = await fetchPeekableAsset(workspaceSlug, assetId);
          if (activePolls.get(assetId) !== generation) return;
          if (
            queryClient.isMutating({
              mutationKey: ["update-color", workspaceSlug],
              exact: true,
              predicate: (mutation) =>
                (mutation.state.variables as { assetId?: string } | undefined)
                  ?.assetId === assetId,
            })
          )
            continue;
          const { asset } = fetched;
          if (asset.type !== "color") return;
          if (fingerprint && asset.naming?.fingerprint !== fingerprint) {
            queryClient.setQueryData(
              ["workspace-asset", workspaceSlug, assetId],
              fetched,
            );
            return;
          }
          if (
            asset.title !== previousTitle ||
            asset.naming?.state === "succeeded"
          ) {
            queryClient.setQueryData(
              ["workspace-asset", workspaceSlug, assetId],
              fetched,
            );
            await Promise.all([
              queryClient.invalidateQueries({
                predicate: ({ queryKey }) =>
                  (queryKey[0] === "collectionContents" ||
                    queryKey[0] === "inboxContents") &&
                  queryKey[1] === workspaceSlug,
              }),
              queryClient.invalidateQueries({
                queryKey: ["collectionGrid", workspaceSlug],
              }),
              queryClient.invalidateQueries({
                queryKey: ["inboxGrid", workspaceSlug],
              }),
              queryClient.invalidateQueries({
                queryKey: ["collections", workspaceSlug],
              }),
              queryClient.invalidateQueries({
                queryKey: ["note-mentions", workspaceSlug],
              }),
              queryClient.invalidateQueries({
                queryKey: ["workspace", workspaceSlug],
              }),
            ]);
            return;
          }
          if (asset.naming?.state === "failed") {
            queryClient.setQueryData(
              ["workspace-asset", workspaceSlug, assetId],
              fetched,
            );
            showGradientNamingFailure(asset.naming.error);
            return;
          }
          if (asset.naming?.state !== "queued") return;
        } catch (error) {
          if (
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          )
            return;
          // Temporary network errors are retried while the job is active.
        }
      }
    } finally {
      if (activePolls.get(assetId) === generation) {
        activePolls.delete(assetId);
        useGradientNaming.getState().setPending(assetId, false);
      }
    }
  })();
}
