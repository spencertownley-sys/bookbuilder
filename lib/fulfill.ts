import "server-only";
import type Stripe from "stripe";
import { clerkClient } from "@clerk/nextjs/server";
import { sql } from "./db";
import { createPrintJob, luluConfigured, LuluJob, orderStatusFromLulu } from "./lulu";
import { deleteFiles, publicMediaUrl } from "./storage";
import { setUserPlan } from "./plan-server";
import { track, trackOncePerBook } from "./events";
import type { PlanId } from "./plans";
import type { ShipTo, ShippingLevel } from "./printing";

// What happens after money changes hands. Called by the Stripe webhook and when the buyer returns
// from Checkout (/api/checkout/confirm), whichever comes first; or, in local development with
// DEV_FAKE_PAYMENTS=1 and no Stripe key, right away.

/** Applies a paid Checkout session exactly once. Returns false if it was already applied. */
export async function fulfillCheckoutSession(s: Stripe.Checkout.Session): Promise<boolean> {
  if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return false;
  const userId = s.metadata?.userId || s.client_reference_id;
  if (!userId) return false;
  const kind = s.metadata?.kind ?? (s.mode === "subscription" ? "plan" : "addon");
  const claimed = await sql()`insert into checkout_sessions (id, kind) values (${s.id}, ${kind}) on conflict (id) do nothing returning id`;
  if (!claimed.length) return false;
  try {
    const customer = typeof s.customer === "string" ? s.customer : s.customer?.id;
    if (kind === "order" && s.metadata?.orderId) {
      await markOrderPaid(s.metadata.orderId, s.id);
    } else if (s.metadata?.addOnId === "keepsake" && s.metadata.bookId) {
      await unlockKeepsake(s.metadata.bookId, "purchase");
    } else if (s.mode === "subscription" && s.metadata?.planId) {
      await setUserPlan(userId, s.metadata.planId as PlanId, customer);
    } else if (s.metadata?.addOnId === "ai-pack-50") {
      const client = await clerkClient();
      const u = await client.users.getUser(userId);
      const bonus = ((u.privateMetadata as { aiBonus?: number }).aiBonus ?? 0) + 50;
      await client.users.updateUserMetadata(userId, { privateMetadata: { aiBonus: bonus } });
    }
    return true;
  } catch (e) {
    await sql()`delete from checkout_sessions where id = ${s.id}`; // let the next delivery retry
    throw e;
  }
}

export async function unlockKeepsake(bookId: string, via: "purchase" | "order" = "purchase") {
  const [row] = await sql()<{ owner_id: string }[]>`update books set keepsake_unlocked = true where id = ${bookId} returning owner_id`;
  if (row) await trackOncePerBook("keepsake_unlocked", bookId, { userId: row.owner_id, props: { via } });
}

interface OrderRow {
  id: string;
  owner_id: string;
  book_id: string | null;
  book_title: string;
  format: string;
  pod_package_id: string;
  quantity: number;
  ship_to: ShipTo;
  contact_email: string;
  shipping_level: ShippingLevel;
  interior_key: string;
  cover_key: string;
  price_cents: number;
  shipping_cents: number;
  status: string;
}

export async function markOrderPaid(orderId: string, stripeSessionId?: string) {
  const [order] = await sql()<OrderRow[]>`
    update orders set status = 'paid', stripe_session_id = coalesce(${stripeSessionId ?? null}, stripe_session_id), updated_at = now()
    where id = ${orderId} and status = 'awaiting_payment' returning *`;
  if (!order) return; // already handled (webhooks can arrive twice)
  await track("order_paid", {
    userId: order.owner_id,
    bookId: order.book_id,
    props: { format: order.format, quantity: order.quantity, cents: order.price_cents + order.shipping_cents },
  });
  if (order.book_id) await unlockKeepsake(order.book_id, "order"); // a printed copy includes the Keepsake unlock
  await submitToPrinter(order);
}

export async function submitToPrinter(order: OrderRow) {
  if (!luluConfigured()) {
    await sql()`update orders set error = 'Printing is not connected yet (add Lulu API keys). Your payment is safe; we will print as soon as it is.', updated_at = now() where id = ${order.id}`;
    return;
  }
  try {
    const job = await createPrintJob({
      externalId: order.id,
      title: order.book_title,
      podPackageId: order.pod_package_id,
      quantity: order.quantity,
      interiorUrl: publicMediaUrl(order.interior_key),
      coverUrl: publicMediaUrl(order.cover_key),
      shipTo: order.ship_to,
      email: order.contact_email,
      level: order.shipping_level,
    });
    await sql()`update orders set status = 'submitted', lulu_job_id = ${String(job.id)}, lulu_status = ${job.status?.name ?? null}, error = null, updated_at = now() where id = ${order.id}`;
  } catch (e) {
    await sql()`update orders set error = ${(e as Error).message.slice(0, 500)}, updated_at = now() where id = ${order.id}`;
  }
}

export const fakePayments = () =>
  process.env.DEV_FAKE_PAYMENTS === "1" && !process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== "production";

/** Record a status update from Lulu (webhook) on the matching order. */
export async function applyLuluStatus(jobId: string, job: LuluJob) {
  const tracking = job.line_items?.flatMap((l) => l.tracking_urls ?? [])[0] ?? null;
  const rows = await sql()<{ status: string; interior_key: string; cover_key: string }[]>`
    update orders set lulu_status = ${job.status.name}, status = ${orderStatusFromLulu(job.status.name)},
           tracking_url = coalesce(${tracking}, tracking_url), updated_at = now(),
           error = case when ${job.status.name} in ('REJECTED', 'ERROR') then ${job.status.messages?.url ?? "The printer reported a problem with the files."} else null end
    where lulu_job_id = ${jobId}
    returning status, interior_key, cover_key`;
  // Once a book has left the printer its print files are no longer needed (Privacy Policy).
  for (const o of rows)
    if (["shipped", "delivered", "canceled"].includes(o.status)) await deleteFiles([o.interior_key, o.cover_key]).catch((e) => console.error(e));
  return rows.length;
}
