import "server-only";
import { createHmac } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { sql } from "./db";
import { MEDIA_KEY_RE } from "./media";

// Files (uploaded art, AI art, voice recordings, print PDFs) live in object storage.
// - Supabase Storage when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (bucket: SUPABASE_BUCKET, default "media")
// - otherwise the local folder .data/files (development only)
// Everything is served back through /api/media/<key>, so keys are long and unguessable.

const BUCKET = process.env.SUPABASE_BUCKET ?? "media";
const LOCAL_DIR = path.join(process.cwd(), ".data", "files");

const supabase = () =>
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? { url: process.env.SUPABASE_URL.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY }
    : null;

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "application/pdf": "pdf",
};

export const ALLOWED_TYPES = new Set(Object.keys(EXT));

export function mediaUrl(key: string) {
  return `/api/media/${key}`;
}

export function publicMediaUrl(key: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return base + mediaUrl(key);
}

export async function putFile(opts: { folder: string; data: ArrayBuffer | Buffer; mimeType: string; ownerId?: string | null }) {
  const mime = opts.mimeType.split(";")[0].trim();
  if (!ALLOWED_TYPES.has(mime)) throw new Error(`File type ${mime} isn't supported`);
  const key = `${opts.folder}/${nanoid(24)}.${EXT[mime]}`;
  const buf = Buffer.isBuffer(opts.data) ? opts.data : Buffer.from(new Uint8Array(opts.data));
  const sb = supabase();
  if (sb) {
    const r = await fetch(`${sb.url}/storage/v1/object/${BUCKET}/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sb.key}`, apikey: sb.key, "Content-Type": mime, "x-upsert": "false" },
      body: new Uint8Array(buf),
    });
    if (!r.ok) throw new Error(`Storage upload failed (${r.status}): ${await r.text()}`);
  } else {
    const file = path.join(LOCAL_DIR, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, buf);
  }
  await sql()`insert into files (key, owner_id, mime_type, size_bytes) values (${key}, ${opts.ownerId ?? null}, ${mime}, ${buf.length})`;
  return { key, url: mediaUrl(key), mimeType: mime };
}

const KEY_RE = MEDIA_KEY_RE;

/** Permanently removes files from storage and the files table. Missing files are ignored. */
export async function deleteFiles(keys: string[]) {
  const valid = [...new Set(keys)].filter((k) => KEY_RE.test(k));
  if (!valid.length) return;
  const sb = supabase();
  for (let i = 0; i < valid.length; i += 500) {
    const batch = valid.slice(i, i + 500);
    if (sb) {
      const r = await fetch(`${sb.url}/storage/v1/object/${BUCKET}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sb.key}`, apikey: sb.key, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: batch }),
      });
      if (!r.ok) throw new Error(`Storage delete failed (${r.status}): ${await r.text()}`);
    } else {
      await Promise.all(batch.map((k) => rm(path.join(LOCAL_DIR, k), { force: true })));
    }
    await sql()`delete from files where key in ${sql()(batch)}`;
  }
}

export async function getFile(key: string): Promise<{ data: Buffer; mimeType: string } | null> {
  if (!KEY_RE.test(key)) return null;
  const [row] = await sql()<{ mime_type: string }[]>`select mime_type from files where key = ${key}`;
  if (!row) return null;
  const sb = supabase();
  if (sb) {
    const r = await fetch(`${sb.url}/storage/v1/object/${BUCKET}/${key}`, { headers: { Authorization: `Bearer ${sb.key}`, apikey: sb.key } });
    if (!r.ok) return null;
    return { data: Buffer.from(await r.arrayBuffer()), mimeType: row.mime_type };
  }
  try {
    return { data: await readFile(path.join(LOCAL_DIR, key)), mimeType: row.mime_type };
  } catch {
    return null;
  }
}

/** Download a remote image (e.g. a temporary AI-provider URL) and keep our own copy. */
export async function copyRemote(url: string, folder: string, ownerId: string) {
  if (url.startsWith("data:")) {
    const [, mime, b64] = url.match(/^data:([^;]+);base64,(.*)$/) ?? [];
    if (!mime) throw new Error("Bad image data");
    return putFile({ folder, data: Buffer.from(b64, "base64"), mimeType: mime, ownerId });
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error("Couldn't download the generated image");
  return putFile({ folder, data: await r.arrayBuffer(), mimeType: r.headers.get("content-type") ?? "image/png", ownerId });
}

// ---------- Large files (print PDFs) ----------
// The browser uploads straight to storage so big PDFs never pass through a serverless
// function (Vercel caps request bodies at about 4.5 MB).
const signKey = (key: string) => createHmac("sha256", process.env.CLERK_SECRET_KEY ?? "dev").update(key).digest("hex").slice(0, 32);

export async function createUploadTarget(folder: string, mimeType: string, ownerId: string) {
  const mime = mimeType.split(";")[0].trim();
  if (!ALLOWED_TYPES.has(mime)) throw new Error(`File type ${mime} isn't supported`);
  const key = `${folder}/${nanoid(24)}.${EXT[mime]}`;
  await sql()`insert into files (key, owner_id, mime_type) values (${key}, ${ownerId}, ${mime})`;
  const sb = supabase();
  if (sb) {
    const r = await fetch(`${sb.url}/storage/v1/object/upload/sign/${BUCKET}/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sb.key}`, apikey: sb.key, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!r.ok) throw new Error(`Couldn't prepare the upload (${r.status})`);
    const { url } = (await r.json()) as { url: string };
    return { key, uploadUrl: `${sb.url}/storage/v1${url}`, method: "PUT" as const };
  }
  return { key, uploadUrl: `/api/files/local?key=${encodeURIComponent(key)}&sig=${signKey(key)}`, method: "PUT" as const };
}

export async function writeLocalSigned(key: string, sig: string, data: ArrayBuffer) {
  if (supabase()) throw new Error("Local uploads are disabled when Supabase Storage is configured");
  if (sig !== signKey(key)) throw new Error("Upload link is not valid");
  const file = path.join(LOCAL_DIR, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(new Uint8Array(data)));
  await sql()`update files set size_bytes = ${data.byteLength} where key = ${key}`;
}

export async function fileOwnedBy(key: string, ownerId: string) {
  const [row] = await sql()<{ owner_id: string }[]>`select owner_id from files where key = ${key}`;
  return row?.owner_id === ownerId;
}
