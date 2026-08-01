/**
 * Applies supabase/setup-all.sql to your Supabase database.
 *
 * Option A (easiest): paste supabase/setup-all.sql into the SQL Editor and run it.
 * Option B: add DATABASE_URL to .env.local, then run npm run db:migrate
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const setupPath = path.join(__dirname, "..", "supabase", "setup-all.sql");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "Missing DATABASE_URL in .env.local\n\n" +
      "Quick fix: open supabase/setup-all.sql, copy all of it, and run in:\n" +
      "  https://supabase.com/dashboard/project/qbjicdrathvdgphzwogk/sql/new\n\n" +
      "Or add DATABASE_URL from Supabase → Project Settings → Database → Connection string (URI)"
  );
  process.exit(1);
}

const sql = fs.readFileSync(setupPath, "utf8");
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log("Applying setup-all.sql...");
  await client.query(sql);

  const { rows } = await client.query(
    "select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'listing_requests') as ok"
  );

  if (!rows[0]?.ok) {
    throw new Error("listing_requests table was not created.");
  }

  console.log("Database setup complete. Request button should work now.");
} catch (error) {
  console.error("Setup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
