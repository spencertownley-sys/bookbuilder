import { sql } from "@/lib/db";
import { getOwnedBook, json, requireUser, route } from "@/lib/server";
import { mediaUrl } from "@/lib/storage";

// Everything family has added to a book: hearts, notes and voice recordings.
export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { userId } = await requireUser();
  const id = (await params).id;
  await getOwnedBook(id, userId);
  const notes = await sql()<{ id: number; page_id: string; kind: string; author_name: string | null; body: string | null; created_at: Date }[]>`
    select id, page_id, kind, author_name, body, created_at from page_notes where book_id = ${id} order by created_at desc limit 500`;
  const recs = await sql()<{ page_id: string; file_key: string; recorded_by: string | null; duration_ms: number | null }[]>`
    select page_id, file_key, recorded_by, duration_ms from recordings where book_id = ${id}`;
  return json({
    notes,
    recordings: Object.fromEntries(recs.map((r) => [r.page_id, { url: mediaUrl(r.file_key), by: r.recorded_by, durationMs: r.duration_ms }])),
  });
});
