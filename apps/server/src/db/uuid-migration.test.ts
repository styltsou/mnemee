import {
  readFileSync,
  readdirSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { cube } from "@electric-sql/pglite/contrib/cube";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { isUuid } from "@mnemee/id-shared";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";

const migrations = fileURLToPath(new URL("../../drizzle/", import.meta.url));
const migrationName = "20261115141408_uuid_entity_ids";
const migration = readFileSync(
  `${migrations}/${migrationName}/migration.sql`,
  "utf8",
);
const pg = new PGlite({ extensions: { cube, btree_gist, pg_trgm } });

async function applyHistoricalMigrations(database: PGlite) {
  for (const name of readdirSync(migrations).sort()) {
    if (name >= migrationName) break;
    const sql = readFileSync(`${migrations}/${name}/migration.sql`, "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await database.exec(statement);
    }
  }
}

beforeAll(async () => {
  await applyHistoricalMigrations(pg);
  await pg.exec(`
    INSERT INTO "user" (id, name, email) VALUES ('u', 'Owner', 'owner@example.test');
    INSERT INTO organization (id, name, slug, created_at) VALUES
      ('o', 'Workspace', 'workspace', now()), ('other', 'Other', 'other', now());
    INSERT INTO collections (organization_id, name, slug) VALUES ('o', 'Board', 'board');
    INSERT INTO assets (organization_id, type, title) VALUES
      ('o', 'note', 'Note'), ('o', 'color', 'Color'), ('o', 'image', 'Image'),
      ('o', 'link', 'Link'), ('o', 'video', 'Video');
    INSERT INTO note_assets (asset_id, markdown) VALUES (1, '');
    INSERT INTO color_assets (asset_id, hex) VALUES (2, '#123456');
    INSERT INTO image_assets (asset_id, width, height) VALUES (3, 640, 480);
    INSERT INTO video_assets (asset_id) VALUES (5);
    INSERT INTO external_resources (organization_id, normalized_url, normalized_url_hash, hostname)
      VALUES ('o', 'https://example.test', repeat('a', 64), 'example.test');
    INSERT INTO link_assets (asset_id, organization_id, resource_id, original_url)
      VALUES (4, 'o', 1, 'https://example.test');
    INSERT INTO resource_resolution_attempts (organization_id, resource_id, generation, trigger, resolver_key, resolver_version)
      VALUES ('o', 1, 1, 'paste', 'generic-html', '1');
    INSERT INTO external_resource_media (organization_id, resource_id, role, source_url, source_url_hash,
      source_resolver, source_metadata, processing_profile, generation, storage_id)
      VALUES ('o', 1, 'preview', 'https://example.test/image', repeat('b', 64), 'generic-html', 'og:image', 'link-preview-v1', 1, 'storage');
    INSERT INTO folders (organization_id, name, slug) VALUES ('o', 'Root', 'root'), ('o', 'Child', 'child');
    INSERT INTO collection_nodes (organization_id, collection_id, node_type, folder_id, path_folder_ids, path_folder_slugs)
      VALUES ('o', 1, 'folder', 1, ARRAY[1], ARRAY['root']);
    INSERT INTO collection_nodes (organization_id, collection_id, parent_folder_id, node_type, folder_id, depth, path_folder_ids, path_folder_slugs)
      VALUES ('o', 1, 1, 'folder', 2, 1, ARRAY[1,2], ARRAY['root','child']);
    INSERT INTO collection_nodes (organization_id, collection_id, parent_folder_id, node_type, asset_id, depth, path_folder_ids)
      VALUES ('o', 1, 2, 'asset', 1, 2, ARRAY[1,2]);
    INSERT INTO canvas_objects (organization_id, collection_id, parent_folder_id, object_type)
      VALUES ('o', 1, 2, 'text'), ('o', 1, 2, 'arrow');
    INSERT INTO canvas_text_objects (canvas_object_id, content, position_x, position_y) VALUES (1, 'Text', 1, 2);
    INSERT INTO canvas_arrow_objects (canvas_object_id, start_x, start_y, end_x, end_y,
      start_collection_node_id, start_anchor_x, start_anchor_y, end_canvas_object_id, end_anchor_x, end_anchor_y)
      VALUES (2, 0, 0, 10, 10, 3, 0.5, 0.5, 1, 0.5, 0.5);
    INSERT INTO uploads (organization_id, collection_id, source, original_object_key, storage_id, asset_id, content_type, size_bytes)
      VALUES ('o', 1, 'direct', 'o/existing-key/original.png', 'image-storage', 3, 'image/png', 100);
    INSERT INTO video_uploads (organization_id, collection_id, source, storage_id, asset_id, file_name)
      VALUES ('o', 1, 'direct', 'video-storage', 5, 'video.mp4');
    INSERT INTO media_cleanup_jobs (organization_id, asset_id, object_keys) VALUES ('o', 3, ARRAY['old-key']);
    INSERT INTO image_colors (organization_id, asset_id, hex, oklab_l, oklab_a, oklab_b, coverage, salience, is_accent, extraction_version)
      VALUES ('o', 3, '#123456', 0.5, 0, 0, 1, 1, false, 1);
    INSERT INTO note_references (organization_id, source_asset_id, target_asset_id, target_type, fallback_label)
      VALUES ('o', 1, 2, 'color', 'Color');
    INSERT INTO user_onboarding_tour (user_id, tour_key, status, note_id) VALUES ('u', 'tour', 'active', 'note-1');
  `);
}, 60_000);

afterAll(async () => {
  await pg.close();
});

it("rolls back every change when a stored reference cannot be mapped", async () => {
  await pg.exec(
    "UPDATE collection_nodes SET path_folder_ids = ARRAY[999] WHERE id = 3",
  );
  await expect(
    pg.transaction(async (tx) => {
      await tx.exec(migration);
    }),
  ).rejects.toThrow("query returned no rows");
  expect(
    (await pg.query("SELECT id FROM assets ORDER BY id")).rows,
  ).toHaveLength(5);
  expect(
    (
      await pg.query<{ data_type: string }>(
        "SELECT data_type FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'id'",
      )
    ).rows[0]?.data_type,
  ).toBe("integer");
  await pg.exec(
    "UPDATE collection_nodes SET path_folder_ids = ARRAY[1,2] WHERE id = 3",
  );
}, 30_000);

it("preserves every relationship, Markdown semantics, storage keys and tenant constraints", async () => {
  const untouched = [
    "`[code](color:2)`",
    "![image](image:3)",
    String.raw`\[escaped](color:2)`,
    "```\n[fenced](note:1)\n```",
    "[regular](https://example.test)",
  ].join("\n");
  await pg.query("UPDATE note_assets SET markdown = $1", [
    `[Color](color:2) [Note](note:1) [Image](image:3) [Link](link:4) [Video](video:5)\n[Deleted](note:999) [Deleted again](note:999)\n${untouched}`,
  ]);
  const constraintsBefore = await pg.query(
    "SELECT conname, confdeltype, confupdtype FROM pg_constraint WHERE contype = 'f' ORDER BY conname",
  );
  const identityTables = (
    await pg.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND is_identity = 'YES'",
    )
  ).rows;
  const countsBefore = await Promise.all(
    identityTables.map(
      async ({ table_name }) =>
        (await pg.query(`SELECT count(*) FROM "${table_name}"`)).rows,
    ),
  );
  await pg.transaction(async (tx) => {
    await tx.exec(migration);
  });
  expect(
    await Promise.all(
      identityTables.map(
        async ({ table_name }) =>
          (await pg.query(`SELECT count(*) FROM "${table_name}"`)).rows,
      ),
    ),
  ).toEqual(countsBefore);
  const uuidDefaults = (
    await pg.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'id' AND data_type = 'uuid' AND column_default = 'gen_random_uuid()'",
    )
  ).rows;
  expect(uuidDefaults).toHaveLength(identityTables.length);
  const rows = (
    await pg.query<{ id: string; type: string }>("SELECT id, type FROM assets")
  ).rows;
  expect(rows).toHaveLength(5);
  expect(rows.every((row) => isUuid(row.id))).toBe(true);
  const ids = Object.fromEntries(rows.map((row) => [row.type, row.id]));
  const note = (
    await pg.query<{ markdown: string; asset_id: string }>(
      "SELECT * FROM note_assets",
    )
  ).rows[0]!;
  expect(note.asset_id).toBe(ids.note);
  for (const [type, id] of Object.entries(ids))
    expect(note.markdown).toContain(`](${type}:${id})`);
  expect(note.markdown).toContain(untouched);
  const deleted = /\[Deleted\]\(note:([^)]*)\)/.exec(note.markdown)?.[1];
  expect(isUuid(deleted)).toBe(true);
  expect(note.markdown).toContain(`[Deleted again](note:${deleted})`);
  expect(
    (
      await pg.query(
        "SELECT 1 FROM note_references r JOIN assets s ON s.id = r.source_asset_id JOIN assets t ON t.id = r.target_asset_id WHERE s.type = 'note' AND t.type = 'color'",
      )
    ).rows,
  ).toHaveLength(1);
  const folders = (
    await pg.query<{ id: string }>("SELECT id FROM folders ORDER BY name DESC")
  ).rows.map((row) => row.id);
  expect(
    (
      await pg.query<{ path_folder_ids: string[] }>(
        "SELECT path_folder_ids FROM collection_nodes WHERE asset_id IS NOT NULL",
      )
    ).rows[0]?.path_folder_ids,
  ).toEqual(folders);
  expect(
    (
      await pg.query(
        "SELECT 1 FROM canvas_arrow_objects a JOIN collection_nodes n ON n.id = a.start_collection_node_id JOIN canvas_text_objects t ON t.canvas_object_id = a.end_canvas_object_id",
      )
    ).rows,
  ).toHaveLength(1);
  expect(
    (await pg.query("SELECT original_object_key FROM uploads")).rows[0],
  ).toEqual({ original_object_key: "o/existing-key/original.png" });
  expect(
    (await pg.query("SELECT note_id FROM user_onboarding_tour")).rows[0],
  ).toEqual({ note_id: `note-${ids.note}` });
  expect(
    (
      await pg.query(
        "SELECT conname, confdeltype, confupdtype FROM pg_constraint WHERE contype = 'f' ORDER BY conname",
      )
    ).rows,
  ).toEqual(constraintsBefore.rows);
  const newAsset = (
    await pg.query<{ id: string }>(
      "INSERT INTO assets (organization_id, type) VALUES ('o', 'note') RETURNING id",
    )
  ).rows[0]!;
  expect(isUuid(newAsset.id)).toBe(true);
  await expect(
    pg.query(
      "INSERT INTO note_references (organization_id, source_asset_id, target_asset_id, target_type, fallback_label) VALUES ('other', $1, $2, 'color', 'Color')",
      [ids.note, ids.color],
    ),
  ).rejects.toThrow();
  expect(
    (
      await pg.query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND is_identity = 'YES'",
      )
    ).rows,
  ).toHaveLength(0);
}, 30_000);

it("supports an empty database through the Drizzle migration runner", async () => {
  const fresh = new PGlite({ extensions: { cube, btree_gist, pg_trgm } });
  const migrationDirectory = mkdtempSync(
    join(tmpdir(), "mnemee-uuid-migration-"),
  );
  try {
    // Historical migrations contain multi-command statements supported by Neon
    // but not PGlite's prepared query API. Exercise this migration through the
    // real runner after installing the historical schema using simple queries.
    await applyHistoricalMigrations(fresh);
    mkdirSync(join(migrationDirectory, migrationName));
    writeFileSync(
      join(migrationDirectory, migrationName, "migration.sql"),
      migration,
    );
    await migrate(drizzle({ client: fresh }), {
      migrationsFolder: migrationDirectory,
    });
    expect(
      (
        await fresh.query(
          "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND is_identity = 'YES'",
        )
      ).rows,
    ).toHaveLength(0);
  } finally {
    await fresh.close();
    rmSync(migrationDirectory, { recursive: true, force: true });
  }
}, 30_000);
