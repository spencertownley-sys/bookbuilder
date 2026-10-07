import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { clerkClient } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { setUserPlan } from "@/lib/plan-server";
import { PlanId } from "@/lib/plans";

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
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.metadata?.userId || s.client_reference_id;
      if (!userId) break;
      const customer = typeof s.customer === "string" ? s.customer : s.customer?.id;
      if (s.mode === "subscription" && s.metadata?.planId) {
        await setUserPlan(userId, s.metadata.planId as PlanId, customer);
      } else if (s.metadata?.addOnId === "ai-pack-50") {
        const client = await clerkClient();
        const u = await client.users.getUser(userId);
        const bonus = ((u.privateMetadata as { aiBonus?: number }).aiBonus ?? 0) + 50;
        await client.users.updateUserMetadata(userId, { privateMetadata: { aiBonus: bonus } });
      } else if (s.metadata?.addOnId === "keepsake") {
        const client = await clerkClient();
        const u = await client.users.getUser(userId);
        const credits = ((u.publicMetadata as { keepsakeCredits?: number }).keepsakeCredits ?? 0) + 1;
        await client.users.updateUserMetadata(userId, { publicMetadata: { keepsakeCredits: credits } });
      }
      break;
    }
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
