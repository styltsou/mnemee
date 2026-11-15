import {
  COLLECTION_NODE_ID_PATTERN,
  ASSET_ID_PATTERN,
} from "@mnemee/id-shared";
import { AppError, ErrorCode } from "@/lib/errors";

export type AssetNodeIdentifier = {
  assetType: "image" | "video" | "note" | "link" | "color";
  entityId: string;
};

export type CollectionNodeIdentifier =
  | { nodeType: "folder"; entityId: string }
  | {
      nodeType: "asset";
      assetType: "image" | "video" | "note" | "link" | "color";
      entityId: string;
    };

const collectionNodeIdPattern = COLLECTION_NODE_ID_PATTERN;
const assetNodeIdPattern = ASSET_ID_PATTERN;

/** Parses a public collection-node ID into its persisted target kind and ID. */
export function parseCollectionNodeId(
  nodeId: string,
): CollectionNodeIdentifier {
  const match = collectionNodeIdPattern.exec(nodeId);
  const entityId = match?.[2];
  if (!match || !entityId) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Invalid node id");
  }

  if (match[1] === "folder") {
    return { nodeType: "folder", entityId };
  }

  return {
    nodeType: "asset",
    assetType: match[1] as AssetNodeIdentifier["assetType"],
    entityId,
  };
}

/** Restricts Inbox asset operations to persisted asset node identifiers. */
export function parseAssetNodeId(nodeId: string): AssetNodeIdentifier {
  const match = assetNodeIdPattern.exec(nodeId);
  const entityId = match?.[2];
  if (!match || !entityId) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Invalid asset id");
  }

  return { assetType: match[1] as AssetNodeIdentifier["assetType"], entityId };
}
