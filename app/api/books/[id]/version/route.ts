import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { json } from "@/lib/server";

// GET → { version }. Polled by open editors to notice a save from another device. Uses only the
// session token (no Clerk API call), so it's cheap enough to call every few seconds.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return json({ error: "Please sign in first." }, 401);
  const [row] = await sql()<{ version: number }[]>`select version from books where id = ${(await params).id} and owner_id = ${userId}`;
  if (!row) return json({ error: "We couldn't find that book." }, 404);
  return json({ version: row.version });
}
