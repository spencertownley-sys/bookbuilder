import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { stripe, appUrl } from "@/lib/stripe";

// Lets subscribers change plan, update card, or cancel — hosted by Stripe.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const user = await (await clerkClient()).users.getUser(userId);
  const customer = (user.privateMetadata as { stripeCustomerId?: string })?.stripeCustomerId;
  if (!customer) return NextResponse.json({ error: "No subscription yet" }, { status: 400 });
  const session = await stripe().billingPortal.sessions.create({ customer, return_url: `${appUrl()}/dashboard` });
  return NextResponse.json({ url: session.url });
}
