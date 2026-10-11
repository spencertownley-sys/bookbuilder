import { sql } from "@/lib/db";
import { assertBook, getOwnedBook, HttpError, json, requireUser, route } from "@/lib/server";
import { purgeBook } from "@/lib/purge";
import { isFinished, type Book } from "@/lib/book";
import { trackOncePerBook } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const { userId } = await requireUser();
  const row = await getOwnedBook((await params).id, userId);
  return json({ book: row.data, version: row.version, keepsakeUnlocked: row.keepsake_unlocked });
});

// PUT { book, baseVersion } — the later save wins (PRD). If another device saved since baseVersion,
// this save still lands and that device finds out from /version and is told to reload.
export const PUT = route(async (req: Request, { params }: Ctx) => {
  const { userId, plan } = await requireUser();
  const id = (await params).id;
  const { book, baseVersion } = (await req.json()) as { book: Book; baseVersion: number };
  assertBook(book);
  if (book.id !== id) throw new HttpError(400, "Book id mismatch.");
  const row = await getOwnedBook(id, userId);
  const maxPages = row.keepsake_unlocked ? Math.max(24, plan.limits.pagesPerBook) : plan.limits.pagesPerBook;
  if (book.pages.length > Math.max(maxPages, row.data.pages.length))
    throw new HttpError(402, `Your plan allows ${maxPages} pages per book.`);
  const [updated] = await sql()<{ version: number }[]>`
    update books set data = ${sql().json(book as never)}, title = ${book.title.slice(0, 200)},
           version = version + 1, updated_at = now()
    where id = ${id} and owner_id = ${userId}
    returning version`;
  if (isFinished(book)) await trackOncePerBook("book_finished", id, { userId });
  return json({ version: updated.version, overwrote: row.version !== Number(baseVersion) });
});

// DELETE: removes the book with its photos, uploads, recordings, notes and share links.
export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const { userId } = await requireUser();
  const id = (await params).id;
  await getOwnedBook(id, userId);
  await purgeBook(id, userId);
  return json({ ok: true });
});
