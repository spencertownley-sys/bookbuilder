import "server-only";
import { sql } from "./db";
import { deleteFiles, putFile, mediaUrl } from "./storage";
import { HttpError } from "./server";
import type { Book } from "./book";

const MAX_BYTES = 6 * 1024 * 1024; // ~60 s of compressed voice with lots of headroom

/** Save (or replace) the narration for one page. Shared by the author route and the record-invite route. */
export async function saveRecording(req: Request, bookId: string, pageId: string, recordedBy: string | null) {
  const [row] = await sql()<{ data: Book; owner_id: string }[]>`select data, owner_id from books where id = ${bookId}`;
  if (!row || !row.data.pages.some((p) => p.id === pageId)) throw new HttpError(404, "That page doesn't exist anymore.");
  const form = await req.formData();
  const file = form.get("audio");
  const duration = Number(form.get("durationMs") ?? 0);
  if (!(file instanceof File)) throw new HttpError(400, "No recording was received.");
  if (!file.type.startsWith("audio/")) throw new HttpError(400, "That isn't an audio recording.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "Recordings can be up to 60 seconds.");
  if (duration > 62_000) throw new HttpError(413, "Recordings can be up to 60 seconds.");
  // Owned by the book's author (even when a relative records through an invite link), so deleting the
  // account always finds it.
  const saved = await putFile({ folder: "voice", data: await file.arrayBuffer(), mimeType: file.type, ownerId: row.owner_id });
  const name = (recordedBy ?? "").slice(0, 40) || null;
  const [old] = await sql()<{ file_key: string }[]>`select file_key from recordings where book_id = ${bookId} and page_id = ${pageId}`;
  await sql()`
    insert into recordings (book_id, page_id, file_key, mime_type, duration_ms, recorded_by)
    values (${bookId}, ${pageId}, ${saved.key}, ${saved.mimeType}, ${duration || null}, ${name})
    on conflict (book_id, page_id) do update
      set file_key = excluded.file_key, mime_type = excluded.mime_type, duration_ms = excluded.duration_ms,
          recorded_by = excluded.recorded_by, created_at = now()`;
  if (old) await deleteFiles([old.file_key]).catch((e) => console.error("old recording not deleted", e)); // re-recording replaces the old take; account deletion sweeps any leftover
  return { url: mediaUrl(saved.key), by: name, durationMs: duration || null };
}
