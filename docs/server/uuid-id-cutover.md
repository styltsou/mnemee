# UUID identifier cutover

Application entity primary keys and foreign keys now use PostgreSQL UUIDs with
`gen_random_uuid()` defaults. Auth and provider identifiers that already use
opaque strings retain their existing format. Public card and canvas IDs keep
their prefixes: `color-<uuid>`, `note-<uuid>`, `folder-<uuid>`, `text-<uuid>`, etc.
Collections and uploads expose bare UUIDs. The synthetic Inbox collection uses
the string `inbox`; it has no database row.

UUIDs make identifiers unpredictable. Workspace membership checks and
organization-scoped queries remain the access-control boundary.

## Migration behavior

`20261115141408_uuid_entity_ids` generates a random UUID once per existing row,
then uses that mapping for all related columns, including folder ancestry
arrays and canvas arrow bindings. It preserves row contents, timestamps,
storage IDs, and object keys. Existing S3 objects do not need to move.

The migration rewrites Markdown mention destinations and onboarding note IDs.
It preserves fenced code, inline code, escaped links, and image syntax. Deleted
or inaccessible mention targets receive UUIDs so their chips remain unavailable
references. Foreign keys and checks are restored and validated before commit.
The mapping tables are temporary and disappear on commit or rollback.

This is a coordinated maintenance migration. Numeric clients and numeric queue
messages are incompatible with the new schema. Existing numeric asset bookmarks
will no longer resolve. No public numeric-ID lookup is added.

## Cutover procedure

The deployment target is the existing `deploy-dev` job in
`.github/workflows/ci.yml`: SST stage `dev` and its linked `DatabaseUrl` secret.
Despite the stage name, this serves `app.mnemee.space` and `api.mnemee.space`.
On a push to `main`, CI runs the migration before deploying the matching app
and workers. Its migration step sets `MNEMEE_UUID_CUTOVER_READY=1` for this
selected target. Complete the preparation below before the first rollout;
the flag does not itself pause traffic, sync drafts, or drain queues.

1. Rehearse on a recent database clone and take a restorable backup of the
   intended database. Measure the migration duration against representative data.
2. Ask active clients to finish syncing edits, including note/image-note drafts
   and agent drafts stored in browser storage. Browser-only drafts cannot be
   remapped by a database migration. Keep recovery copies if any edits remain
   unsynced; do not clear local storage as part of this cutover.
3. Put the application in maintenance mode and stop producers of background
   work. Drain URL-resolution, resource-media, gradient-naming, and remote-video
   queues and their dead-letter queues with the old workers. Let in-flight
   uploads and callbacks finish. Stop the workers before migrating.
4. Push the prepared changes to `main` and let the existing CI migration step
   migrate the deployed `dev` database. It already supplies the cutover flag
   and reads the database URL through SST; no new database secret is needed.
   For a manual recovery run against the same deployment, set
   `MNEMEE_UUID_CUTOVER_READY=1` and use
   `bunx sst shell --stage dev -- bun run scripts/migrate-stage.ts`.
   Direct local `db:migrate` invocations retain the flag requirement while
   the schema uses numeric IDs. Fresh databases and databases already using
   UUIDs do not require it. Do not use `db:push` or apply statements individually.
   Drizzle executes the migration in a transaction; the migration fails after
   ten seconds if it cannot acquire its table locks.
5. Deploy matching versions of the API, AI-stream handler, frontend, and all
   workers together. Force open clients to reload so their in-memory queries,
   pagination cursors, selections, and optimistic items refresh from UUID data.
   Recent-asset storage filters out old numeric IDs when read.
6. Verify asset creation/editing, mentions/backlinks, nested folder moves,
   arrow bindings, uploads, color search, pagination, and cross-workspace access.
   Resume writes and workers after these checks.

If migration fails, its transaction restores the original schema and data.
After a successful commit, rolling back requires restoring the pre-cutover
database backup and old app/worker versions together. There is no lossy reverse
conversion from UUIDs to the old identity sequence.

## Automated rehearsal

Run `bun run test` in `apps/server`. `src/db/uuid-migration.test.ts` uses PGlite
with the real historical migrations and PostgreSQL extensions. It exercises
populated data, referential integrity, generated UUIDs, Markdown preservation,
and transaction rollback without a network database.
