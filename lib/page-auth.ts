import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getPlan } from "./plans";
import { isAdultConfirmed } from "./site";

/**
 * Auth for app pages (resource-based, as Clerk recommends): signed-out visitors go to sign-in and come
 * back afterwards; signed-in users who haven't confirmed they're 18+ go to /welcome first.
 */
export async function requirePageUser(path: string) {
  const { userId } = await auth.protect();
  const user = await currentUser().catch((e: { status?: number }) => {
    if (e?.status === 404) return null; // account just deleted; its session token hasn't expired yet
    throw e;
  });
  if (!user) redirect("/sign-in");
  if (!isAdultConfirmed(user.publicMetadata)) redirect(`/welcome?next=${encodeURIComponent(path)}`);
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  return {
    userId,
    email,
    plan: getPlan(user.publicMetadata?.plan as string | undefined),
    hasBilling: Boolean((user.privateMetadata as { stripeCustomerId?: string } | undefined)?.stripeCustomerId),
    isAdmin: isAdmin(userId, email),
  };
}

/** Admins (launch metrics, moderation) are listed by Clerk user id in ADMIN_USER_IDS or by email in ADMIN_EMAILS. */
export function isAdmin(userId: string | null | undefined, email?: string | null) {
  const list = (v?: string) => (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return Boolean((userId && list(process.env.ADMIN_USER_IDS).includes(userId.toLowerCase())) || (email && list(process.env.ADMIN_EMAILS).includes(email.toLowerCase())));
}
