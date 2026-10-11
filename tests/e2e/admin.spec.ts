import { expect, test } from "@playwright/test";
import { cleanupUsers, createUser, newVisitor, signIn } from "./helpers";

// The admin is whoever ADMIN_EMAILS names; .env.local for e2e runs includes this address.
const ADMIN_EMAIL = "bb-e2e-admin+clerk_test@example.com";

test.afterAll(cleanupUsers);

test("launch metrics and moderation are admin-only", async ({ page, browser }) => {
  test.skip(!(process.env.ADMIN_EMAILS ?? "").includes(ADMIN_EMAIL), `Add ADMIN_EMAILS=${ADMIN_EMAIL} to .env.local to run this test`);

  // A parent shares a book and a viewer reports it.
  const parent = await createUser();
  const p = await newVisitor(browser, {});
  await signIn(p.page, parent);
  const { id: bookId } = await (await p.page.request.post("/api/books", { data: { starterId: "holiday", hero: { name: "Sam", pronoun: "they" } } })).json();
  const { link } = await (await p.page.request.post(`/api/books/${bookId}/share`, { data: { kind: "read" } })).json();
  expect((await p.page.request.get("/admin")).status()).toBe(404); // not an admin
  await p.ctx.close();
  const viewer = await newVisitor(browser);
  expect((await viewer.page.request.post(`/api/share/${link.token}/report`, { data: { reason: "Inappropriate content", details: "e2e report" } })).status()).toBe(201);
  await viewer.ctx.close();

  const admin = await createUser({ email: ADMIN_EMAIL });
  await signIn(page, admin);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Launch metrics" })).toBeVisible();
  for (const m of ["Time to first finished book", "Activation", "Starter usage", "Print conversion", "Paid conversion", "Gross margin per printed book", "Share rate", "Print problems"])
    await expect(page.locator(".metrics").getByText(m, { exact: true })).toBeVisible();

  const report = page.locator(".reports li").filter({ hasText: "e2e report" });
  await expect(report).toContainText("Viewer reported the book");
  await report.getByRole("button", { name: "Turn off share links" }).click();
  await expect(page.locator(".reports li").filter({ hasText: "e2e report" })).toHaveCount(0);
  expect((await page.request.get(`/api/share/${link.token}`)).status()).toBe(404);
});
