import { randomUUID } from "node:crypto";
import { isUuid } from "@mnemee/id-shared";
import { parseGradientNamingJob } from "@mnemee/image-shared/gradient-naming-job";
import {
  parseResourceMediaRenditionJob,
  resourceMediaRenditionJob,
} from "@mnemee/image-shared/variant-job";
import {
  parseUrlResolutionJob,
  urlResolutionJob,
} from "@mnemee/url-unfurl-shared/resolution-job";
import { describe, expect, it } from "vitest";
import {
  AssetPathParamSchema,
  BulkDeleteBodySchema,
} from "@/dto/collection.dto";
import { MentionResolveSchema } from "@/dto/note-mention.dto";
import { InboxUploadPathParamSchema } from "@/dto/upload.dto";
import { parseAssetNodeId, parseCollectionNodeId } from "./collection-node-id";

describe("UUID entity contracts", () => {
  const id = randomUUID();

  it("keeps asset prefixes while preserving the complete UUID through parsing", () => {
    for (const assetType of [
      "image",
      "video",
      "note",
      "link",
      "color",
    ] as const) {
      expect(parseAssetNodeId(`${assetType}-${id}`)).toEqual({
        assetType,
        entityId: id,
      });
      expect(
        AssetPathParamSchema.safeParse({
          workspaceSlug: "workspace",
          assetId: `${assetType}-${id}`,
        }).success,
      ).toBe(true);
    }
    expect(parseCollectionNodeId(`folder-${id}`)).toEqual({
      nodeType: "folder",
      entityId: id,
    });
    expect(
      BulkDeleteBodySchema.safeParse({
        nodeIds: [`folder-${id}`, `text-${id}`, `arrow-${id}`],
      }).success,
    ).toBe(true);
  });

  it("rejects numeric IDs and optimistic IDs at persisted API boundaries", () => {
    for (const assetId of [
      "color-467",
      "note-34",
      `note-optimistic-${id}`,
      `note-${id}-extra`,
    ]) {
      expect(
        AssetPathParamSchema.safeParse({ workspaceSlug: "workspace", assetId })
          .success,
      ).toBe(false);
      expect(() => parseAssetNodeId(assetId)).toThrow();
    }
    expect(
      InboxUploadPathParamSchema.safeParse({
        workspaceSlug: "workspace",
        uploadId: id,
      }).success,
    ).toBe(true);
    expect(
      InboxUploadPathParamSchema.safeParse({
        workspaceSlug: "workspace",
        uploadId: "34",
      }).success,
    ).toBe(false);
    expect(
      MentionResolveSchema.safeParse({
        targets: [{ assetId: 34, assetType: "note" }],
      }).success,
    ).toBe(false);
  });

  it("round-trips UUID background jobs and rejects legacy numeric queue payloads", () => {
    expect(isUuid(id)).toBe(true);
    const media = resourceMediaRenditionJob(id, 1);
    const resolution = urlResolutionJob(id, 1);
    const naming = {
      version: 1,
      kind: "gradient.name",
      assetId: id,
      fingerprint: "a".repeat(64),
      expectedTitle: "Gradient",
      expectedManual: false,
    };
    expect(parseResourceMediaRenditionJob(media)).toEqual(media);
    expect(parseUrlResolutionJob(resolution)).toEqual(resolution);
    expect(parseGradientNamingJob(naming)).toEqual(naming);
    expect(() =>
      parseResourceMediaRenditionJob({ ...media, mediaId: 34 }),
    ).toThrow();
    expect(() =>
      parseUrlResolutionJob({ ...resolution, attemptId: 34 }),
    ).toThrow();
    expect(() => parseGradientNamingJob({ ...naming, assetId: 34 })).toThrow();
  });
});
