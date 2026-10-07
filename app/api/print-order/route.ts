import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Order a single printed copy through Lulu's Print API (book-of-one printing).
// Lulu needs publicly reachable PDF URLs, so upload the exported interior + cover
// to storage first (Vercel Blob / Cloudflare R2 / Supabase Storage) and pass the URLs.
// Docs: https://developers.lulu.com  — use api.sandbox.lulu.com while testing.

const LULU = process.env.LULU_API_BASE ?? "https://api.sandbox.lulu.com";

async function luluToken() {
  const r = await fetch(`${LULU}/auth/realms/glasswing/protocol/openid-connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${process.env.LULU_CLIENT_KEY}:${process.env.LULU_CLIENT_SECRET}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error("Lulu auth failed");
  return (await r.json()).access_token as string;
}

interface Body {
  title: string;
  interiorUrl: string;
  coverUrl: string;
  podPackageId: string; // Lulu product SKU (trim + color + paper + binding) — copy it from Lulu's pricing calculator
  quantity?: number;
  email: string;
  shipping: { name: string; street1: string; city: string; state_code: string; postcode: string; country_code: string; phone_number: string };
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (!process.env.LULU_CLIENT_KEY) return NextResponse.json({ error: "Printing isn't switched on yet (add Lulu API keys)." }, { status: 501 });
  const b = (await req.json()) as Body;
  const token = await luluToken();
  const r = await fetch(`${LULU}/print-jobs/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      external_id: `${userId}-${Date.now()}`,
      contact_email: b.email,
      shipping_level: "MAIL",
      shipping_address: b.shipping,
      line_items: [
        {
          title: b.title,
          quantity: b.quantity ?? 1,
          printable_normalization: {
            pod_package_id: b.podPackageId,
            cover: { source_url: b.coverUrl },
            interior: { source_url: b.interiorUrl },
          },
        },
      ],
    }),
  });
  const j = await r.json();
  if (!r.ok) return NextResponse.json({ error: j }, { status: 400 });
  // Charge the customer (Stripe Checkout, mode: payment) for print + shipping + your margin before or after this call.
  return NextResponse.json({ printJobId: j.id, status: j.status });
}
