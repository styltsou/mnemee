require("dotenv/config");

const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const { Pool } = require("@neondatabase/serverless");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const result = await pool.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'id'
    `);
    if (
      result.rows[0]?.data_type === "integer" &&
      process.env.MNEMEE_UUID_CUTOVER_READY !== "1"
    ) {
      throw new Error(
        "UUID cutover requires maintenance mode, synced client drafts, drained queues, " +
          "and a database backup. Follow docs/server/uuid-id-cutover.md, then set " +
          "MNEMEE_UUID_CUTOVER_READY=1 for this migration run. Automatic deployment " +
          "has stopped before changing the database.",
      );
    }
  } finally {
    await pool.end();
  }

  const result = spawnSync(
    process.execPath,
    ["node_modules/drizzle-kit/bin.cjs", "migrate"],
    { cwd: resolve(__dirname, ".."), stdio: "inherit", env: process.env },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
