import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiGet, apiPatch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiGet: vi.fn(), apiPatch: vi.fn() }));

const prefix = "mnemee:appearance:v1:";
const activeKey = `${prefix}active-account`;
const accountKey = `${prefix}user:alice`;
const emptyRemote = { userId: "alice", preferences: {}, revision: 0 };
const storage = new Map<string, string>();

function deferredResponse() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function writeCache(
  saved: Record<string, unknown>,
  pending: Record<string, unknown>,
) {
  storage.set(accountKey, JSON.stringify({ saved, pending, revision: 1 }));
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  storage.clear();
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    }),
  );
  vi.stubGlobal("navigator", {});
  vi.mocked(apiGet).mockResolvedValue(emptyRemote);
});

afterEach(() => vi.unstubAllGlobals());

describe("account appearance", () => {
  it("refreshes the visible settings when another tab updates the account cache", async () => {
    const { listenForAppearanceChanges, setAppearanceAccount, useAppearance } =
      await import("./appearance");
    listenForAppearanceChanges();
    setAppearanceAccount("alice");

    writeCache({ theme: "dark", assetNamePosition: "above" }, {});
    window.dispatchEvent(
      Object.assign(new Event("storage"), { key: accountKey }),
    );
    expect(useAppearance.getState()).toMatchObject({
      theme: "dark",
      assetNamePosition: "above",
    });

    storage.delete(activeKey);
    window.dispatchEvent(
      Object.assign(new Event("storage"), { key: activeKey }),
    );
    expect(useAppearance.getState()).toMatchObject({
      theme: "system",
      assetNamePosition: "inside-bottom",
    });
  });

  it("uses the browser cache before session lookup and isolates a different account", async () => {
    storage.set(activeKey, "alice");
    storage.set(`${prefix}legacy-owner`, "alice");
    writeCache({ canvasPattern: "cross" }, { theme: "dark" });

    const { useAppearance, setAppearanceAccount } =
      await import("./appearance");
    expect(useAppearance.getState()).toMatchObject({
      theme: "dark",
      canvasPattern: "cross",
    });
    expect(apiPatch).not.toHaveBeenCalled();

    vi.mocked(apiGet).mockResolvedValue({ ...emptyRemote, userId: "bob" });
    setAppearanceAccount("bob");
    expect(useAppearance.getState()).toMatchObject({
      theme: "system",
      canvasPattern: "dots",
    });
    expect(apiPatch).not.toHaveBeenCalled();
    expect(storage.get(activeKey)).toBe("bob");
    expect(JSON.parse(storage.get(accountKey)!).pending).toEqual({
      theme: "dark",
    });

    setAppearanceAccount(null);
    expect(storage.has(activeKey)).toBe(false);
  });

  it("keeps newer local choices through slow reads and consecutive saves", async () => {
    const initialRead = deferredResponse();
    const firstSave = deferredResponse();
    const secondSave = deferredResponse();
    vi.mocked(apiGet).mockReturnValueOnce(initialRead.promise);
    vi.mocked(apiPatch)
      .mockReturnValueOnce(firstSave.promise)
      .mockReturnValueOnce(secondSave.promise);

    const { useAppearance, setAppearanceAccount, changeAppearance } =
      await import("./appearance");
    setAppearanceAccount("alice");
    changeAppearance({ theme: "dark" });
    changeAppearance({ theme: "light", canvasPattern: "lines" });
    expect(useAppearance.getState()).toMatchObject({
      theme: "light",
      canvasPattern: "lines",
    });
    expect(apiPatch).toHaveBeenCalledTimes(1);

    firstSave.resolve({
      ...emptyRemote,
      preferences: { theme: "dark" },
      revision: 2,
    });
    await vi.waitFor(() => expect(apiPatch).toHaveBeenCalledTimes(2));
    expect(apiPatch).toHaveBeenLastCalledWith("/api/v1/me/appearance", {
      userId: "alice",
      changes: { theme: "light", canvasPattern: "lines" },
    });
    expect(useAppearance.getState().theme).toBe("light");

    secondSave.resolve({
      ...emptyRemote,
      preferences: { theme: "light", canvasPattern: "lines" },
      revision: 3,
    });
    await vi.waitFor(() =>
      expect(JSON.parse(storage.get(accountKey)!).revision).toBe(3),
    );
    initialRead.resolve({
      ...emptyRemote,
      preferences: { theme: "dark", canvasPattern: "dots" },
      revision: 1,
    });
    await initialRead.promise;
    expect(useAppearance.getState()).toMatchObject({
      theme: "light",
      canvasPattern: "lines",
    });
    expect(JSON.parse(storage.get(accountKey)!).pending).toEqual({});
  });

  it("flushes edits made as another save releases the browser lock", async () => {
    const drained = deferredResponse();
    const release = deferredResponse();
    let locks = 0;
    vi.stubGlobal("navigator", {
      locks: {
        request: async (_name: string, flush: () => Promise<void>) => {
          await flush();
          if (++locks !== 1) return;
          drained.resolve(undefined);
          await release.promise;
        },
      },
    });
    vi.mocked(apiPatch)
      .mockResolvedValueOnce({
        ...emptyRemote,
        preferences: { theme: "dark" },
        revision: 1,
      })
      .mockResolvedValueOnce({
        ...emptyRemote,
        preferences: { theme: "light" },
        revision: 2,
      });

    const { setAppearanceAccount, changeAppearance } =
      await import("./appearance");
    setAppearanceAccount("alice");
    changeAppearance({ theme: "dark" });
    await drained.promise;
    changeAppearance({ theme: "light" });
    expect(apiPatch).toHaveBeenCalledTimes(1);

    release.resolve(undefined);
    await vi.waitFor(() =>
      expect(JSON.parse(storage.get(accountKey)!).revision).toBe(2),
    );
    expect(apiPatch).toHaveBeenCalledTimes(2);
  });

  it("keeps a failed edit across reloads and saves only the field the user edited", async () => {
    storage.set("theme", "dark");
    storage.set("mnemee:canvas-pattern", "lines");
    vi.mocked(apiPatch).mockRejectedValueOnce(new Error("Offline"));

    const firstLoad = await import("./appearance");
    firstLoad.setAppearanceAccount("alice");
    expect(firstLoad.useAppearance.getState()).toMatchObject({
      theme: "dark",
      canvasPattern: "lines",
    });
    expect(apiPatch).not.toHaveBeenCalled();
    firstLoad.changeAppearance({ assetNamesAlwaysVisible: true });
    await vi.waitFor(() =>
      expect(firstLoad.useAppearance.getState().saveFailed).toBe(true),
    );

    vi.resetModules();
    vi.mocked(apiPatch).mockResolvedValueOnce({
      ...emptyRemote,
      preferences: { assetNamesAlwaysVisible: true },
      revision: 1,
    });
    const reloaded = await import("./appearance");
    expect(reloaded.useAppearance.getState().assetNamesAlwaysVisible).toBe(
      true,
    );
    reloaded.setAppearanceAccount("alice");
    await vi.waitFor(() =>
      expect(JSON.parse(storage.get(accountKey)!).pending).toEqual({}),
    );
    expect(apiPatch).toHaveBeenLastCalledWith("/api/v1/me/appearance", {
      userId: "alice",
      changes: { assetNamesAlwaysVisible: true },
    });
  });
});
