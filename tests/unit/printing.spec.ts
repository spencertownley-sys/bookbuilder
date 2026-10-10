import { expect, test } from "@playwright/test";
import { FORMATS, money, podPackageId, printedPageCount, unitPriceCents, validateShipTo } from "@/lib/printing";
import { mediaKeysIn, MEDIA_KEY_RE } from "@/lib/media";
import { isAdultConfirmed, safeNext } from "@/lib/site";
import { getPlan, PLANS } from "@/lib/plans";

test.describe("printed copies", () => {
  test("PRD prices: hardcover $34.99, paperback $24.99", () => {
    expect(FORMATS.hardcover.retailCents).toBe(3499);
    expect(FORMATS.paperback.retailCents).toBe(2499);
    expect(unitPriceCents("hardcover", 24)).toBe(3499);
    expect(unitPriceCents("hardcover", 40)).toBe(3499 + 8 * 20); // +$0.20 a page over 32
    expect(money(3499)).toBe("$34.99");
  });

  test("binding rules pad the page count", () => {
    expect(printedPageCount("hardcover", 16)).toBe(24); // hardcover minimum
    expect(printedPageCount("hardcover", 25)).toBe(26); // even
    expect(printedPageCount("paperback", 22)).toBe(24); // saddle stitch: multiple of 4
    expect(printedPageCount("paperback", 6)).toBe(8);
    expect(printedPageCount("paperback", 49)).toBe(50); // perfect bound
  });

  test("Lulu product ids for 8.5in square color", () => {
    expect(podPackageId("hardcover", 24)).toBe("0850X0850.FC.STD.CW.080CW444.GXX");
    expect(podPackageId("paperback", 24)).toBe("0850X0850.FC.STD.SS.080CW444.GXX");
    expect(podPackageId("paperback", 60)).toBe("0850X0850.FC.STD.PB.080CW444.GXX");
  });

  test("shipping address validation", () => {
    const ok = { name: "Leo Park", street1: "1 Main St", city: "Seattle", state_code: "WA", postcode: "98101", country_code: "US", phone_number: "206 555 0100" };
    expect(validateShipTo(ok)).toBeNull();
    expect(validateShipTo({ ...ok, name: "" })).toMatch(/name/);
    expect(validateShipTo({ ...ok, street1: "x".repeat(31) })).toMatch(/30/);
    expect(validateShipTo({ ...ok, state_code: "" })).toMatch(/state/);
    expect(validateShipTo({ ...ok, country_code: "GB", state_code: "" })).toBeNull();
    expect(validateShipTo({ ...ok, phone_number: "12" })).toMatch(/phone/);
  });
});

test("media keys are found in book JSON and nothing else matches", () => {
  const k1 = "uploads/AbCdEfGhIjKlMnOpQrStUvWx.png";
  const k2 = "voice/abcdefghijklmnopqrstuvwx.webm";
  const book = { pages: [{ background: `/api/media/${k1}` }, { elements: [{ src: `/api/media/${k1}` }, { src: `/api/media/${k2}` }] }], hero: { photo: "/templates/x.png" } };
  expect(mediaKeysIn(book).sort()).toEqual([k1, k2].sort());
  expect(MEDIA_KEY_RE.test(k1)).toBe(true);
  expect(MEDIA_KEY_RE.test("../etc/passwd")).toBe(false);
  expect(mediaKeysIn({ src: "/api/media/uploads/short.png" })).toEqual([]);
});

test("post-login redirects stay on this site", () => {
  expect(safeNext("/editor/abc")).toBe("/editor/abc");
  expect(safeNext("https://evil.example")).toBe("/dashboard");
  expect(safeNext("//evil.example")).toBe("/dashboard");
  expect(safeNext("/\\evil.example")).toBe("/dashboard");
  expect(safeNext(null)).toBe("/dashboard");
});

test("18+ confirmation comes only from server-written metadata", () => {
  expect(isAdultConfirmed({ adultConfirmedAt: "2026-10-10T00:00:00Z" })).toBe(true);
  expect(isAdultConfirmed({})).toBe(false);
  expect(isAdultConfirmed(undefined)).toBe(false);
});

test("plan limits match the PRD table", () => {
  const [free, story, pub] = PLANS;
  expect([free.limits.books, story.limits.books, pub.limits.books]).toEqual([2, 10, 100]);
  expect([free.limits.pagesPerBook, story.limits.pagesPerBook, pub.limits.pagesPerBook]).toEqual([16, 40, 64]);
  expect([free.limits.aiImagesPerMonth, story.limits.aiImagesPerMonth, pub.limits.aiImagesPerMonth]).toEqual([5, 60, 250]);
  expect(free.limits.watermark && !story.limits.watermark && !pub.limits.watermark).toBe(true);
  expect(getPlan("nope").id).toBe("free");
});
