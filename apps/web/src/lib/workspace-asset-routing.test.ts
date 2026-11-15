import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ["/work"] }),
});

describe("workspace asset routes", () => {
  it.each([
    [
      "/work/asset/note-00000000-0000-4000-8000-000000000001",
      "/$workspaceSlug/asset/$assetId",
    ],
    [
      "/work/inbox/asset/image-00000000-0000-4000-8000-000000000002",
      "/$workspaceSlug/inbox/$",
    ],
    [
      "/work/collections/ideas/nested/asset/color-00000000-0000-4000-8000-000000000003",
      "/$workspaceSlug/collections/$",
    ],
  ])("matches %s", (pathname, routeId) => {
    expect(router.matchRoutes(pathname).at(-1)?.routeId).toBe(routeId);
  });
});
