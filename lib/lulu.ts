import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { ShipTo, ShippingLevel } from "./printing";

// Lulu Print API client. Docs: https://api.lulu.com/docs/ (OpenAPI: /api-docs/openapi-specs/openapi_public.yml)
// Sandbox accounts: developers.sandbox.lulu.com — set LULU_API_BASE=https://api.sandbox.lulu.com while testing.

const BASE = () => (process.env.LULU_API_BASE ?? "https://api.sandbox.lulu.com").replace(/\/$/, "");
export const luluConfigured = () => Boolean(process.env.LULU_CLIENT_KEY && process.env.LULU_CLIENT_SECRET);

let token: { value: string; expires: number } | null = null;

async function accessToken() {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const r = await fetch(`${BASE()}/auth/realms/glasstree/protocol/openid-connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${process.env.LULU_CLIENT_KEY}:${process.env.LULU_CLIENT_SECRET}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error(`Lulu sign-in failed (${r.status})`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return token.value;
}

async function lulu<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(`${BASE()}${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Lulu ${path} failed (${r.status}): ${text.slice(0, 500)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

const toCents = (s?: string) => Math.round(Number(s ?? 0) * 100);

/** What Lulu charges us (print + shipping + fees, incl. tax). */
export async function luluCost(podPackageId: string, pageCount: number, quantity: number, shipTo: ShipTo, level: ShippingLevel) {
  const j = await lulu<{
    total_cost_incl_tax: string;
    shipping_cost: { total_cost_incl_tax: string };
    line_item_costs: { total_cost_incl_tax: string }[];
  }>("/print-job-cost-calculations/", {
    method: "POST",
    body: {
      line_items: [{ pod_package_id: podPackageId, page_count: pageCount, quantity }],
      shipping_address: { street1: shipTo.street1, city: shipTo.city, country_code: shipTo.country_code, postcode: shipTo.postcode, state_code: shipTo.state_code, phone_number: shipTo.phone_number },
      shipping_option: level,
    },
  });
  return {
    totalCents: toCents(j.total_cost_incl_tax),
    shippingCents: toCents(j.shipping_cost?.total_cost_incl_tax),
    printCents: j.line_item_costs.reduce((a, l) => a + toCents(l.total_cost_incl_tax), 0),
  };
}

/** Exact cover spread size for a product + page count, in inches. */
export async function coverDimensions(podPackageId: string, interiorPageCount: number) {
  const j = await lulu<{ width: string; height: string }>("/cover-dimensions/", {
    method: "POST",
    body: { pod_package_id: podPackageId, interior_page_count: interiorPageCount, unit: "inch" },
  });
  return { width: Number(j.width), height: Number(j.height) };
}

export interface LuluJob {
  id: number;
  status: { name: string; messages?: { url?: string } };
  line_items: { tracking_urls?: string[]; tracking_id?: string }[];
}

export async function createPrintJob(o: {
  externalId: string;
  title: string;
  podPackageId: string;
  quantity: number;
  interiorUrl: string;
  coverUrl: string;
  shipTo: ShipTo;
  email: string;
  level: ShippingLevel;
}) {
  return lulu<LuluJob>("/print-jobs/", {
    method: "POST",
    body: {
      external_id: o.externalId,
      contact_email: o.email,
      shipping_level: o.level,
      shipping_address: { ...o.shipTo, email: o.email },
      line_items: [
        {
          external_id: o.externalId,
          title: o.title.slice(0, 255),
          quantity: o.quantity,
          printable_normalization: {
            pod_package_id: o.podPackageId,
            cover: { source_url: o.coverUrl },
            interior: { source_url: o.interiorUrl },
          },
        },
      ],
    },
  });
}

/** Lulu signs webhooks with HMAC-SHA256 of the raw body, keyed by the API client secret. */
export function verifyLuluSignature(rawBody: string, header: string | null) {
  const secret = process.env.LULU_CLIENT_SECRET;
  if (!secret || !header) return false;
  const mac = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  // The docs don't say whether the header is hex or base64, so accept either.
  for (const candidate of [Buffer.from(mac.toString("hex")), Buffer.from(mac.toString("base64"))]) {
    const got = Buffer.from(header.trim());
    if (got.length === candidate.length && timingSafeEqual(got, candidate)) return true;
  }
  return false;
}

/** Map Lulu's status names onto the order statuses we show customers. */
export function orderStatusFromLulu(name: string) {
  switch (name) {
    case "SHIPPED":
      return "shipped";
    case "DELIVERED":
      return "delivered";
    case "IN_PRODUCTION":
    case "PRODUCTION_READY":
    case "PRODUCTION_DELAYED":
      return "in_production";
    case "CANCELED":
      return "canceled";
    case "REJECTED":
    case "ERROR":
      return "error";
    default:
      return "submitted";
  }
}
