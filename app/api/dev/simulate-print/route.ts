import { sql } from "@/lib/db";
import { applyLuluStatus, fakePayments } from "@/lib/fulfill";
import { requireUser, json, route, HttpError } from "@/lib/server";

// Development only (DEV_FAKE_PAYMENTS=1): walks an order through the printer's statuses so the
// order page can be tested before Lulu is connected. Disabled whenever Stripe keys or production are on.
export const POST = route(async (req: Request) => {
  if (!fakePayments()) throw new HttpError(404, "Not found");
  const { userId } = await requireUser();
  const { orderId, status } = (await req.json()) as { orderId: string; status: string };
  const [order] = await sql()<{ job: string }[]>`
    update orders set lulu_job_id = coalesce(lulu_job_id, 'sim-' || id) where id = ${orderId} and owner_id = ${userId} returning lulu_job_id as job`;
  if (!order) throw new HttpError(404, "No such order.");
  const tracking = status === "SHIPPED" ? ["https://tools.usps.com/go/TrackConfirmAction?tLabels=TEST123"] : [];
  // Same path as Lulu's webhook, so status mapping and print-file cleanup are exercised too.
  const updated = await applyLuluStatus(order.job, { id: 0, status: { name: status }, line_items: [{ tracking_urls: tracking }] });
  return json({ updated });
});
