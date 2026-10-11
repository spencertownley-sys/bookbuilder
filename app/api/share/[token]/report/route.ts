import { sql } from "@/lib/db";
import { getActiveLink, HttpError, json, route } from "@/lib/server";
import { REPORT_REASONS } from "@/lib/site";

// Public: anyone holding a share link can report the book to us.
export const POST = route(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const link = await getActiveLink((await params).token);
  const { reason, details } = (await req.json()) as { reason?: string; details?: string };
  if (!REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number])) throw new HttpError(400, "Choose a reason.");
  const [{ n }] = await sql()<{ n: number }[]>`
    select count(*)::int as n from reports where book_id = ${link.book_id} and reporter = 'viewer' and created_at > now() - interval '1 hour'`;
  if (n >= 5) throw new HttpError(429, "Thanks, we've already received reports about this book and will review it.");
  await sql()`insert into reports (book_id, reporter, reason, details)
              values (${link.book_id}, 'viewer', ${reason!}, ${(details ?? "").trim().slice(0, 1000) || null})`;
  return json({ ok: true }, 201);
});
