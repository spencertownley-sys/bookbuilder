import { sql } from "@/lib/db";
import { fakePayments } from "@/lib/fulfill";
import { requireUser, json, route, HttpError } from "@/lib/server";
import { orderStatusFromLulu } from "@/lib/lulu";

// Development only (DEV_FAKE_PAYMENTS=1): walks an order through the printer's statuses so the
// order page can be tested before Lulu is connected. Disabled whenever Stripe keys or production are on.
export const POST = route(async (req: Request) => {
  if (!fakePayments()) throw new HttpError(404, "Not found");
  const { userId } = await requireUser();
  const { orderId, status } = (await req.json()) as { orderId: string; status: string };
  const tracking = status === "SHIPPED" ? "https://tools.usps.com/go/TrackConfirmAction?tLabels=TEST123" : null;
  const r = await sql()`
    update orders set lulu_job_id = coalesce(lulu_job_id, 'sim-' || id), lulu_status = ${status},
           status = ${orderStatusFromLulu(status)}, tracking_url = coalesce(${tracking}, tracking_url), error = null, updated_at = now()
    where id = ${orderId} and owner_id = ${userId}`;
  return json({ updated: r.count });
});
