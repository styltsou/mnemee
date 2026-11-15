import { reserveCanvasFrontIndex } from "@/services/collection/canvas-stacking.service";
import { and, arrayContains, eq, isNull } from "drizzle-orm";
import slugify from "slugify";

import { db } from "@/db";
import {
  assets,
  collectionNodes,
  collectionsTable,
  colorAssets,
  folders,
  noteAssets,
} from "@/db/schema";
import type {
  CollectionColorNode,
  CollectionNoteNode,
  CreateCollectionInput,
  CreateColorInput,
  CreateFolderInput,
  CreateNoteInput,
  CreatedFolder,
  RenameCollectionInput,
  UpdateNodePositionInput,
  UpdateNodePositionsInput,
} from "@/dto/collection.dto";
import { AppError, ErrorCode } from "@/lib/errors";
import { parseCollectionNodeId } from "@/lib/collection-node-id";
import { getColorName, normalizeHexColor } from "@/lib/color-names";
import {
  getColorGradientTitle,
  normalizeColorGradient,
} from "@/lib/color-gradient";
import { calculateNoteMetrics } from "@/lib/note-metrics";
import { normalizeNoteTitle } from "@/lib/note-title";
import { reconcileNoteReferences } from "@/services/note-mention.service";
import {
  namingStateFromQueue,
  queueGradientName,
} from "@/services/gradient-naming.service";
import {
  getCollectionBySlug,
  resolveTargetInCollection,
} from "./collection-target-resolver";
import type { CreatedCollectionRow } from "./collection.types";

export class CollectionMutationService {
  async renameCollection(
    orgId: string,
    userId: string,
    collectionSlug: string,
    data: RenameCollectionInput,
  ): Promise<CreatedCollectionRow> {
    const [updated] = await db
      .update(collectionsTable)
      .set({ name: data.name, updatedByUserId: userId })
      .where(
        and(
          eq(collectionsTable.organizationId, orgId),
          eq(collectionsTable.slug, collectionSlug),
        ),
      )
      .returning();

    if (!updated) {
      throw new AppError(ErrorCode.NOT_FOUND, "Collection not found");
    }

    return updated;
  }

  async createCollection(
    orgId: string,
    userId: string,
    data: CreateCollectionInput,
  ): Promise<CreatedCollectionRow> {
    let slug = slugify(data.name, { lower: true, strict: true });

    if (!slug) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        "Name must contain at least one letter or number",
      );
    }

    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
      const existing = await db
        .select({ id: collectionsTable.id })
        .from(collectionsTable)
        .where(
          and(
            eq(collectionsTable.organizationId, orgId),
            eq(collectionsTable.slug, candidate),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        slug = candidate;
        break;
      }
    }

    const [inserted] = await db
      .insert(collectionsTable)
      .values({
        organizationId: orgId,
        name: data.name,
        slug,
        createdByUserId: userId,
        updatedByUserId: userId,
      })
      .returning();

    if (!inserted) {
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        "Failed to create collection",
      );
    }

    return inserted;
  }

  async renameFolder(
    orgId: string,
    userId: string,
    collectionSlug: string,
    nodeId: string,
    data: RenameCollectionInput,
  ): Promise<void> {
    const collection = await getCollectionBySlug(orgId, collectionSlug);
    const target = parseCollectionNodeId(nodeId);
    if (target.nodeType !== "folder")
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Invalid folder id");
    await db.transaction(async (tx) => {
      const [node] = await tx
        .select({ pathFolderIds: collectionNodes.pathFolderIds })
        .from(collectionNodes)
        .where(
          and(
            eq(collectionNodes.organizationId, orgId),
            eq(collectionNodes.collectionId, collection.id),
            eq(collectionNodes.folderId, target.entityId),
          ),
        )
        .limit(1)
        .for("update");
      if (!node) throw new AppError(ErrorCode.NOT_FOUND, "Folder not found");
      const prefix = node.pathFolderIds;
      const descendants = await tx
        .select({
          id: collectionNodes.id,
          pathFolderIds: collectionNodes.pathFolderIds,
          pathFolderNames: collectionNodes.pathFolderNames,
        })
        .from(collectionNodes)
        .where(
          and(
            eq(collectionNodes.organizationId, orgId),
            eq(collectionNodes.collectionId, collection.id),
            arrayContains(collectionNodes.pathFolderIds, prefix),
          ),
        )
        .for("update");
      await tx
        .update(folders)
        .set({ name: data.name, updatedByUserId: userId })
        .where(
          and(
            eq(folders.organizationId, orgId),
            eq(folders.id, target.entityId),
          ),
        );
      for (const descendant of descendants) {
        if (
          !prefix.every((id, index) => descendant.pathFolderIds[index] === id)
        )
          continue;
        const names = [...descendant.pathFolderNames];
        names[prefix.length - 1] = data.name;
        await tx
          .update(collectionNodes)
          .set({ pathFolderNames: names })
          .where(eq(collectionNodes.id, descendant.id));
      }
    });
  }

  async createFolder(
    orgId: string,
    userId: string,
    collectionSlug: string,
    data: CreateFolderInput,
  ): Promise<CreatedFolder> {
    const collection = await getCollectionBySlug(orgId, collectionSlug);
    const parentTarget = await resolveTargetInCollection(
      collection,
      data.parentFolderPath,
    );
    const slug = await getAvailableFolderSlug(
      collection.id,
      parentTarget.pathFolderSlugs,
      data.name,
    );

    const folder = await db.transaction(async (tx) => {
      const frontIndex = await reserveCanvasFrontIndex(
        tx,
        orgId,
        collection.id,
        parentTarget.parentFolderId,
      );
      const [insertedFolder] = await tx
        .insert(folders)
        .values({
          organizationId: orgId,
          name: data.name,
          slug,
          createdByUserId: userId,
          updatedByUserId: userId,
        })
        .returning();

      if (!insertedFolder) {
        throw new AppError(ErrorCode.INTERNAL_ERROR, "Failed to create folder");
      }

      await tx.insert(collectionNodes).values({
        organizationId: orgId,
        collectionId: collection.id,
        parentFolderId: parentTarget.parentFolderId,
        frontIndex,
        nodeType: "folder",
        folderId: insertedFolder.id,
        positionX: data.position?.x,
        positionY: data.position?.y,
        depth: parentTarget.pathFolderSlugs.length,
        pathFolderIds: [...parentTarget.pathFolderIds, insertedFolder.id],
        pathFolderSlugs: [...parentTarget.pathFolderSlugs, insertedFolder.slug],
        pathFolderNames: [...parentTarget.pathFolderNames, insertedFolder.name],
      });

      return { ...insertedFolder, frontIndex };
    });

    if (!folder) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, "Failed to create folder");
    }

    return {
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      path: [...parentTarget.pathFolderSlugs, folder.slug].join("/"),
      count: 0,
      previews: [],
      createdAt: folder.createdAt.toISOString(),
      position: data.position ?? null,
      frontIndex: folder.frontIndex,
    };
  }

  async createNote(
    orgId: string,
    userId: string,
    collectionSlug: string,
    data: CreateNoteInput,
  ): Promise<CollectionNoteNode> {
    const collection = await getCollectionBySlug(orgId, collectionSlug);
    const parentTarget = await resolveTargetInCollection(
      collection,
      data.parentFolderPath,
    );

    const note = await db.transaction(async (tx) => {
      const frontIndex = await reserveCanvasFrontIndex(
        tx,
        orgId,
        collection.id,
        parentTarget.parentFolderId,
      );
      const [insertedAsset] = await tx
        .insert(assets)
        .values({
          organizationId: orgId,
          type: "note",
          title: normalizeNoteTitle(data.title),
          createdByUserId: userId,
          updatedByUserId: userId,
        })
        .returning();

      if (!insertedAsset) {
        throw new AppError(ErrorCode.INTERNAL_ERROR, "Failed to create note");
      }

      const markdown = await reconcileNoteReferences(
        tx,
        orgId,
        insertedAsset.id,
        data.content,
      );
      await tx.insert(noteAssets).values({
        assetId: insertedAsset.id,
        markdown,
      });

      await tx.insert(collectionNodes).values({
        organizationId: orgId,
        collectionId: collection.id,
        parentFolderId: parentTarget.parentFolderId,
        frontIndex,
        nodeType: "asset",
        assetId: insertedAsset.id,
        positionX: data.position?.x,
        positionY: data.position?.y,
        depth: parentTarget.pathFolderSlugs.length,
        pathFolderIds: parentTarget.pathFolderIds,
        pathFolderSlugs: parentTarget.pathFolderSlugs,
        pathFolderNames: parentTarget.pathFolderNames,
      });

      return { ...insertedAsset, markdown, frontIndex };
    });

    if (!note) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, "Failed to create note");
    }

    const { wordCount, readingTimeMinutes } = calculateNoteMetrics(
      note.markdown,
    );

    return {
      id: `note-${note.id}`,
      type: "note",
      content: note.markdown,
      title: normalizeNoteTitle(data.title),
      isFavorite: false,
      wordCount,
      readingTimeMinutes,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      position: data.position ?? null,
      frontIndex: note.frontIndex,
    };
  }

  async createColor(
    orgId: string,
    userId: string,
    collectionSlug: string,
    data: CreateColorInput,
  ): Promise<CollectionColorNode> {
    const collection = await getCollectionBySlug(orgId, collectionSlug);
    const parentTarget = await resolveTargetInCollection(
      collection,
      data.parentFolderPath,
    );
    const gradient = data.gradient
      ? normalizeColorGradient(data.gradient)
      : null;
    const hex = gradient ? null : normalizeHexColor(data.hex!);
    const name = gradient
      ? getColorGradientTitle(gradient)
      : getColorName(hex!);

    const color = await db.transaction(async (tx) => {
      const frontIndex = await reserveCanvasFrontIndex(
        tx,
        orgId,
        collection.id,
        parentTarget.parentFolderId,
      );
      const [insertedAsset] = await tx
        .insert(assets)
        .values({
          organizationId: orgId,
          type: "color",
          title: name,
          createdByUserId: userId,
          updatedByUserId: userId,
        })
        .returning();

      if (!insertedAsset) {
        throw new AppError(ErrorCode.INTERNAL_ERROR, "Failed to create color");
      }

      await tx.insert(colorAssets).values({
        assetId: insertedAsset.id,
        hex,
        gradient,
      });

      await tx.insert(collectionNodes).values({
        organizationId: orgId,
        collectionId: collection.id,
        parentFolderId: parentTarget.parentFolderId,
        frontIndex,
        nodeType: "asset",
        assetId: insertedAsset.id,
        positionX: data.position?.x,
        positionY: data.position?.y,
        depth: parentTarget.pathFolderSlugs.length,
        pathFolderIds: parentTarget.pathFolderIds,
        pathFolderSlugs: parentTarget.pathFolderSlugs,
        pathFolderNames: parentTarget.pathFolderNames,
      });

      return { ...insertedAsset, frontIndex };
    });

    if (!color) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, "Failed to create color");
    }

    const namingResult = gradient
      ? await queueGradientName(color.id, gradient, name ?? "", false)
      : { queued: false };

    return {
      id: `color-${color.id}`,
      type: "color",
      hex,
      note: null,
      gradient,
      title: name,
      nameEditedByUser: false,
      naming: namingStateFromQueue(namingResult),
      isFavorite: false,
      createdAt: color.createdAt.toISOString(),
      updatedAt: color.updatedAt.toISOString(),
      position: data.position ?? null,
      frontIndex: color.frontIndex,
    };
  }

  async updateNodePosition(
    orgId: string,
    collectionSlug: string,
    nodeId: string,
    data: UpdateNodePositionInput,
  ): Promise<{
    nodeId: string;
    position: UpdateNodePositionInput["position"];
  }> {
    const collection = await getCollectionBySlug(orgId, collectionSlug);
    const target = parseCollectionNodeId(nodeId);
    const expectedParent = data.expectedParentFolderNodeId
      ? parseCollectionNodeId(data.expectedParentFolderNodeId)
      : null;
    if (expectedParent && expectedParent.nodeType !== "folder") {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        "Expected parent must be a folder node",
      );
    }
    const targetCondition =
      target.nodeType === "folder"
        ? and(
            eq(collectionNodes.nodeType, "folder"),
            eq(collectionNodes.folderId, target.entityId),
          )
        : and(
            eq(collectionNodes.nodeType, "asset"),
            eq(collectionNodes.assetId, target.entityId),
          );
    const [updated] = await db
      .update(collectionNodes)
      .set({ positionX: data.position.x, positionY: data.position.y })
      .where(
        and(
          eq(collectionNodes.organizationId, orgId),
          eq(collectionNodes.collectionId, collection.id),
          targetCondition,
          data.expectedParentFolderNodeId === null
            ? isNull(collectionNodes.parentFolderId)
            : eq(collectionNodes.parentFolderId, expectedParent!.entityId),
        ),
      )
      .returning({ id: collectionNodes.id });

    if (!updated) {
      const existing = await db
        .select({ id: collectionNodes.id })
        .from(collectionNodes)
        .where(
          and(
            eq(collectionNodes.organizationId, orgId),
            eq(collectionNodes.collectionId, collection.id),
            targetCondition,
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        throw new AppError(
          ErrorCode.CONFLICT,
          "Collection node moved before its position could be saved",
        );
      }
      throw new AppError(ErrorCode.NOT_FOUND, "Collection node not found");
    }

    return { nodeId, position: data.position };
  }

  async updateNodePositions(
    orgId: string,
    collectionSlug: string,
    data: UpdateNodePositionsInput,
  ): Promise<{ nodeIds: string[] }> {
    const collection = await getCollectionBySlug(orgId, collectionSlug);
    const expectedParent = data.expectedParentFolderNodeId
      ? parseCollectionNodeId(data.expectedParentFolderNodeId)
      : null;
    if (expectedParent && expectedParent.nodeType !== "folder") {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        "Expected parent must be a folder node",
      );
    }

    const targets = data.positions.map(({ nodeId, position }) => ({
      nodeId,
      position,
      target: parseCollectionNodeId(nodeId),
    }));

    await db.transaction(async (tx) => {
      for (const { target, position } of targets) {
        const targetCondition =
          target.nodeType === "folder"
            ? and(
                eq(collectionNodes.nodeType, "folder"),
                eq(collectionNodes.folderId, target.entityId),
              )
            : and(
                eq(collectionNodes.nodeType, "asset"),
                eq(collectionNodes.assetId, target.entityId),
              );
        const [updated] = await tx
          .update(collectionNodes)
          .set({ positionX: position.x, positionY: position.y })
          .where(
            and(
              eq(collectionNodes.organizationId, orgId),
              eq(collectionNodes.collectionId, collection.id),
              targetCondition,
              data.expectedParentFolderNodeId === null
                ? isNull(collectionNodes.parentFolderId)
                : eq(collectionNodes.parentFolderId, expectedParent!.entityId),
            ),
          )
          .returning({ id: collectionNodes.id });

        if (!updated) {
          throw new AppError(
            ErrorCode.CONFLICT,
            "A collection node moved before its positions could be saved",
          );
        }
      }
    });

    return { nodeIds: data.positions.map(({ nodeId }) => nodeId) };
  }
}

async function getAvailableFolderSlug(
  collectionId: string,
  parentPathSlugs: string[],
  name: string,
): Promise<string> {
  const baseSlug = slugify(name, { lower: true, strict: true });
  if (!baseSlug) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      "Name must contain at least one letter or number",
    );
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
    const existing = await db
      .select({ id: collectionNodes.id })
      .from(collectionNodes)
      .where(
        and(
          eq(collectionNodes.collectionId, collectionId),
          eq(collectionNodes.pathFolderSlugs, [...parentPathSlugs, candidate]),
          eq(collectionNodes.nodeType, "folder"),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }
  }

  throw new AppError(
    ErrorCode.CONFLICT,
    "A folder with this name already exists",
  );
}
