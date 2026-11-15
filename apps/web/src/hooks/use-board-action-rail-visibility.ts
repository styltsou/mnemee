import { authClient } from "@/lib/auth-client";
import { usePersistedStore } from "@/store";

export function useBoardActionRailVisibility() {
  const { data } = authClient.useSession();
  const userId = data?.user.id;
  const visible = usePersistedStore((state) =>
    userId ? (state.boardActionRailVisibilityByUser[userId] ?? true) : true,
  );
  const setVisible = usePersistedStore(
    (state) => state.setBoardActionRailVisible,
  );

  return [
    visible,
    (value: boolean) => {
      if (userId) setVisible(userId, value);
    },
  ] as const;
}
