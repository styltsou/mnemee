import { describe, expect, it, vi } from "vitest";

import { createLatestPatchQueue } from "./latest-patch-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

describe("createLatestPatchQueue", () => {
  it("serializes a key and merges waiting patches with latest values", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const save = vi
      .fn<(key: string, patch: Record<string, string>) => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const onSuccess = vi.fn();
    const queue = createLatestPatchQueue({
      save,
      merge: (current, next) => ({ ...current, ...next }),
      onSuccess,
    });

    const firstResult = queue.enqueue(
      "arrow-00000000-0000-4000-8000-000000000001",
      { style: "clean" },
    );
    const secondResult = queue.enqueue(
      "arrow-00000000-0000-4000-8000-000000000001",
      { style: "sketch" },
    );
    const thirdResult = queue.enqueue(
      "arrow-00000000-0000-4000-8000-000000000001",
      {
        style: "clean",
        color: "plum",
      },
    );

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith(
      "arrow-00000000-0000-4000-8000-000000000001",
      { style: "clean" },
    );

    first.resolve("first");
    await firstResult;

    expect(onSuccess).toHaveBeenNthCalledWith(
      1,
      "arrow-00000000-0000-4000-8000-000000000001",
      "first",
      true,
    );
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(
      "arrow-00000000-0000-4000-8000-000000000001",
      {
        style: "clean",
        color: "plum",
      },
    );

    second.resolve("latest");
    await expect(secondResult).resolves.toBe("latest");
    await expect(thirdResult).resolves.toBe("latest");
    expect(onSuccess).toHaveBeenNthCalledWith(
      2,
      "arrow-00000000-0000-4000-8000-000000000001",
      "latest",
      false,
    );
  });

  it("continues to the latest patch after an in-flight write fails", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const save = vi
      .fn<(key: string, patch: Record<string, string>) => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const onError = vi.fn();
    const queue = createLatestPatchQueue({
      save,
      merge: (current, next) => ({ ...current, ...next }),
      onError,
    });

    const failedResult = queue.enqueue(
      "text-00000000-0000-4000-8000-000000000001",
      { font: "inter" },
    );
    const latestResult = queue.enqueue(
      "text-00000000-0000-4000-8000-000000000001",
      { font: "fraunces" },
    );
    const error = new Error("save failed");

    first.reject(error);
    await expect(failedResult).rejects.toBe(error);

    expect(onError).toHaveBeenCalledWith(
      "text-00000000-0000-4000-8000-000000000001",
      error,
      true,
    );
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(
      "text-00000000-0000-4000-8000-000000000001",
      { font: "fraunces" },
    );

    second.resolve("saved");
    await expect(latestResult).resolves.toBe("saved");
  });

  it("allows different object keys to save concurrently", () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const save = vi
      .fn<(key: string, patch: Record<string, string>) => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const queue = createLatestPatchQueue({
      save,
      merge: (current, next) => ({ ...current, ...next }),
    });

    void queue.enqueue("text-00000000-0000-4000-8000-000000000001", {
      color: "ink",
    });
    void queue.enqueue("text-00000000-0000-4000-8000-000000000002", {
      color: "plum",
    });

    expect(save).toHaveBeenCalledWith(
      "text-00000000-0000-4000-8000-000000000001",
      { color: "ink" },
    );
    expect(save).toHaveBeenCalledWith(
      "text-00000000-0000-4000-8000-000000000002",
      { color: "plum" },
    );

    first.resolve("first");
    second.resolve("second");
  });
});
