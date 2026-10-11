import { clerkClient } from "@clerk/nextjs/server";
import { HttpError, json, requireUser, route } from "@/lib/server";
import { cancelSubscriptions, purgeUser } from "@/lib/purge";

// DELETE { confirm: "DELETE" } — deletes the account: cancels billing, removes every book, file,
// recording and share link, then deletes the Clerk user (which signs them out everywhere).
export const DELETE = route(async (req: Request) => {
  const { userId } = await requireUser({ allowUnconfirmed: true });
  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (confirm !== "DELETE") throw new HttpError(400, 'Type DELETE to confirm.');
  await cancelSubscriptions(userId);
  await purgeUser(userId);
  await (await clerkClient()).users.deleteUser(userId);
  return json({ ok: true });
});
