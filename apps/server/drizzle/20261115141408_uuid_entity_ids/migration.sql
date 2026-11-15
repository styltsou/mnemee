-- Coordinated maintenance cutover: stop API writes and drain ID-bearing queues first.
-- Run through db:migrate, which wraps the entire migration in a transaction.
-- Temporary maps are private to this connection and disappear on commit/rollback.
SET LOCAL lock_timeout = '10s';
--> statement-breakpoint
LOCK TABLE public."assets", public."canvas_arrow_objects", public."canvas_objects", public."canvas_text_objects", public."collection_nodes", public."collections", public."color_assets", public."external_resource_media", public."external_resources", public."folders", public."image_assets", public."image_colors", public."link_assets", public."media_cleanup_jobs", public."note_assets", public."note_references", public."resource_resolution_attempts", public."uploads", public."video_assets", public."video_uploads" IN ACCESS EXCLUSIVE MODE;
--> statement-breakpoint
CREATE TEMP TABLE _uuid_id_map (
  entity text NOT NULL,
  old_id integer NOT NULL,
  new_id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (entity, old_id),
  UNIQUE (new_id)
) ON COMMIT DROP;
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'assets', id FROM public."assets";
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'canvas_objects', id FROM public."canvas_objects";
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'collection_nodes', id FROM public."collection_nodes";
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'collections', id FROM public."collections";
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'external_resource_media', id FROM public."external_resource_media";
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'external_resources', id FROM public."external_resources";
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'folders', id FROM public."folders";
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'image_colors', id FROM public."image_colors";
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'media_cleanup_jobs', id FROM public."media_cleanup_jobs";
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'note_references', id FROM public."note_references";
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'resource_resolution_attempts', id FROM public."resource_resolution_attempts";
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'uploads', id FROM public."uploads";
--> statement-breakpoint
INSERT INTO _uuid_id_map (entity, old_id) SELECT 'video_uploads', id FROM public."video_uploads";
--> statement-breakpoint
CREATE TEMP TABLE _uuid_constraints ON COMMIT DROP AS
SELECT ns.nspname AS schema_name, rel.relname AS table_name, c.conname AS name,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class rel ON rel.oid = c.conrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE c.contype IN ('f', 'c') AND (
  c.conrelid = ANY(ARRAY['public.assets'::regclass, 'public.canvas_arrow_objects'::regclass, 'public.canvas_objects'::regclass, 'public.canvas_text_objects'::regclass, 'public.collection_nodes'::regclass, 'public.collections'::regclass, 'public.color_assets'::regclass, 'public.external_resource_media'::regclass, 'public.external_resources'::regclass, 'public.folders'::regclass, 'public.image_assets'::regclass, 'public.image_colors'::regclass, 'public.link_assets'::regclass, 'public.media_cleanup_jobs'::regclass, 'public.note_assets'::regclass, 'public.note_references'::regclass, 'public.resource_resolution_attempts'::regclass, 'public.uploads'::regclass, 'public.video_assets'::regclass, 'public.video_uploads'::regclass]) OR
  c.confrelid = ANY(ARRAY['public.assets'::regclass, 'public.canvas_arrow_objects'::regclass, 'public.canvas_objects'::regclass, 'public.canvas_text_objects'::regclass, 'public.collection_nodes'::regclass, 'public.collections'::regclass, 'public.color_assets'::regclass, 'public.external_resource_media'::regclass, 'public.external_resources'::regclass, 'public.folders'::regclass, 'public.image_assets'::regclass, 'public.image_colors'::regclass, 'public.link_assets'::regclass, 'public.media_cleanup_jobs'::regclass, 'public.note_assets'::regclass, 'public.note_references'::regclass, 'public.resource_resolution_attempts'::regclass, 'public.uploads'::regclass, 'public.video_assets'::regclass, 'public.video_uploads'::regclass])
);
--> statement-breakpoint
DO $$ DECLARE fk record; BEGIN
  FOR fk IN SELECT * FROM _uuid_constraints LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', fk.schema_name, fk.table_name, fk.name);
  END LOOP;
END $$;
--> statement-breakpoint
CREATE FUNCTION pg_temp.uuid_lookup(entity_name text, legacy_id integer)
RETURNS uuid LANGUAGE plpgsql STRICT AS $$
DECLARE result uuid;
BEGIN
  SELECT new_id INTO STRICT result FROM _uuid_id_map WHERE entity = entity_name AND old_id = legacy_id;
  RETURN result;
END $$;
--> statement-breakpoint
CREATE FUNCTION pg_temp.uuid_folder_path(legacy_ids integer[])
RETURNS uuid[] LANGUAGE sql STRICT AS $$
  SELECT coalesce(array_agg(pg_temp.uuid_lookup('folders', id) ORDER BY position), '{}'::uuid[])
  FROM unnest(legacy_ids) WITH ORDINALITY AS path(id, position);
$$;
--> statement-breakpoint
-- Mention destinations are embedded in Markdown. Preserve code fences, inline
-- code, escaped links and image syntax, matching the application's parser.
-- Deleted targets get opaque IDs too, so their unavailable chips stay chips.
CREATE TEMP TABLE _uuid_mention_map (
  organization_id text NOT NULL,
  asset_type text NOT NULL,
  legacy_id text NOT NULL,
  new_id uuid NOT NULL,
  PRIMARY KEY (organization_id, asset_type, legacy_id)
) ON COMMIT DROP;
--> statement-breakpoint

CREATE FUNCTION pg_temp.markdown_escaped(value text, at_index integer)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE backslashes integer := 0; i integer := at_index - 1;
BEGIN
  WHILE i > 0 AND substr(value, i, 1) = chr(92) LOOP
    backslashes := backslashes + 1; i := i - 1;
  END LOOP;
  RETURN backslashes % 2 = 1;
END $$;
--> statement-breakpoint

CREATE FUNCTION pg_temp.markdown_find(value text, target_character text, start_index integer)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE i integer := start_index;
BEGIN
  WHILE i <= length(value) LOOP
    IF substr(value, i, 1) = target_character AND NOT pg_temp.markdown_escaped(value, i) THEN RETURN i; END IF;
    i := i + 1;
  END LOOP;
  RETURN 0;
END $$;
--> statement-breakpoint

CREATE FUNCTION pg_temp.rewrite_uuid_mentions(markdown text, org_id text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  line text; lines text[] := '{}'; rewritten text;
  fence text := NULL; fence_length integer := 0; fence_match text[];
  code_length integer; run_length integer; i integer; label_end integer; destination_end integer;
  destination text[]; replacement uuid;
BEGIN
  FOREACH line IN ARRAY string_to_array(markdown, E'\n') LOOP
    fence_match := regexp_match(line, '^ {0,3}(`{3,}|~{3,})');
    IF fence_match IS NOT NULL THEN
      IF fence IS NULL THEN
        fence := substr(fence_match[1], 1, 1); fence_length := length(fence_match[1]);
      ELSIF substr(fence_match[1], 1, 1) = fence AND length(fence_match[1]) >= fence_length THEN
        fence := NULL;
      END IF;
      lines := array_append(lines, line); CONTINUE;
    END IF;
    IF fence IS NOT NULL THEN lines := array_append(lines, line); CONTINUE; END IF;

    rewritten := ''; i := 1; code_length := 0;
    WHILE i <= length(line) LOOP
      IF substr(line, i, 1) = '`' AND NOT pg_temp.markdown_escaped(line, i) THEN
        run_length := 1;
        WHILE substr(line, i + run_length, 1) = '`' LOOP run_length := run_length + 1; END LOOP;
        IF code_length = 0 THEN code_length := run_length;
        ELSIF code_length = run_length THEN code_length := 0; END IF;
        rewritten := rewritten || substr(line, i, run_length); i := i + run_length; CONTINUE;
      END IF;
      IF code_length > 0 OR substr(line, i, 1) <> '[' OR substr(line, i - 1, 1) = '!'
        OR pg_temp.markdown_escaped(line, i) THEN
        rewritten := rewritten || substr(line, i, 1); i := i + 1; CONTINUE;
      END IF;
      label_end := pg_temp.markdown_find(line, ']', i + 1);
      IF label_end = 0 OR substr(line, label_end + 1, 1) <> '(' THEN
        rewritten := rewritten || substr(line, i, 1); i := i + 1; CONTINUE;
      END IF;
      destination_end := pg_temp.markdown_find(line, ')', label_end + 2);
      IF destination_end = 0 THEN rewritten := rewritten || substr(line, i, 1); i := i + 1; CONTINUE; END IF;
      destination := regexp_match(substr(line, label_end + 2, destination_end - label_end - 2), '^(note|color|link|image|video):([0-9]+)$');
      IF destination IS NULL THEN
        rewritten := rewritten || substr(line, i, destination_end - i + 1); i := destination_end + 1; CONTINUE;
      END IF;
      SELECT new_id INTO replacement FROM _uuid_mention_map
        WHERE organization_id = org_id AND asset_type = destination[1] AND legacy_id = destination[2];
      IF replacement IS NULL THEN
        SELECT m.new_id INTO replacement FROM public.assets a JOIN _uuid_id_map m
          ON m.entity = 'assets' AND m.old_id = a.id
          WHERE a.organization_id = org_id AND a.type::text = destination[1] AND a.id::text = destination[2];
        replacement := coalesce(replacement, gen_random_uuid());
        INSERT INTO _uuid_mention_map VALUES (org_id, destination[1], destination[2], replacement);
      END IF;
      rewritten := rewritten || substr(line, i, label_end - i + 2) || destination[1] || ':' || replacement::text || ')';
      i := destination_end + 1;
    END LOOP;
    lines := array_append(lines, rewritten);
  END LOOP;
  RETURN array_to_string(lines, E'\n');
END $$;

--> statement-breakpoint
UPDATE public.note_assets n SET markdown = pg_temp.rewrite_uuid_mentions(n.markdown, a.organization_id)
FROM public.assets a WHERE a.id = n.asset_id;
--> statement-breakpoint
UPDATE public.user_onboarding_tour t SET note_id = 'note-' || m.new_id::text
FROM _uuid_id_map m WHERE m.entity = 'assets' AND t.note_id = 'note-' || m.old_id::text;
--> statement-breakpoint
ALTER TABLE public."assets" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."assets" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('assets', "id");
--> statement-breakpoint
ALTER TABLE public."assets" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."canvas_arrow_objects" ALTER COLUMN "canvas_object_id" TYPE uuid USING pg_temp.uuid_lookup('canvas_objects', "canvas_object_id");
--> statement-breakpoint
ALTER TABLE public."canvas_arrow_objects" ALTER COLUMN "start_collection_node_id" TYPE uuid USING pg_temp.uuid_lookup('collection_nodes', "start_collection_node_id");
--> statement-breakpoint
ALTER TABLE public."canvas_arrow_objects" ALTER COLUMN "start_canvas_object_id" TYPE uuid USING pg_temp.uuid_lookup('canvas_objects', "start_canvas_object_id");
--> statement-breakpoint
ALTER TABLE public."canvas_arrow_objects" ALTER COLUMN "end_collection_node_id" TYPE uuid USING pg_temp.uuid_lookup('collection_nodes', "end_collection_node_id");
--> statement-breakpoint
ALTER TABLE public."canvas_arrow_objects" ALTER COLUMN "end_canvas_object_id" TYPE uuid USING pg_temp.uuid_lookup('canvas_objects', "end_canvas_object_id");
--> statement-breakpoint
ALTER TABLE public."canvas_objects" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."canvas_objects" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('canvas_objects', "id");
--> statement-breakpoint
ALTER TABLE public."canvas_objects" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."canvas_objects" ALTER COLUMN "collection_id" TYPE uuid USING pg_temp.uuid_lookup('collections', "collection_id");
--> statement-breakpoint
ALTER TABLE public."canvas_objects" ALTER COLUMN "parent_folder_id" TYPE uuid USING pg_temp.uuid_lookup('folders', "parent_folder_id");
--> statement-breakpoint
ALTER TABLE public."canvas_text_objects" ALTER COLUMN "canvas_object_id" TYPE uuid USING pg_temp.uuid_lookup('canvas_objects', "canvas_object_id");
--> statement-breakpoint
ALTER TABLE public."collection_nodes" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."collection_nodes" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('collection_nodes', "id");
--> statement-breakpoint
ALTER TABLE public."collection_nodes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."collection_nodes" ALTER COLUMN "collection_id" TYPE uuid USING pg_temp.uuid_lookup('collections', "collection_id");
--> statement-breakpoint
ALTER TABLE public."collection_nodes" ALTER COLUMN "parent_folder_id" TYPE uuid USING pg_temp.uuid_lookup('folders', "parent_folder_id");
--> statement-breakpoint
ALTER TABLE public."collection_nodes" ALTER COLUMN "asset_id" TYPE uuid USING pg_temp.uuid_lookup('assets', "asset_id");
--> statement-breakpoint
ALTER TABLE public."collection_nodes" ALTER COLUMN "folder_id" TYPE uuid USING pg_temp.uuid_lookup('folders', "folder_id");
--> statement-breakpoint
ALTER TABLE public."collection_nodes" ALTER COLUMN "path_folder_ids" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE public."collection_nodes" ALTER COLUMN "path_folder_ids" TYPE uuid[] USING pg_temp.uuid_folder_path("path_folder_ids");
--> statement-breakpoint
ALTER TABLE public."collection_nodes" ALTER COLUMN "path_folder_ids" SET DEFAULT '{}'::uuid[];
--> statement-breakpoint
ALTER TABLE public."collections" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."collections" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('collections', "id");
--> statement-breakpoint
ALTER TABLE public."collections" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."color_assets" ALTER COLUMN "asset_id" TYPE uuid USING pg_temp.uuid_lookup('assets', "asset_id");
--> statement-breakpoint
ALTER TABLE public."external_resource_media" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."external_resource_media" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('external_resource_media', "id");
--> statement-breakpoint
ALTER TABLE public."external_resource_media" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."external_resource_media" ALTER COLUMN "resource_id" TYPE uuid USING pg_temp.uuid_lookup('external_resources', "resource_id");
--> statement-breakpoint
ALTER TABLE public."external_resources" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."external_resources" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('external_resources', "id");
--> statement-breakpoint
ALTER TABLE public."external_resources" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."folders" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."folders" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('folders', "id");
--> statement-breakpoint
ALTER TABLE public."folders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."image_assets" ALTER COLUMN "asset_id" TYPE uuid USING pg_temp.uuid_lookup('assets', "asset_id");
--> statement-breakpoint
ALTER TABLE public."image_colors" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."image_colors" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('image_colors', "id");
--> statement-breakpoint
ALTER TABLE public."image_colors" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."image_colors" ALTER COLUMN "asset_id" TYPE uuid USING pg_temp.uuid_lookup('assets', "asset_id");
--> statement-breakpoint
ALTER TABLE public."link_assets" ALTER COLUMN "asset_id" TYPE uuid USING pg_temp.uuid_lookup('assets', "asset_id");
--> statement-breakpoint
ALTER TABLE public."link_assets" ALTER COLUMN "resource_id" TYPE uuid USING pg_temp.uuid_lookup('external_resources', "resource_id");
--> statement-breakpoint
ALTER TABLE public."media_cleanup_jobs" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."media_cleanup_jobs" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('media_cleanup_jobs', "id");
--> statement-breakpoint
ALTER TABLE public."media_cleanup_jobs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."media_cleanup_jobs" ALTER COLUMN "asset_id" TYPE uuid USING pg_temp.uuid_lookup('assets', "asset_id");
--> statement-breakpoint
ALTER TABLE public."note_assets" ALTER COLUMN "asset_id" TYPE uuid USING pg_temp.uuid_lookup('assets', "asset_id");
--> statement-breakpoint
ALTER TABLE public."note_references" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."note_references" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('note_references', "id");
--> statement-breakpoint
ALTER TABLE public."note_references" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."note_references" ALTER COLUMN "source_asset_id" TYPE uuid USING pg_temp.uuid_lookup('assets', "source_asset_id");
--> statement-breakpoint
ALTER TABLE public."note_references" ALTER COLUMN "target_asset_id" TYPE uuid USING pg_temp.uuid_lookup('assets', "target_asset_id");
--> statement-breakpoint
ALTER TABLE public."resource_resolution_attempts" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."resource_resolution_attempts" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('resource_resolution_attempts', "id");
--> statement-breakpoint
ALTER TABLE public."resource_resolution_attempts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."resource_resolution_attempts" ALTER COLUMN "resource_id" TYPE uuid USING pg_temp.uuid_lookup('external_resources', "resource_id");
--> statement-breakpoint
ALTER TABLE public."uploads" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."uploads" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('uploads', "id");
--> statement-breakpoint
ALTER TABLE public."uploads" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."uploads" ALTER COLUMN "collection_id" TYPE uuid USING pg_temp.uuid_lookup('collections', "collection_id");
--> statement-breakpoint
ALTER TABLE public."uploads" ALTER COLUMN "asset_id" TYPE uuid USING pg_temp.uuid_lookup('assets', "asset_id");
--> statement-breakpoint
ALTER TABLE public."video_assets" ALTER COLUMN "asset_id" TYPE uuid USING pg_temp.uuid_lookup('assets', "asset_id");
--> statement-breakpoint
ALTER TABLE public."video_uploads" ALTER COLUMN "id" DROP IDENTITY;
--> statement-breakpoint
ALTER TABLE public."video_uploads" ALTER COLUMN "id" TYPE uuid USING pg_temp.uuid_lookup('video_uploads', "id");
--> statement-breakpoint
ALTER TABLE public."video_uploads" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE public."video_uploads" ALTER COLUMN "collection_id" TYPE uuid USING pg_temp.uuid_lookup('collections', "collection_id");
--> statement-breakpoint
ALTER TABLE public."video_uploads" ALTER COLUMN "asset_id" TYPE uuid USING pg_temp.uuid_lookup('assets', "asset_id");
--> statement-breakpoint
DO $$ DECLARE fk record; BEGIN
  FOR fk IN SELECT * FROM _uuid_constraints LOOP
    EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s', fk.schema_name, fk.table_name, fk.name, fk.definition);
  END LOOP;
END $$;
