import "server-only";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { getPlan, Plan, PlanId } from "./plans";

// The user's plan lives in Clerk publicMetadata.plan (written by the Stripe webhook),
// so every page can read it without a database.
export async function getCurrentPlan(): Promise<Plan> {
  const user = await currentUser();
  return getPlan(user?.publicMetadata?.plan as string | undefined);
}

export async function setUserPlan(userId: string, plan: PlanId, stripeCustomerId?: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { plan },
    privateMetadata: stripeCustomerId ? { stripeCustomerId } : {},
  });
}

// Monthly AI-illustration counter stored in Clerk privateMetadata.
export async function consumeAiCredit(): Promise<{ ok: true; left: number } | { ok: false; reason: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, reason: "Please sign in." };
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const plan = getPlan(user.publicMetadata?.plan as string | undefined);
  const month = new Date().toISOString().slice(0, 7);
  const meta = (user.privateMetadata ?? {}) as { aiMonth?: string; aiUsed?: number; aiBonus?: number };
  const used = meta.aiMonth === month ? meta.aiUsed ?? 0 : 0;
  const allowance = plan.limits.aiImagesPerMonth + (meta.aiBonus ?? 0);
  if (used >= allowance) return { ok: false, reason: `You've used all ${allowance} AI illustrations this month — upgrade or grab an add-on pack.` };
  await client.users.updateUserMetadata(userId, { privateMetadata: { aiMonth: month, aiUsed: used + 1 } });
  return { ok: true, left: allowance - used - 1 };
}
