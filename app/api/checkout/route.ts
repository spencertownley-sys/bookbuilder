import { currentUser } from "@clerk/nextjs/server";
import { stripe, appUrl } from "@/lib/stripe";
import { ADD_ONS, PLANS } from "@/lib/plans";
import { getOwnedBook, HttpError, json, requireUser, route } from "@/lib/server";
import { fakePayments, unlockKeepsake } from "@/lib/fulfill";

// POST { planId, interval: "month" | "year" }  or  { addOnId, bookId? }
// Stripe Checkout gives cards, Apple Pay, Google Pay, Link, and (in the dashboard) PayPal,
// Klarna, Cash App etc. from one integration — turn methods on in Settings → Payment methods.
export const POST = route(async (req: Request) => {
  const { userId } = await requireUser();
  const user = await currentUser();
  const body = (await req.json()) as { planId?: string; interval?: "month" | "year"; addOnId?: string; bookId?: string };

  // Keepsake unlock is tied to one book.
  if (body.addOnId === "keepsake") {
    if (!body.bookId) throw new HttpError(400, "Choose which book to unlock.");
    const book = await getOwnedBook(body.bookId, userId);
    if (book.keepsake_unlocked) return json({ alreadyUnlocked: true });
    if (fakePayments()) {
      await unlockKeepsake(book.id);
      return json({ url: `/editor/${book.id}?unlocked=1`, fake: true });
    }
  }

  let price: string | undefined;
  let mode: "subscription" | "payment" = "subscription";
  if (body.addOnId) {
    const add = ADD_ONS.find((a) => a.id === body.addOnId);
    price = add && process.env[add.priceEnv];
    mode = "payment";
  } else {
    const plan = PLANS.find((p) => p.id === body.planId);
    const env = body.interval === "year" ? plan?.stripePriceEnvYearly : plan?.stripePriceEnvMonthly;
    price = env ? process.env[env] : undefined;
  }
  if (!price || !process.env.STRIPE_SECRET_KEY) throw new HttpError(503, "Payments aren't switched on yet.");

  const kind = body.addOnId === "keepsake" ? "keepsake" : body.addOnId ? "addon" : "plan";
  const session = await stripe().checkout.sessions.create({
    mode,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: userId,
    customer_email: user?.primaryEmailAddress?.emailAddress,
    metadata: { kind, userId, planId: body.planId ?? "", addOnId: body.addOnId ?? "", bookId: body.bookId ?? "" },
    subscription_data: mode === "subscription" ? { metadata: { userId, planId: body.planId ?? "" } } : undefined,
    allow_promotion_codes: true,
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    success_url: kind === "keepsake" ? `${appUrl()}/editor/${body.bookId}?unlocked=1` : `${appUrl()}/dashboard?upgraded=1`,
    cancel_url: kind === "keepsake" ? `${appUrl()}/editor/${body.bookId}` : `${appUrl()}/pricing`,
  });
  return json({ url: session.url });
});
