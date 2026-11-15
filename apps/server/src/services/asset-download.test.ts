import { describe, expect, it, vi } from "vitest";

import type { IObjectStorageService } from "@/services/object-storage.service";

const selectMock = vi.hoisted(() => vi.fn());
vi.mock("@/db", () => ({ db: { select: selectMock } }));

import { AssetService } from "./asset.service";

describe("video downloads", () => {
  it.each([
    ["video.mp4", "video/mp4", "video.mp4"],
    ["video.MP4", "video/mp4", "video.MP4"],
    ["video", "video/mp4", "video.mp4"],
    ["video.webm", "video/webm", "video.webm"],
    [null, "video/mp4", "video.mp4"],
    ["video.webm", "video/mp4", "video.webm.mp4"],
  ])(
    "names %s with content type %s as %s",
    async (title, contentType, expected) => {
      const query = {
        from: vi.fn(),
        innerJoin: vi.fn(),
        where: vi.fn(),
        limit: vi
          .fn()
          .mockResolvedValue([
            { title, original: { objectKey: "original", contentType } },
          ]),
      };
      query.from.mockReturnValue(query);
      query.innerJoin.mockReturnValue(query);
      query.where.mockReturnValue(query);
      selectMock.mockReturnValueOnce(query);
      const createPresignedDownloadUrl = vi
        .fn()
        .mockResolvedValue("signed-url");
      const service = new AssetService({
        objectStorageService: {
          createPresignedDownloadUrl,
        } as unknown as IObjectStorageService,
      });

      await expect(
        service.downloadVideo(
          "workspace-1",
          "video-00000000-0000-4000-8000-000000000017",
        ),
      ).resolves.toBe("signed-url");
      expect(createPresignedDownloadUrl).toHaveBeenCalledWith(
        "original",
        expected,
      );
    },
  );
});
