import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { setUserPlan } from "@/lib/plan-server";
import { PlanId } from "@/lib/plans";
import { fulfillCheckoutSession } from "@/lib/fulfill";

// Point a Stripe webhook at /api/webhooks/stripe with these events:
// checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `bad signature: ${(e as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session); // idempotent
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;
      const active = event.type === "customer.subscription.updated" && ["active", "trialing", "past_due"].includes(sub.status);
      await setUserPlan(userId, active ? ((sub.metadata.planId as PlanId) ?? "creator") : "free");
      break;
    }
  }
  return NextResponse.json({ received: true });
}
