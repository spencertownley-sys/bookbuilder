import "server-only";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { sql } from "./db";
import { getPlan, Plan } from "./plans";
import type { Book } from "./book";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Wraps a route handler: turns thrown HttpErrors into JSON responses with friendly messages. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
  };
}

export async function requireUser(): Promise<{ userId: string; plan: Plan; email?: string }> {
  const { userId } = await auth();
  if (!userId) throw new HttpError(401, "Please sign in first.");
  const user = await (await clerkClient()).users.getUser(userId);
  return {
    userId,
    plan: getPlan(user.publicMetadata?.plan as string | undefined),
    email: user.primaryEmailAddress?.emailAddress,
  };
}

export interface BookRow {
  id: string;
  owner_id: string;
  title: string;
  data: Book;
  version: number;
  keepsake_unlocked: boolean;
  updated_at: Date;
}

export async function getOwnedBook(id: string, userId: string): Promise<BookRow> {
  const [row] = await sql()<BookRow[]>`select * from books where id = ${id}`;
  if (!row || row.owner_id !== userId) throw new HttpError(404, "We couldn't find that book.");
  return row;
}

export async function getActiveLink(token: string, kind?: "read" | "record") {
  const [link] = await sql()<{ token: string; book_id: string; kind: "read" | "record" }[]>`
    select token, book_id, kind from share_links where token = ${token} and revoked_at is null`;
  if (!link || (kind && link.kind !== kind)) throw new HttpError(404, "This link has been turned off or doesn't exist.");
  return link;
}

/** Light sanity check so a malformed client can't store garbage. */
export function assertBook(b: unknown): asserts b is Book {
  const x = b as Book;
  if (!x || typeof x !== "object" || typeof x.id !== "string" || !Array.isArray(x.pages) || x.pages.length === 0)
    throw new HttpError(400, "That book data looks damaged.");
  if (x.pages.length > 200) throw new HttpError(400, "Books can have at most 200 pages.");
  if (JSON.stringify(x).length > 5_000_000) throw new HttpError(413, "This book is too large to save. Remove some uploaded images.");
}
