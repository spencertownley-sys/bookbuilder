import "server-only";
import { sql } from "./db";

// Product events behind the launch success metrics (app/admin). Tracking never breaks the
// request it runs in: failures are logged and swallowed.

export type EventName =
  | "account_confirmed" // props: { signedUpAt }
  | "book_created" // props: { starter }
  | "book_finished" // 12+ pages with text on each, saved at least once
  | "share_opened" // a share link opened by someone other than the author
  | "keepsake_unlocked"
  | "plan_changed" // props: { plan }
  | "order_paid"; // props: { format, quantity, cents }

interface EventInput {
  userId?: string | null;
  bookId?: string | null;
  props?: Record<string, unknown>;
}

export async function track(name: EventName, e: EventInput = {}) {
  try {
    await sql()`insert into events (name, user_id, book_id, props)
                values (${name}, ${e.userId ?? null}, ${e.bookId ?? null}, ${e.props ? sql().json(e.props as never) : null})`;
  } catch (err) {
    console.error("track failed", name, err);
  }
}

/** Records the event only the first time it happens for this book. */
export async function trackOncePerBook(name: EventName, bookId: string, e: Omit<EventInput, "bookId"> = {}) {
  try {
    await sql()`insert into events (name, user_id, book_id, props)
                select ${name}, ${e.userId ?? null}, ${bookId}, ${e.props ? sql().json(e.props as never) : null}
                where not exists (select 1 from events where book_id = ${bookId} and name = ${name})`;
  } catch (err) {
    console.error("track failed", name, err);
  }
}
