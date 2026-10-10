import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/fulfill";
import { HttpError, json, requireUser, route } from "@/lib/server";

// POST { sessionId } — called when the buyer lands back on the site after Stripe Checkout, so the
// unlock / order / plan applies within seconds even if the webhook is slow. Safe to call repeatedly.
export const POST = route(async (req: Request) => {
  const { userId } = await requireUser();
  const { sessionId } = (await req.json()) as { sessionId?: string };
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new HttpError(400, "Missing checkout session.");
  if (!process.env.STRIPE_SECRET_KEY) throw new HttpError(503, "Payments aren't switched on yet.");
  const s = await stripe().checkout.sessions.retrieve(sessionId);
  if ((s.metadata?.userId || s.client_reference_id) !== userId) throw new HttpError(404, "We couldn't find that checkout.");
  const paid = s.payment_status === "paid" || s.payment_status === "no_payment_required";
  // Only fresh sessions: an old session id (e.g. from browser history) can't be replayed for a plan or credits.
  // Anything older was already delivered by Stripe's webhook, which retries for days.
  const fresh = Date.now() / 1000 - s.created < 24 * 3600;
  if (paid && fresh) await fulfillCheckoutSession(s);
  return json({ paid, kind: s.metadata?.kind ?? null, bookId: s.metadata?.bookId || null, orderId: s.metadata?.orderId || null });
});
