import { NOTE_ID_PATTERN } from "@mnemee/id-shared";
import { z } from "zod";

const MentionTypeSchema = z.enum(["note", "color", "link", "image", "video"]);
const NoteAssetIdSchema = z.string().regex(NOTE_ID_PATTERN);
const MentionTargetSchema = z.object({
  assetId: z.uuidv4(),
  assetType: MentionTypeSchema,
});

export const MentionSearchQuerySchema = z.object({
  q: z.string().max(120).optional().default(""),
  types: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(MentionTypeSchema).min(1).max(5).optional(),
  ),
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
  sourceAssetId: z.uuidv4().optional(),
});

export const MentionResolveSchema = z.object({
  sourceAssetId: z.uuidv4().optional(),
  targets: z.array(MentionTargetSchema).max(100),
});

export const NoteBacklinksPathParamSchema = z.object({
  workspaceSlug: z.string(),
  assetId: NoteAssetIdSchema,
});

export type MentionType = z.infer<typeof MentionTypeSchema>;
export type MentionSearchQuery = z.infer<typeof MentionSearchQuerySchema>;
export type MentionResolveInput = z.infer<typeof MentionResolveSchema>;

export type NoteBacklink = {
  assetId: string;
  title: string;
  locationLabel: string;
  updatedAt: string;
};

export type NoteBacklinkSummaryResponse = { count: number };
export type NoteBacklinksResponse = { backlinks: NoteBacklink[] };

export type MentionTarget = {
  assetId: string;
  assetType: MentionType;
  label: string;
  title: string | null;
  hex: string | null;
  gradient: {
    from: string;
    to: string;
    angle: number;
    type?: "linear" | "radial";
    stops?: Array<{ color: string; position: number }>;
  } | null;
  hostname: string | null;
  url: string | null;
  previewUrl: string | null;
  faviconUrl: string | null;
  isVideo: boolean;
  snippet: string | null;
  locationLabel: string;
  collectionSlug: string | null;
  folderPath: string | null;
};

export type MentionTargetsResponse = { targets: MentionTarget[] };
