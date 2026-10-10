import { clerkClient } from "@clerk/nextjs/server";
import { HttpError, json, requireUser, route } from "@/lib/server";
import { TERMS_VERSION } from "@/lib/site";
import { track } from "@/lib/events";

// POST { adult: true, terms: true } — records the 18+ confirmation and Terms acceptance.
// Stored in publicMetadata, which only our server can write, so it can't be faked from the browser.
export const POST = route(async (req: Request) => {
  const { userId, createdAt } = await requireUser({ allowUnconfirmed: true });
  const { adult, terms } = (await req.json()) as { adult?: boolean; terms?: boolean };
  if (adult !== true) throw new HttpError(400, "Accounts are for adults 18 and over.");
  if (terms !== true) throw new HttpError(400, "Please accept the Terms and Privacy Policy to continue.");
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const already = (user.publicMetadata as { adultConfirmedAt?: string }).adultConfirmedAt;
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { adultConfirmedAt: already ?? new Date().toISOString(), termsVersion: TERMS_VERSION },
  });
  if (!already) await track("account_confirmed", { userId, props: { signedUpAt: new Date(createdAt).toISOString() } });
  return json({ ok: true });
});
