import { describe, expect, it, vi } from "vitest";

import type { IObjectStorageService } from "@/services/object-storage.service";

import { ColorSearchRepository } from "./color-search/color-search.repository";
import { ColorSearchService } from "./color-search.service";

describe("ColorSearchService", () => {
  it("keeps candidate retrieval tenant-scoped and signs only selected previews", async () => {
    const repository = {
      resolveScope: vi.fn().mockResolvedValue({ type: "inbox" }),
      getScopedImageCount: vi.fn().mockResolvedValue(2),
      findBroadCandidateAssets: vi.fn().mockResolvedValue({
        assetIds: [
          "00000000-0000-4000-8000-000000000011",
          "00000000-0000-4000-8000-000000000063",
        ],
        reachedSafetyCap: false,
      }),
      getPaletteColors: vi.fn().mockResolvedValue([
        {
          id: "00000000-0000-4000-8000-000000000001",
          assetId: "00000000-0000-4000-8000-000000000011",
          hex: "#d94732",
          oklabL: 0.628,
          oklabA: 0.225,
          oklabB: 0.126,
          coverage: 0.7,
          salience: 0.8,
          isAccent: false,
        },
      ]),
      getImageMetadata: vi.fn().mockResolvedValue([
        {
          assetId: "00000000-0000-4000-8000-000000000011",
          title: "Reference",
          width: 1200,
          height: 800,
          alt: null,
          blurDataURL: null,
          dominantColors: ["#d94732"],
          variants: {
            preview: {
              objectKey: "workspace-1/17/preview.webp",
              width: 400,
              height: 267,
              contentType: "image/webp",
              sizeBytes: 1_000,
            },
          },
        },
      ]),
      getImageLocations: vi.fn().mockResolvedValue([
        {
          assetId: "00000000-0000-4000-8000-000000000011",
          location: {
            type: "inbox",
            nodeId: "image-00000000-0000-4000-8000-000000000011",
            position: null,
          },
        },
      ]),
    } as unknown as ColorSearchRepository;
    const createPresignedGetUrls = vi.fn().mockResolvedValue(
      new Map([
        [
          "workspace-1/17/preview.webp",
          {
            key: "workspace-1/17/preview.webp",
            url: "https://signed.example/17",
            expiresAt: new Date(),
          },
        ],
      ]),
    );
    const service = new ColorSearchService(
      {
        objectStorageService: {
          createPresignedGetUrls,
        } as unknown as IObjectStorageService,
        loggerService: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        },
      },
      repository,
    );

    const response = await service.search("workspace-1", {
      colors: [{ oklabL: 0.628, oklabA: 0.225, oklabB: 0.126 }],
      scope: { type: "inbox" },
      matchMode: "strict",
    });

    expect(repository.findBroadCandidateAssets).toHaveBeenCalledWith(
      "workspace-1",
      { type: "inbox" },
      [{ oklabL: 0.628, oklabA: 0.225, oklabB: 0.126 }],
      "strict",
    );
    expect(repository.getPaletteColors).toHaveBeenCalledWith("workspace-1", [
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000063",
    ]);
    expect(repository.getImageMetadata).toHaveBeenCalledWith("workspace-1", [
      "00000000-0000-4000-8000-000000000011",
    ]);
    expect(repository.getImageLocations).toHaveBeenCalledWith(
      "workspace-1",
      { type: "inbox" },
      ["00000000-0000-4000-8000-000000000011"],
    );
    expect(createPresignedGetUrls).toHaveBeenCalledWith([
      "workspace-1/17/preview.webp",
    ]);
    expect(response.results).toMatchObject([
      {
        image: {
          id: "image-00000000-0000-4000-8000-000000000011",
          url: "https://signed.example/17",
        },
        location: { type: "inbox" },
      },
    ]);
  });
});
