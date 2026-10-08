import { sql } from "@/lib/db";
import { assertBook, getOwnedBook, HttpError, json, requireUser, route } from "@/lib/server";
import type { Book } from "@/lib/book";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const { userId } = await requireUser();
  const row = await getOwnedBook((await params).id, userId);
  return json({ book: row.data, version: row.version, keepsakeUnlocked: row.keepsake_unlocked });
});

// PUT { book, baseVersion } — saves only if nobody else saved since baseVersion.
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
  const updated = await sql()<{ version: number }[]>`
    update books set data = ${sql().json(book as never)}, title = ${book.title.slice(0, 200)},
           version = version + 1, updated_at = now()
    where id = ${id} and owner_id = ${userId} and version = ${baseVersion}
    returning version`;
  if (!updated.length) {
    return json({ error: "This book was changed on another device.", version: row.version }, 409);
  }
  return json({ version: updated[0].version });
});

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const { userId } = await requireUser();
  const id = (await params).id;
  await getOwnedBook(id, userId);
  await sql()`delete from books where id = ${id} and owner_id = ${userId}`;
  return json({ ok: true });
});
