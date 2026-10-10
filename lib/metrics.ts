import "server-only";
import { sql } from "./db";

// The launch success metrics from the PRD, computed from the events table (lib/events.ts) and orders.
export interface Metric {
  id: string;
  label: string;
  definition: string;
  value: string;
  target: string;
  met: boolean | null; // null when there's no data yet
  detail?: string;
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");
const STRIPE_FEE = (cents: number) => cents * 0.029 + 30;

export async function launchMetrics(days: number): Promise<{ metrics: Metric[]; since: Date }> {
  const since = new Date(Date.now() - days * 86_400_000);
  const db = sql();

  const [users] = await db<{ signups: number; activated: number; median_secs: number | null; paid: number }[]>`
    with confirmed as (
      select user_id, (props->>'signedUpAt')::timestamptz as signed_up
      from events where name = 'account_confirmed' and user_id is not null and created_at >= ${since}
    ),
    first_finish as (select user_id, min(created_at) as t from events where name = 'book_finished' and user_id is not null group by user_id),
    paid as (
      select distinct user_id from events
      where user_id is not null and (name = 'keepsake_unlocked' or (name = 'plan_changed' and props->>'plan' <> 'free'))
    )
    select
      (select count(*)::int from confirmed) as signups,
      (select count(*)::int from confirmed c join first_finish f using (user_id)) as activated,
      (select percentile_cont(0.5) within group (order by extract(epoch from (f.t - c.signed_up)))
         from confirmed c join first_finish f using (user_id))::float as median_secs,
      (select count(*)::int from confirmed c join paid p using (user_id)) as paid`;

  const [books] = await db<{ finished: number; from_starter: number; printed: number; shared: number }[]>`
    with finished as (select distinct book_id from events where name = 'book_finished' and created_at >= ${since})
    select
      (select count(*)::int from finished) as finished,
      (select count(*)::int from finished f where exists (
         select 1 from events e where e.book_id = f.book_id and e.name = 'book_created' and coalesce(e.props->>'starter', '') <> '')) as from_starter,
      (select count(*)::int from finished f where exists (select 1 from events e where e.book_id = f.book_id and e.name = 'order_paid')) as printed,
      (select count(*)::int from finished f where exists (select 1 from events e where e.book_id = f.book_id and e.name = 'share_opened')) as shared`;

  const orders = await db<{ quantity: number; price_cents: number; shipping_cents: number; print_cost_cents: number | null; status: string }[]>`
    select quantity, price_cents, shipping_cents, print_cost_cents, status from orders
    where created_at >= ${since} and status not in ('awaiting_payment', 'canceled')`;
  const costed = orders.filter((o) => o.print_cost_cents !== null);
  const copies = costed.reduce((a, o) => a + o.quantity, 0);
  const margin = copies
    ? costed.reduce((a, o) => {
        const revenue = o.price_cents + o.shipping_cents;
        return a + revenue - (o.print_cost_cents ?? 0) - STRIPE_FEE(revenue);
      }, 0) / copies
    : null;
  const problems = orders.filter((o) => o.status === "error").length;

  const median = users.median_secs;
  const metrics: Metric[] = [
    {
      id: "time",
      label: "Time to first finished book",
      definition: "Sign-up to a book with 12+ pages and text on each (counted on its first save)",
      value: median === null ? "—" : median < 3600 ? `${Math.round(median / 60)} min` : `${(median / 3600).toFixed(1)} h`,
      target: "Median under 30 minutes",
      met: median === null ? null : median < 1800,
    },
    {
      id: "activation",
      label: "Activation",
      definition: "Sign-ups who finish at least one book",
      value: pct(users.activated, users.signups),
      target: "40%",
      met: users.signups ? users.activated / users.signups >= 0.4 : null,
      detail: `${users.activated} of ${users.signups} sign-ups`,
    },
    {
      id: "starter",
      label: "Starter usage",
      definition: "Finished books that began from a story starter",
      value: pct(books.from_starter, books.finished),
      target: "60%",
      met: books.finished ? books.from_starter / books.finished >= 0.6 : null,
      detail: `${books.from_starter} of ${books.finished} finished books`,
    },
    {
      id: "print",
      label: "Print conversion",
      definition: "Finished books with at least one printed copy ordered",
      value: pct(books.printed, books.finished),
      target: "10%",
      met: books.finished ? books.printed / books.finished >= 0.1 : null,
      detail: `${books.printed} of ${books.finished} finished books`,
    },
    {
      id: "paid",
      label: "Paid conversion",
      definition: "Accounts on a paid plan or with a Keepsake unlock (including ones that came with a printed order)",
      value: pct(users.paid, users.signups),
      target: "5%",
      met: users.signups ? users.paid / users.signups >= 0.05 : null,
      detail: `${users.paid} of ${users.signups} sign-ups`,
    },
    {
      id: "margin",
      label: "Gross margin per printed book",
      definition: "Price + shipping charged, minus Lulu's charge and estimated Stripe fees, per copy",
      value: margin === null ? "—" : `$${(margin / 100).toFixed(2)}`,
      target: "At least $12",
      met: margin === null ? null : margin >= 1200,
      detail: costed.length < orders.length ? `${orders.length - costed.length} order(s) without Lulu cost data are left out` : undefined,
    },
    {
      id: "share",
      label: "Share rate",
      definition: "Finished books with a family share link opened by someone else",
      value: pct(books.shared, books.finished),
      target: "30%",
      met: books.finished ? books.shared / books.finished >= 0.3 : null,
      detail: `${books.shared} of ${books.finished} finished books`,
    },
    {
      id: "defects",
      label: "Print problems",
      definition: "Paid orders the printer rejected or flagged (reprints aren't tracked in-app yet)",
      value: pct(problems, orders.length),
      target: "Under 2%",
      met: orders.length ? problems / orders.length < 0.02 : null,
      detail: `${problems} of ${orders.length} paid orders`,
    },
  ];
  return { metrics, since };
}

export async function openReports() {
  return sql()<{ id: number; book_id: string | null; reporter: string; reason: string; details: string | null; created_at: Date; title: string | null; owner_id: string | null }[]>`
    select r.id, r.book_id, r.reporter, r.reason, r.details, r.created_at, b.title, b.owner_id
    from reports r left join books b on b.id = r.book_id
    where r.status = 'open' order by r.created_at desc limit 100`;
}
