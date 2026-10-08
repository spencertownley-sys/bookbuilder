// Applies db/schema.sql to DATABASE_URL (reads .env.local when present).
import postgres from "postgres";
import { readFileSync, existsSync } from "node:fs";

if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
await sql.unsafe(readFileSync("db/schema.sql", "utf8"));
const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`;
console.log("Schema applied. Tables:", tables.map((t) => t.table_name).join(", "));
await sql.end();
