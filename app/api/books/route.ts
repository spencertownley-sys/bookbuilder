import { sql } from "@/lib/db";
import { assertBook, HttpError, json, requireUser, route } from "@/lib/server";
import { buildFromStarter } from "@/lib/starters";
import { Book, DEFAULT_HERO, Hero, newBook } from "@/lib/book";

// GET: the signed-in user's shelf (with each cover page so the shelf can draw thumbnails).
export const GET = route(async () => {
  const { userId, plan } = await requireUser();
  const rows = await sql()<{ id: string; title: string; version: number; updated_at: Date; page_count: number; trim: string; hero: Hero | null; cover: unknown }[]>`
    select id, title, version, updated_at,
           jsonb_array_length(data->'pages') as page_count,
           data->>'trim' as trim, data->'hero' as hero, data->'pages'->0 as cover
    from books where owner_id = ${userId} order by updated_at desc`;
  return json({ books: rows, limit: plan.limits.books });
});

// POST: create a book from a starter (+ hero), blank, or (import) a full book object.
export const POST = route(async (req: Request) => {
  const { userId, plan } = await requireUser();
  const body = (await req.json()) as { starterId?: string; hero?: Partial<Hero>; title?: string; trim?: string };
  const [{ n }] = await sql()<{ n: number }[]>`select count(*)::int as n from books where owner_id = ${userId}`;
  if (n >= plan.limits.books) throw new HttpError(402, `Your ${plan.name} plan holds ${plan.limits.books} books. Upgrade for more, or delete one.`);

  const hero: Hero = { ...DEFAULT_HERO, ...(body.hero ?? {}) };
  hero.name = (hero.name ?? "").slice(0, 40).trim();
  let book: Book;
  if (body.starterId) book = buildFromStarter(body.starterId, hero, body.trim ?? "sq85");
  else {
    book = newBook(body.title?.slice(0, 120) || "My Story", body.trim ?? "sq85");
    book.hero = hero;
    book.pages[0].elements.forEach((e) => e.type === "character" && (e.isHero = true));
  }
  assertBook(book);
  await sql()`insert into books (id, owner_id, title, data) values (${book.id}, ${userId}, ${book.title}, ${sql().json(book as never)})`;
  return json({ id: book.id, version: 1 }, 201);
});
