import { sql } from "@/lib/db";
import { getOwnedBook, json, requireUser, route } from "@/lib/server";
import { saveRecording } from "@/lib/recordings";
import { deleteFiles } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string; pageId: string }> };

// The author records narration for a page (multipart: audio, durationMs, name).
export const POST = route(async (req: Request, { params }: Ctx) => {
  const { userId } = await requireUser();
  const { id, pageId } = await params;
  await getOwnedBook(id, userId);
  const name = new URL(req.url).searchParams.get("name");
  return json({ recording: await saveRecording(req, id, pageId, name) }, 201);
});

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const { userId } = await requireUser();
  const { id, pageId } = await params;
  await getOwnedBook(id, userId);
  const recs = await sql()<{ file_key: string }[]>`select file_key from recordings where book_id = ${id} and page_id = ${pageId}`;
  await deleteFiles(recs.map((r) => r.file_key)); // file first, so a storage error leaves the row for a retry
  await sql()`delete from recordings where book_id = ${id} and page_id = ${pageId}`;
  return json({ ok: true });
});
