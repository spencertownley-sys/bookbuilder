import { nanoid } from "nanoid";
import { sql } from "@/lib/db";
import { getOwnedBook, HttpError, json, requireUser, route } from "@/lib/server";
import { quote } from "@/lib/quote";
import { fileOwnedBy } from "@/lib/storage";
import { fakePayments, markOrderPaid } from "@/lib/fulfill";
import { appUrl, stripe } from "@/lib/stripe";
import { FORMATS, PRINT_TRIM, PrintFormat, ShipTo, ShippingLevel, SHIPPING, validateShipTo } from "@/lib/printing";

export const GET = route(async () => {
  const { userId } = await requireUser();
  const orders = await sql()`
    select id, book_id, book_title, format, quantity, price_cents, shipping_cents, status, tracking_url, error, created_at, updated_at, ship_to->>'name' as ship_name
    from orders where owner_id = ${userId} order by created_at desc limit 100`;
  return json({ orders });
});

interface Body {
  bookId: string;
  format: PrintFormat;
  quantity: number;
  shippingLevel: ShippingLevel;
  shipTo: ShipTo;
  email?: string;
  interiorKey: string;
  coverKey: string;
}

// POST: create an order for files the browser already uploaded, then send the buyer to checkout.
export const POST = route(async (req: Request) => {
  const { userId, email: accountEmail } = await requireUser();
  const b = (await req.json()) as Body;
  const row = await getOwnedBook(b.bookId, userId);
  if (row.data.trim !== PRINT_TRIM) throw new HttpError(400, 'Printed copies are 8.5" × 8.5". Switch the book size in Export first.');
  const problem = validateShipTo(b.shipTo ?? {});
  if (problem) throw new HttpError(400, problem);
  if (!(await fileOwnedBy(b.interiorKey, userId)) || !(await fileOwnedBy(b.coverKey, userId)))
    throw new HttpError(400, "The print files didn't finish uploading. Please try again.");
  const email = (b.email || accountEmail || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Add an email for order updates.");

  const q = await quote(b.format, row.data.pages.length, Number(b.quantity), b.shippingLevel, b.shipTo);
  const id = "ord_" + nanoid(14);
  await sql()`
    insert into orders (id, owner_id, book_id, book_title, format, pod_package_id, page_count, quantity, shipping_level,
                        ship_to, contact_email, price_cents, shipping_cents, interior_key, cover_key, print_cost_cents)
    values (${id}, ${userId}, ${row.id}, ${row.title}, ${b.format}, ${q.podPackageId}, ${q.pages}, ${q.quantity}, ${b.shippingLevel},
            ${sql().json(b.shipTo as never)}, ${email}, ${q.itemsCents}, ${q.shippingCents}, ${b.interiorKey}, ${b.coverKey}, ${q.printCostCents ?? null})`;

  if (fakePayments()) {
    await markOrderPaid(id, "dev_fake");
    return json({ url: `/orders?placed=${id}`, orderId: id, fake: true }, 201);
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    client_reference_id: userId,
    metadata: { kind: "order", orderId: id, userId },
    line_items: [
      {
        quantity: q.quantity,
        price_data: {
          currency: "usd",
          unit_amount: q.unitCents,
          product_data: { name: `${FORMATS[b.format].label}: ${row.title}`, description: `${q.pages} pages, 8.5" × 8.5"` },
        },
      },
      {
        quantity: 1,
        price_data: { currency: "usd", unit_amount: q.shippingCents, product_data: { name: `Shipping (${SHIPPING[b.shippingLevel].label})` } },
      },
    ],
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    success_url: `${appUrl()}/orders?placed=${id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/editor/${row.id}?order=canceled`,
  });
  await sql()`update orders set stripe_session_id = ${session.id} where id = ${id}`;
  return json({ url: session.url, orderId: id }, 201);
});
