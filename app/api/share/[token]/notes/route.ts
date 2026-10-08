import { sql } from "@/lib/db";
import { getActiveLink, HttpError, json, route } from "@/lib/server";
import type { Book } from "@/lib/book";

// Public: leave a heart or a short note on a page of a shared book.
export const POST = route(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const link = await getActiveLink((await params).token);
  const { pageId, kind, body, name } = (await req.json()) as { pageId: string; kind: "heart" | "note"; body?: string; name?: string };
  if (kind !== "heart" && kind !== "note") throw new HttpError(400, "Unknown reaction.");
  const text = (body ?? "").trim().slice(0, 280);
  if (kind === "note" && !text) throw new HttpError(400, "Write a short note first.");
  const [row] = await sql()<{ data: Book }[]>`select data from books where id = ${link.book_id}`;
  if (!row.data.pages.some((p) => p.id === pageId)) throw new HttpError(404, "That page doesn't exist anymore.");
  // Simple flood guard: at most 30 reactions per book per minute.
  const [{ n }] = await sql()<{ n: number }[]>`
    select count(*)::int as n from page_notes where book_id = ${link.book_id} and created_at > now() - interval '1 minute'`;
  if (n >= 30) throw new HttpError(429, "Lots of love already! Try again in a minute.");
  await sql()`
    insert into page_notes (book_id, page_id, kind, author_name, body)
    values (${link.book_id}, ${pageId}, ${kind}, ${(name ?? "").trim().slice(0, 40) || null}, ${kind === "note" ? text : null})`;
  return json({ ok: true }, 201);
});
