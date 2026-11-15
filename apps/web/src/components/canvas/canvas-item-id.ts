import {
  CANVAS_ITEM_ID_PATTERN,
  COLLECTION_NODE_ID_PATTERN,
} from "@mnemee/id-shared";
const persistedCanvasItemIdPattern = CANVAS_ITEM_ID_PATTERN;
const persistedCollectionNodeIdPattern = COLLECTION_NODE_ID_PATTERN;

export function isPersistedCanvasItemId(id: string): boolean {
  return persistedCanvasItemIdPattern.test(id);
}

export function isPersistedCollectionNodeId(id: string): boolean {
  return persistedCollectionNodeIdPattern.test(id);
}
