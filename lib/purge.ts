import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { sql } from "./db";
import { deleteFiles } from "./storage";
import { mediaKeysIn } from "./media";
import { stripe } from "./stripe";
import type { Book } from "./book";

// Deleting means deleting: the PRD promises children's photos, names and recordings go away with
// the book or the account. Order records stay (book_id becomes null) for tax and accounting, and
// their print files are removed once the order ships (lib/fulfill.ts).

const ACTIVE_ORDER = ["paid", "submitted", "in_production"];

/** Deletes one book with its share links, notes, recordings, and the files only it uses. */
export async function purgeBook(bookId: string, ownerId: string) {
  const [row] = await sql()<{ data: Book }[]>`select data from books where id = ${bookId} and owner_id = ${ownerId}`;
  if (!row) return false;
  const recs = await sql()<{ file_key: string }[]>`select file_key from recordings where book_id = ${bookId}`;
  const referenced = mediaKeysIn(row.data);
  // Only files this owner uploaded (a book could point at anyone's media URL), and not ones another of
  // their books still uses.
  const deletable = referenced.length
    ? (
        await sql()<{ key: string }[]>`
          select f.key from files f
          where f.key in ${sql()(referenced)} and f.owner_id = ${ownerId}
            and not exists (select 1 from books b where b.owner_id = ${ownerId} and b.id <> ${bookId} and position(f.key in b.data::text) > 0)`
      ).map((r) => r.key)
    : [];
  await sql()`delete from books where id = ${bookId} and owner_id = ${ownerId}`; // cascades to links, notes, recordings
  await deleteFiles([...deletable, ...recs.map((r) => r.file_key)]);
  return true; // events hold no book content, so metrics keep counting the deleted book
}

/** Everything for an account: books, files, recordings, links; anonymizes events; expires open checkouts. */
export async function purgeUser(userId: string) {
  const books = await sql()<{ id: string }[]>`select id from books where owner_id = ${userId}`;
  for (const b of books) await purgeBook(b.id, userId);

  // Checkouts that never completed: expire them so nobody pays for a book we can no longer print.
  const open = await sql()<{ id: string; stripe_session_id: string | null }[]>`
    update orders set status = 'canceled', updated_at = now() where owner_id = ${userId} and status = 'awaiting_payment'
    returning id, stripe_session_id`;
  if (process.env.STRIPE_SECRET_KEY)
    for (const o of open) if (o.stripe_session_id) await stripe().checkout.sessions.expire(o.stripe_session_id).catch(() => {});

  // Remaining files (unused uploads, AI art, old print files), except print files an active order still needs.
  const keep = await sql()<{ interior_key: string; cover_key: string }[]>`
    select interior_key, cover_key from orders where owner_id = ${userId} and status in ${sql()(ACTIVE_ORDER)}`;
  const keepKeys = new Set(keep.flatMap((o) => [o.interior_key, o.cover_key]));
  const files = await sql()<{ key: string }[]>`select key from files where owner_id = ${userId}`;
  await deleteFiles(files.map((f) => f.key).filter((k) => !keepKeys.has(k)));
  await sql()`update events set user_id = null where user_id = ${userId}`; // aggregate metrics stay, the person doesn't
}

/** Cancels any Stripe subscription right away (used when the account is deleted). */
export async function cancelSubscriptions(userId: string) {
  if (!process.env.STRIPE_SECRET_KEY) return;
  const user = await (await clerkClient()).users.getUser(userId).catch(() => null);
  const customer = (user?.privateMetadata as { stripeCustomerId?: string } | undefined)?.stripeCustomerId;
  if (!customer) return;
  const subs = await stripe().subscriptions.list({ customer, status: "all", limit: 20 });
  for (const s of subs.data) if (!["canceled", "incomplete_expired"].includes(s.status)) await stripe().subscriptions.cancel(s.id);
}
