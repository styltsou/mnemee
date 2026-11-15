import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as fetchers from "@/api/collection/fetchers";
import { useGradientNaming, watchGradientName } from "./gradient-naming";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  useGradientNaming.setState({ pending: {} });
});

describe("gradient naming watcher", () => {
  it("stops at the stored success status and updates the asset cache", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("document", { visibilityState: "visible" });
    const queued = {
      asset: {
        id: "color-1",
        type: "color" as const,
        title: "Linear Gradient",
        naming: { state: "queued" as const, fingerprint: "job-1" },
      },
      location: null,
    };
    const succeeded = {
      ...queued,
      asset: {
        ...queued.asset,
        title: "Ocean Mist",
        naming: { state: "succeeded" as const, fingerprint: "job-1" },
      },
    };
    const fetch = vi
      .spyOn(fetchers, "fetchPeekableAsset")
      .mockResolvedValueOnce(queued as never)
      .mockResolvedValueOnce(succeeded as never);
    const client = new QueryClient();

    watchGradientName(client, "studio", "color-1", "Linear Gradient", "job-1");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(useGradientNaming.getState().pending["color-1"]).toBe(true);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(
      client.getQueryData(["workspace-asset", "studio", "color-1"]),
    ).toEqual(succeeded);
    expect(useGradientNaming.getState().pending["color-1"]).toBeUndefined();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("stops as soon as the server reports failure", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("document", { visibilityState: "visible" });
    const failed = {
      asset: {
        id: "color-2",
        type: "color" as const,
        title: "Linear Gradient",
        naming: {
          state: "failed" as const,
          fingerprint: "job-2",
          error: "provider_unavailable" as const,
        },
      },
      location: null,
    };
    const fetch = vi
      .spyOn(fetchers, "fetchPeekableAsset")
      .mockResolvedValue(failed as never);
    const client = new QueryClient();

    watchGradientName(client, "studio", "color-2", "Linear Gradient", "job-2");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(useGradientNaming.getState().pending["color-2"]).toBeUndefined();
    expect(
      client.getQueryData(["workspace-asset", "studio", "color-2"]),
    ).toEqual(failed);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
