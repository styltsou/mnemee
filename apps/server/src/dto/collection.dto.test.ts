import { describe, expect, it } from "vitest";

import { NOTE_CONTENT_MAX_LENGTH } from "@/constants";
import {
  BoardPositionSchema,
  CollectionNodePathParamSchema,
  CreateFolderSchema,
  RenameCollectionSchema,
  CreateNoteSchema,
  AssetPathParamSchema,
  CollectionAssetNodePathParamSchema,
  CollectionContentsQuerySchema,
  CreateCanvasArrowSchema,
  CreateCanvasTextSchema,
  UpdateNodePositionSchema,
  UpdateNodePositionsSchema,
  UpdateNoteSchema,
  UpdateImageSchema,
  UpdateVideoSchema,
  UpdateLinkSchema,
  MoveCollectionNodesParentSchema,
  UpdateCanvasTextSchema,
  UpdateCanvasArrowSchema,
  UpdateCanvasItemFrontIndexesSchema,
  CreateColorSchema,
  UpdateColorSchema,
} from "./collection.dto";

describe("color DTOs", () => {
  const gradient = {
    from: "#112233",
    to: "#445566",
    angle: 90,
    type: "radial" as const,
  };

  it("allows gradient colors without a hex value", () => {
    expect(CreateColorSchema.parse({ gradient })).toEqual({ gradient });
    expect(CreateColorSchema.safeParse({}).success).toBe(false);
  });

  it("requires a hex when changing a gradient back to a solid color", () => {
    expect(UpdateColorSchema.safeParse({ gradient: null }).success).toBe(false);
    expect(
      UpdateColorSchema.safeParse({ gradient: null, hex: "#112233" }).success,
    ).toBe(true);
  });
});

describe("collection board position DTOs", () => {
  it("trims collection rename input and rejects blank names", () => {
    expect(RenameCollectionSchema.parse({ name: "  Research  " })).toEqual({
      name: "Research",
    });
    expect(RenameCollectionSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
  });

  it("accepts signed integer canvas coordinates", () => {
    expect(BoardPositionSchema.parse({ x: -48, y: 96 })).toEqual({
      x: -48,
      y: 96,
    });
  });

  it("rejects fractional and out-of-range coordinates", () => {
    expect(BoardPositionSchema.safeParse({ x: 24.5, y: 0 }).success).toBe(
      false,
    );
    expect(
      BoardPositionSchema.safeParse({ x: 2_147_483_648, y: 0 }).success,
    ).toBe(false);
  });

  it("carries optional positions through collection creation inputs", () => {
    expect(
      CreateFolderSchema.parse({
        name: "References",
        position: { x: 0, y: 24 },
      }).position,
    ).toEqual({ x: 0, y: 24 });
    expect(
      CreateNoteSchema.parse({ content: "Idea", position: { x: 72, y: 48 } })
        .position,
    ).toEqual({ x: 72, y: 48 });
  });

  it("accepts a title-only note and enforces bounded note fields", () => {
    expect(
      CreateNoteSchema.safeParse({
        content: "x".repeat(NOTE_CONTENT_MAX_LENGTH),
      }).success,
    ).toBe(true);
    expect(
      CreateNoteSchema.safeParse({
        content: "x".repeat(NOTE_CONTENT_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(UpdateNoteSchema.parse({ content: "A growing idea" })).toEqual({
      content: "A growing idea",
    });
    expect(CreateNoteSchema.parse({ title: "Idea" })).toMatchObject({
      content: "",
      title: "Idea",
    });
    expect(UpdateNoteSchema.safeParse({ content: "" }).success).toBe(true);
    expect(
      UpdateNoteSchema.safeParse({
        content: "x".repeat(NOTE_CONTENT_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(
      UpdateNoteSchema.safeParse({
        content: "x".repeat(NOTE_CONTENT_MAX_LENGTH),
      }).success,
    ).toBe(true);
    expect(
      CreateNoteSchema.safeParse({ content: "", title: "  " }).success,
    ).toBe(false);
  });

  it("requires a complete position update", () => {
    expect(
      UpdateNodePositionSchema.safeParse({
        position: { x: 48 },
        expectedParentFolderNodeId: null,
      }).success,
    ).toBe(false);
  });

  it("accepts unique batch positions and rejects duplicate or singleton batches", () => {
    expect(
      UpdateNodePositionsSchema.safeParse({
        positions: [
          {
            nodeId: "image-00000000-0000-4000-8000-000000000001",
            position: { x: 48, y: 24 },
          },
          {
            nodeId: "folder-00000000-0000-4000-8000-000000000002",
            position: { x: 144, y: 24 },
          },
        ],
        expectedParentFolderNodeId: null,
      }).success,
    ).toBe(true);
    expect(
      UpdateNodePositionsSchema.safeParse({
        positions: [
          {
            nodeId: "image-00000000-0000-4000-8000-000000000001",
            position: { x: 48, y: 24 },
          },
          {
            nodeId: "image-00000000-0000-4000-8000-000000000001",
            position: { x: 144, y: 24 },
          },
        ],
        expectedParentFolderNodeId: null,
      }).success,
    ).toBe(false);
    expect(
      UpdateNodePositionsSchema.safeParse({
        positions: [
          {
            nodeId: "image-00000000-0000-4000-8000-000000000001",
            position: { x: 48, y: 24 },
          },
        ],
        expectedParentFolderNodeId: null,
      }).success,
    ).toBe(false);
  });

  it("accepts unique stackable canvas items and rejects arrows", () => {
    expect(
      UpdateCanvasItemFrontIndexesSchema.safeParse({
        itemIds: [
          "image-00000000-0000-4000-8000-000000000001",
          "text-00000000-0000-4000-8000-000000000002",
          "folder-00000000-0000-4000-8000-000000000003",
        ],
        expectedParentFolderNodeId: null,
      }).success,
    ).toBe(true);
    expect(
      UpdateCanvasItemFrontIndexesSchema.safeParse({
        itemIds: [
          "image-00000000-0000-4000-8000-000000000001",
          "image-00000000-0000-4000-8000-000000000001",
        ],
        expectedParentFolderNodeId: null,
      }).success,
    ).toBe(false);
    expect(
      UpdateCanvasItemFrontIndexesSchema.safeParse({
        itemIds: ["arrow-00000000-0000-4000-8000-000000000001"],
        expectedParentFolderNodeId: null,
      }).success,
    ).toBe(false);
  });

  it("accepts a folder or collection-root move target", () => {
    expect(
      UpdateNodePositionSchema.safeParse({ position: { x: 48, y: 24 } })
        .success,
    ).toBe(false);
    expect(
      MoveCollectionNodesParentSchema.safeParse({
        nodeIds: ["image-00000000-0000-4000-8000-000000000001"],
        targetFolderNodeId: "folder-00000000-0000-4000-8000-000000000007",
      }).success,
    ).toBe(true);
    expect(
      CollectionNodePathParamSchema.safeParse({
        workspaceSlug: "design",
        collectionSlug: "references",
        nodeId: "folder-00000000-0000-4000-8000-000000000007",
      }).success,
    ).toBe(true);
    expect(
      MoveCollectionNodesParentSchema.safeParse({
        nodeIds: ["image-00000000-0000-4000-8000-000000000001"],
        targetFolderNodeId: "note-00000000-0000-4000-8000-000000000007",
      }).success,
    ).toBe(false);
    expect(
      CollectionAssetNodePathParamSchema.safeParse({
        workspaceSlug: "design",
        collectionSlug: "references",
        nodeId: "folder-00000000-0000-4000-8000-000000000007",
      }).success,
    ).toBe(false);
  });

  it("accepts unique mixed-node batch moves and rejects duplicates", () => {
    const move = {
      nodeIds: [
        "image-00000000-0000-4000-8000-000000000001",
        "folder-00000000-0000-4000-8000-000000000002",
        "note-00000000-0000-4000-8000-000000000003",
      ],
      targetFolderNodeId: "folder-00000000-0000-4000-8000-000000000007",
    };

    expect(MoveCollectionNodesParentSchema.safeParse(move).success).toBe(true);
    expect(
      MoveCollectionNodesParentSchema.safeParse({
        ...move,
        nodeIds: [
          "image-00000000-0000-4000-8000-000000000001",
          "image-00000000-0000-4000-8000-000000000001",
        ],
      }).success,
    ).toBe(false);
    expect(
      MoveCollectionNodesParentSchema.safeParse({
        nodeIds: ["image-00000000-0000-4000-8000-000000000001"],
        targetFolderNodeId: null,
      }).success,
    ).toBe(true);
  });

  it("validates asset and collection node identifier formats", () => {
    expect(
      AssetPathParamSchema.safeParse({
        workspaceSlug: "design",
        assetId: "image-00000000-0000-4000-8000-00000000000c",
      }).success,
    ).toBe(true);
    expect(
      CollectionNodePathParamSchema.safeParse({
        workspaceSlug: "design",
        collectionSlug: "references",
        nodeId: "folder-00000000-0000-4000-8000-000000000007",
      }).success,
    ).toBe(true);
    expect(
      AssetPathParamSchema.safeParse({
        workspaceSlug: "design",
        assetId: "folder-00000000-0000-4000-8000-000000000007",
      }).success,
    ).toBe(false);
    expect(
      CollectionNodePathParamSchema.safeParse({
        workspaceSlug: "design",
        collectionSlug: "references",
        nodeId: "asset-7",
      }).success,
    ).toBe(false);
  });

  it("parses comma-separated content type filters", () => {
    expect(
      CollectionContentsQuerySchema.parse({
        folderPath: "references",
        types: "image,note",
      }),
    ).toEqual({ folderPath: "references", types: ["image", "note"] });
    expect(CollectionContentsQuerySchema.parse({ types: "video" })).toEqual({
      types: ["video"],
    });
  });
});

describe("canvas object DTOs", () => {
  it("applies restrained text defaults and rejects blank text", () => {
    expect(
      CreateCanvasTextSchema.parse({
        content: "Direction",
        position: { x: -24, y: 80 },
      }),
    ).toMatchObject({
      type: "text",
      font: "inter",
      size: "md",
      color: "ink",
    });
    expect(
      CreateCanvasTextSchema.safeParse({
        content: "   ",
        position: { x: 0, y: 0 },
      }).success,
    ).toBe(false);
    expect(UpdateCanvasTextSchema.safeParse({}).success).toBe(false);
  });

  it("accepts the expanded canvas color palette", () => {
    for (const color of ["saffron", "violet", "fuchsia"] as const) {
      expect(
        CreateCanvasTextSchema.safeParse({
          content: "Palette sample",
          position: { x: 0, y: 0 },
          color,
        }).success,
      ).toBe(true);
    }
  });

  it("accepts free and bound arrow endpoints with normalized anchors", () => {
    const parsed = CreateCanvasArrowSchema.safeParse({
      start: { position: { x: 0, y: 0 } },
      end: {
        position: { x: 160, y: 40 },
        binding: {
          targetId: "image-00000000-0000-4000-8000-000000000009",
          anchor: { x: 0, y: 0.5 },
        },
      },
      style: "sketch",
      pattern: "dashed",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.rotation).toBe(0);
    expect(
      UpdateCanvasArrowSchema.safeParse({ rotation: Number.POSITIVE_INFINITY })
        .success,
    ).toBe(false);
    expect(
      CreateCanvasArrowSchema.safeParse({
        start: { position: { x: 0, y: 0 } },
        end: {
          position: { x: 160, y: 40 },
          binding: {
            targetId: "image-00000000-0000-4000-8000-000000000009",
            anchor: { x: 1.1, y: 0.5 },
          },
        },
      }).success,
    ).toBe(false);
  });
});

describe("image note DTOs", () => {
  it("accepts name-only edits without injecting a note change", () => {
    for (const schema of [UpdateImageSchema, UpdateVideoSchema]) {
      expect(schema.parse({ title: "  Coast study  " })).toEqual({
        title: "Coast study",
      });
      expect(schema.parse({ title: null })).toEqual({ title: null });
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ title: "x".repeat(256) }).success).toBe(false);
    }
  });
  it("accepts bounded text and clearing an image note", () => {
    expect(
      UpdateImageSchema.parse({ note: "Reference for the hero image" }),
    ).toEqual({ note: "Reference for the hero image" });
    expect(UpdateImageSchema.parse({ note: null })).toEqual({ note: null });
    expect(
      UpdateImageSchema.safeParse({ note: "x".repeat(10_001) }).success,
    ).toBe(false);
  });
});

describe("link note DTOs", () => {
  it("accepts bounded text and clearing a link note", () => {
    expect(
      UpdateLinkSchema.parse({ note: "Watch with the design team" }),
    ).toEqual({ note: "Watch with the design team" });
    expect(UpdateLinkSchema.parse({ note: null })).toEqual({ note: null });
    expect(
      UpdateLinkSchema.safeParse({ note: "x".repeat(10_001) }).success,
    ).toBe(false);
  });
});
