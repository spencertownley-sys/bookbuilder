import "server-only";
import postgres from "postgres";

// One shared connection pool. DATABASE_URL works with Supabase (use the "Transaction pooler"
// connection string), Neon, Vercel Postgres, or the local dev server from `npm run db`.
const g = globalThis as unknown as { __sql?: postgres.Sql };

export function sql(): postgres.Sql {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set — run `npm run db` locally or add your Postgres URL.");
  g.__sql ??= postgres(process.env.DATABASE_URL, {
    max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
    prepare: false, // required for Supabase's transaction pooler and PGlite
    idle_timeout: 20,
    onnotice: () => {},
  });
  return g.__sql;
}

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);
