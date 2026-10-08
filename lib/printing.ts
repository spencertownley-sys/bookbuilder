// Printed-copy rules shared by the browser and the server (no secrets here).
// Product ids follow Lulu's dotted pod_package_id format (spec sheet, March 2026):
// TRIM.COLOR.QUALITY.BINDING.PAPER.FINISH — e.g. 0850X0850.FC.STD.CW.080CW444.GXX

export type PrintFormat = "hardcover" | "paperback";
export type ShippingLevel = "MAIL" | "PRIORITY_MAIL" | "EXPEDITED";

export const PRINT_TRIM = "sq85"; // printed copies are 8.5" × 8.5" at launch

export const FORMATS: Record<PrintFormat, { label: string; blurb: string; retailCents: number; minPages: number }> = {
  hardcover: { label: "Hardcover", blurb: "Glossy printed cover, sturdy keepsake binding", retailCents: 3499, minPages: 24 },
  paperback: { label: "Paperback", blurb: "Soft glossy cover, lighter and cheaper to send", retailCents: 2499, minPages: 8 },
};

export const SHIPPING: Record<ShippingLevel, { label: string; days: string; fallbackCents: number }> = {
  MAIL: { label: "Standard mail", days: "7–14 business days", fallbackCents: 599 },
  PRIORITY_MAIL: { label: "Priority", days: "4–8 business days", fallbackCents: 999 },
  EXPEDITED: { label: "Expedited", days: "2–4 business days", fallbackCents: 1999 },
};

/** Lulu's paperback options: saddle stitch up to 48 pages, perfect bound from 32 pages. */
export function podPackageId(format: PrintFormat, pages: number) {
  if (format === "hardcover") return "0850X0850.FC.STD.CW.080CW444.GXX";
  return pages <= 48 ? "0850X0850.FC.STD.SS.080CW444.GXX" : "0850X0850.FC.STD.PB.080CW444.GXX";
}

/** Page count as printed: blank pages are added at the end to meet binding rules. */
export function printedPageCount(format: PrintFormat, pages: number) {
  if (format === "hardcover") return Math.max(24, pages + (pages % 2));
  if (pages <= 48) return Math.max(8, Math.ceil(pages / 4) * 4); // saddle stitch folds sheets of 4 pages
  return Math.max(32, pages + (pages % 2));
}

export function unitPriceCents(format: PrintFormat, pages: number) {
  const printed = printedPageCount(format, pages);
  return FORMATS[format].retailCents + Math.max(0, printed - 32) * 20; // +$0.20 per page over 32
}

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export interface ShipTo {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state_code: string;
  postcode: string;
  country_code: string;
  phone_number: string;
}

export function validateShipTo(s: Partial<ShipTo>): string | null {
  if (!s.name?.trim()) return "Add the recipient's name.";
  if ((s.name ?? "").length > 35) return "Names on the label can be up to 35 characters.";
  if (!s.street1?.trim()) return "Add a street address.";
  if ((s.street1 ?? "").length > 30) return "Street lines can be up to 30 characters; use line 2 for the rest.";
  if (!s.city?.trim()) return "Add a city.";
  if (!s.postcode?.trim()) return "Add a ZIP or postal code.";
  if (!s.country_code || !/^[A-Z]{2}$/.test(s.country_code)) return "Choose a country.";
  if (["US", "CA", "MX", "AU"].includes(s.country_code) && !s.state_code?.trim()) return "Add a state or province.";
  if (!/^\+?[\d\s\-.\/()]{8,20}$/.test(s.phone_number ?? "")) return "Add a phone number for the delivery driver.";
  return null;
}
