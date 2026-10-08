import { sql } from "@/lib/db";
import { getActiveLink, json, route } from "@/lib/server";
import { mediaUrl } from "@/lib/storage";
import type { Book } from "@/lib/book";

// Public: what a family member sees through a share or record link. No sign-in.
export const GET = route(async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const link = await getActiveLink((await params).token);
  const [row] = await sql()<{ data: Book }[]>`select data from books where id = ${link.book_id}`;
  const recs = await sql()<{ page_id: string; file_key: string; recorded_by: string | null }[]>`
    select page_id, file_key, recorded_by from recordings where book_id = ${link.book_id}`;
  const hearts = await sql()<{ page_id: string; n: number }[]>`
    select page_id, count(*)::int as n from page_notes where book_id = ${link.book_id} and kind = 'heart' group by page_id`;
  return json({
    kind: link.kind,
    book: row.data,
    recordings: Object.fromEntries(recs.map((r) => [r.page_id, { url: mediaUrl(r.file_key), by: r.recorded_by }])),
    hearts: Object.fromEntries(hearts.map((h) => [h.page_id, h.n])),
  });
});
