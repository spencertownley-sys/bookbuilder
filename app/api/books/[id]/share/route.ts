import { nanoid } from "nanoid";
import { sql } from "@/lib/db";
import { getOwnedBook, HttpError, json, requireUser, route } from "@/lib/server";

type Ctx = { params: Promise<{ id: string }> };
type Kind = "read" | "record";

const activeLinks = (bookId: string) =>
  sql()<{ token: string; kind: Kind; created_at: Date }[]>`
    select token, kind, created_at from share_links where book_id = ${bookId} and revoked_at is null`;

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const { userId } = await requireUser();
  const id = (await params).id;
  await getOwnedBook(id, userId);
  return json({ links: await activeLinks(id) });
});

// POST { kind } — returns the active link of that kind, creating one if needed.
export const POST = route(async (req: Request, { params }: Ctx) => {
  const { userId } = await requireUser();
  const id = (await params).id;
  const { kind } = (await req.json()) as { kind: Kind };
  if (kind !== "read" && kind !== "record") throw new HttpError(400, "Unknown link type.");
  await getOwnedBook(id, userId);
  const existing = (await activeLinks(id)).find((l) => l.kind === kind);
  if (existing) return json({ link: existing });
  const token = nanoid(22);
  await sql()`insert into share_links (token, book_id, kind) values (${token}, ${id}, ${kind})`;
  return json({ link: { token, kind } }, 201);
});

// DELETE { kind } — turns the link off immediately.
export const DELETE = route(async (req: Request, { params }: Ctx) => {
  const { userId } = await requireUser();
  const id = (await params).id;
  const { kind } = (await req.json()) as { kind: Kind };
  await getOwnedBook(id, userId);
  await sql()`update share_links set revoked_at = now() where book_id = ${id} and kind = ${kind} and revoked_at is null`;
  return json({ ok: true });
});
