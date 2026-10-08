import { sql } from "@/lib/db";
import { assertBook, json, requireUser, route } from "@/lib/server";
import type { Book } from "@/lib/book";

// One-time import of books the prototype saved in this browser. Existing ids are skipped.
export const POST = route(async (req: Request) => {
  const { userId } = await requireUser();
  const { books } = (await req.json()) as { books: Book[] };
  let imported = 0;
  for (const b of (books ?? []).slice(0, 50)) {
    try {
      assertBook(b);
    } catch {
      continue;
    }
    const r = await sql()`
      insert into books (id, owner_id, title, data)
      values (${b.id}, ${userId}, ${(b.title || "My Story").slice(0, 200)}, ${sql().json(b as never)})
      on conflict (id) do nothing`;
    imported += r.count;
  }
  return json({ imported });
});
