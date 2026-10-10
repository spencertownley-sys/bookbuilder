// Local development database: a real Postgres (PGlite) on port 54329, saved in .data/pg.
// Start it with `npm run db`, then `npm run db:migrate` once.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { mkdirSync } from "node:fs";

mkdirSync(".data", { recursive: true });
const db = await PGlite.create(".data/pg");
const port = Number(process.env.DEV_DB_PORT ?? 54329);
// Several connections (dev server, migrations, e2e checks); PGlite queues their queries one at a time.
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 10 });
await server.start();
console.log(`Dev Postgres ready: postgres://postgres:postgres@127.0.0.1:${port}/postgres`);
const stop = async () => { await server.stop(); await db.close(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
