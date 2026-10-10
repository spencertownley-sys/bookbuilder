import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getPlan, PlanId } from "./plans";
import { isAdultConfirmed } from "./site";
import { track } from "./events";

// The user's plan lives in Clerk publicMetadata.plan (written by the Stripe webhook),
// so every page can read it without a database (see requirePageUser in lib/page-auth.ts).
export async function setUserPlan(userId: string, plan: PlanId, stripeCustomerId?: string) {
  const client = await clerkClient();
  const before = getPlan((await client.users.getUser(userId)).publicMetadata?.plan as string | undefined).id;
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { plan },
    privateMetadata: stripeCustomerId ? { stripeCustomerId } : {},
  });
  if (before !== plan) await track("plan_changed", { userId, props: { plan, from: before } });
}

// Monthly AI-illustration counter stored in Clerk privateMetadata.
export async function consumeAiCredit(): Promise<{ ok: true; left: number } | { ok: false; reason: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, reason: "Please sign in." };
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (!isAdultConfirmed(user.publicMetadata)) return { ok: false, reason: "Please confirm you're 18 or older first. Reload the page to continue." };
  const plan = getPlan(user.publicMetadata?.plan as string | undefined);
  const month = new Date().toISOString().slice(0, 7);
  const meta = (user.privateMetadata ?? {}) as { aiMonth?: string; aiUsed?: number; aiBonus?: number };
  const used = meta.aiMonth === month ? meta.aiUsed ?? 0 : 0;
  const allowance = plan.limits.aiImagesPerMonth + (meta.aiBonus ?? 0);
  if (used >= allowance) return { ok: false, reason: `You've used all ${allowance} AI illustrations this month — upgrade or grab an add-on pack.` };
  await client.users.updateUserMetadata(userId, { privateMetadata: { aiMonth: month, aiUsed: used + 1 } });
  return { ok: true, left: allowance - used - 1 };
}
