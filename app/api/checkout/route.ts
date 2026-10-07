import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { stripe, appUrl } from "@/lib/stripe";
import { ADD_ONS, PLANS } from "@/lib/plans";

// POST { planId, interval: "month" | "year" }  or  { addOnId }
// Stripe Checkout gives cards, Apple Pay, Google Pay, Link, and (in the dashboard) PayPal,
// Klarna, Cash App etc. from one integration — turn methods on in Settings → Payment methods.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const user = await currentUser();
  const body = (await req.json()) as { planId?: string; interval?: "month" | "year"; addOnId?: string };

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
  if (!price) return NextResponse.json({ error: "Unknown plan or missing Stripe price id" }, { status: 400 });

  const session = await stripe().checkout.sessions.create({
    mode,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: userId,
    customer_email: user?.primaryEmailAddress?.emailAddress,
    metadata: { userId, planId: body.planId ?? "", addOnId: body.addOnId ?? "" },
    subscription_data: mode === "subscription" ? { metadata: { userId, planId: body.planId ?? "" } } : undefined,
    allow_promotion_codes: true,
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    success_url: `${appUrl()}/dashboard?upgraded=1`,
    cancel_url: `${appUrl()}/pricing`,
  });
  return NextResponse.json({ url: session.url });
}
