import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/page-auth";
import { HttpError, json, requireUser, route } from "@/lib/server";

// POST { action: "resolve" | "disable-links" } — moderation from /admin. Admins only (ADMIN_USER_IDS / ADMIN_EMAILS).
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId, email } = await requireUser();
  if (!isAdmin(userId, email)) throw new HttpError(404, "Not found");
  const id = Number((await params).id);
  const { action } = (await req.json()) as { action?: string };
  const [report] = await sql()<{ book_id: string | null }[]>`select book_id from reports where id = ${id}`;
  if (!report) throw new HttpError(404, "No such report.");
  if (action !== "resolve" && action !== "disable-links") throw new HttpError(400, "Unknown action.");
  if (action === "disable-links" && report.book_id)
    await sql()`update share_links set revoked_at = now() where book_id = ${report.book_id} and revoked_at is null`;
  // Turning off a book's links settles every open report about that book.
  await sql()`update reports set status = 'resolved' where id = ${id} or (book_id = ${report.book_id} and status = 'open' and ${action === "disable-links"})`;
  return json({ ok: true });
});
