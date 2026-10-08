import "server-only";
import { sql } from "./db";
import { createPrintJob, luluConfigured, LuluJob, orderStatusFromLulu } from "./lulu";
import { publicMediaUrl } from "./storage";
import type { ShipTo, ShippingLevel } from "./printing";

// What happens after money changes hands. Called by the Stripe webhook (or, in local
// development with DEV_FAKE_PAYMENTS=1 and no Stripe key, right away).

export async function unlockKeepsake(bookId: string) {
  await sql()`update books set keepsake_unlocked = true where id = ${bookId}`;
}

interface OrderRow {
  id: string;
  book_id: string;
  book_title: string;
  pod_package_id: string;
  quantity: number;
  ship_to: ShipTo;
  contact_email: string;
  shipping_level: ShippingLevel;
  interior_key: string;
  cover_key: string;
  status: string;
}

export async function markOrderPaid(orderId: string, stripeSessionId?: string) {
  const [order] = await sql()<OrderRow[]>`
    update orders set status = 'paid', stripe_session_id = coalesce(${stripeSessionId ?? null}, stripe_session_id), updated_at = now()
    where id = ${orderId} and status = 'awaiting_payment' returning *`;
  if (!order) return; // already handled (webhooks can arrive twice)
  await unlockKeepsake(order.book_id); // a printed copy includes the Keepsake unlock
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
  await sql()`
    update orders set lulu_status = ${job.status.name}, status = ${orderStatusFromLulu(job.status.name)},
           tracking_url = coalesce(${tracking}, tracking_url), updated_at = now(),
           error = case when ${job.status.name} in ('REJECTED', 'ERROR') then ${job.status.messages?.url ?? "The printer reported a problem with the files."} else null end
    where lulu_job_id = ${jobId}`;
}
