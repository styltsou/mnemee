import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const storage = vi.hoisted(() => ({
  putObject: vi.fn(),
  getObjectBytes: vi.fn(),
}));

vi.mock("@/container", () => ({
  container: { objectStorageService: storage },
}));
vi.mock("@/middleware", () => ({
  authMiddleware: async (
    c: { set: (key: string, value: string) => void },
    next: () => Promise<void>,
  ) => {
    c.set("userId", "user-1");
    await next();
  },
}));

import profileAvatarRoutes from "./profile-avatar.routes";

describe("profile avatar routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores a square thumbnail and serves it by its immutable id", async () => {
    const source = await sharp({
      create: { width: 600, height: 300, channels: 3, background: "orange" },
    })
      .png()
      .toBuffer();
    const uploaded = await profileAvatarRoutes.request("/profile/avatar", {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(source),
    });

    expect(uploaded.status).toBe(201);
    const { data } = await uploaded.json();
    expect(data.avatar).toMatch(/^upload:[0-9a-f-]{36}$/);
    const stored = storage.putObject.mock.calls[0]![0];
    expect(stored.key).toBe(
      `profile-avatars/user-1/${data.avatar.slice(7)}.webp`,
    );
    expect(stored.contentType).toBe("image/webp");
    expect(await sharp(stored.body).metadata()).toMatchObject({
      width: 256,
      height: 256,
      format: "webp",
    });

    storage.getObjectBytes.mockResolvedValue(stored.body);
    const fetched = await profileAvatarRoutes.request(
      `/profile/avatar/user-1/${data.avatar.slice(7)}`,
    );
    expect(fetched.status).toBe(200);
    expect(fetched.headers.get("content-type")).toContain("image/webp");
    expect(storage.getObjectBytes).toHaveBeenCalledWith(stored.key);
  });

  it("rejects non-image data", async () => {
    const response = await profileAvatarRoutes.request("/profile/avatar", {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: "not an image",
    });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Could not read this image.");
    expect(storage.putObject).not.toHaveBeenCalled();
  });
});
