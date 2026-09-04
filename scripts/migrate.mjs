// Runs pending migrations at container boot (CLAUDE.md §18) using drizzle's
// programmatic migrator, so no dev-only CLI is needed in production.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.log("migrate: no DATABASE_URL — skipping (localStorage-only mode)");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("migrate: up to date");
} finally {
  await pool.end();
}
