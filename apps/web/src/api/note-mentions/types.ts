export type NoteMentionType = "note" | "color" | "link" | "image" | "video";

export type NoteMentionTarget = {
  assetId: string;
  assetType: NoteMentionType;
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
  hostname?: string | null;
  url?: string | null;
  previewUrl?: string | null;
  faviconUrl?: string | null;
  isVideo?: boolean;
  snippet: string | null;
  locationLabel: string;
  collectionSlug: string | null;
  folderPath: string | null;
};

export type NoteMentionTargetsResponse = { targets: NoteMentionTarget[] };

export type NoteBacklink = {
  assetId: string;
  title: string;
  locationLabel: string;
  updatedAt: string;
};

export type NoteBacklinkSummaryResponse = { count: number };
export type NoteBacklinksResponse = { backlinks: NoteBacklink[] };

export type MentionSearchInput = {
  q: string;
  types?: readonly NoteMentionType[];
  limit?: number;
  sourceAssetId?: string;
};

export type MentionResolveInput = {
  sourceAssetId?: string;
  targets: Array<{ assetId: string; assetType: NoteMentionType }>;
};
