import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { cancelSubscriptions, purgeUser } from "@/lib/purge";

// Clerk → Webhooks → endpoint https://YOUR_DOMAIN/api/webhooks/clerk, event "user.deleted",
// signing secret in CLERK_WEBHOOK_SIGNING_SECRET. Covers accounts deleted from Clerk's own
// account screen or the Clerk dashboard (deletes from our Account page purge right away).
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response("bad signature", { status: 400 });
  }
  if (evt.type === "user.deleted" && evt.data.id) {
    await purgeUser(evt.data.id); // idempotent, so a retry after a billing error is safe
    await cancelSubscriptions(evt.data.id); // a deleted user must stop being charged
  }
  return Response.json({ ok: true });
}
