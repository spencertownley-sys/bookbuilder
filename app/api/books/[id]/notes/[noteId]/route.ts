import { sql } from "@/lib/db";
import { getOwnedBook, HttpError, json, requireUser, route } from "@/lib/server";

type Ctx = { params: Promise<{ id: string; noteId: string }> };

// DELETE { report?: true, reason? } — the author removes a family note, optionally reporting it to us.
export const DELETE = route(async (req: Request, { params }: Ctx) => {
  const { userId } = await requireUser();
  const { id, noteId } = await params;
  await getOwnedBook(id, userId);
  const { report, reason } = (await req.json().catch(() => ({}))) as { report?: boolean; reason?: string };
  const [note] = await sql()<{ id: number; body: string | null; author_name: string | null }[]>`
    delete from page_notes where id = ${Number(noteId)} and book_id = ${id} returning id, body, author_name`;
  if (!note) throw new HttpError(404, "That note was already removed.");
  if (report) {
    const details = `${note.author_name ?? "Someone"}: ${note.body ?? "(heart)"}`.slice(0, 1000);
    await sql()`insert into reports (book_id, note_id, reporter, reason, details)
                values (${id}, ${note.id}, 'author', ${(reason || "Inappropriate note").slice(0, 80)}, ${details})`;
  }
  return json({ ok: true });
});
