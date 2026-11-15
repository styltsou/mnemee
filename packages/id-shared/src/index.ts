/** Canonical random UUIDs used by PostgreSQL gen_random_uuid() and crypto.randomUUID(). */
export const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

const uuid = new RegExp(`^${UUID_PATTERN}$`);

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value);
}

// Both capture groups are consistent: [1] is the prefix, [2] is the UUID.
function prefixedPattern(prefixes: string): RegExp {
  return new RegExp(`^(${prefixes})-(${UUID_PATTERN})$`);
}

export const ASSET_ID_PATTERN = prefixedPattern("image|video|note|link|color");
export const COLLECTION_NODE_ID_PATTERN = prefixedPattern(
  "folder|image|video|note|link|color",
);
export const CANVAS_ITEM_ID_PATTERN = prefixedPattern(
  "folder|image|video|note|link|color|text|arrow",
);
export const CANVAS_OBJECT_ID_PATTERN = prefixedPattern("text|arrow");
export const STACKABLE_CANVAS_ITEM_ID_PATTERN = prefixedPattern(
  "folder|image|video|note|link|color|text",
);
export const FOLDER_ID_PATTERN = prefixedPattern("folder");
export const TEXT_ID_PATTERN = prefixedPattern("text");
export const ARROW_ID_PATTERN = prefixedPattern("arrow");
export const IMAGE_ID_PATTERN = prefixedPattern("image");
export const LINK_ID_PATTERN = prefixedPattern("link");
export const NOTE_ID_PATTERN = prefixedPattern("note");
export const MENTION_DESTINATION_PATTERN = new RegExp(
  `^(note|color|link|image|video):(${UUID_PATTERN})$`,
);
