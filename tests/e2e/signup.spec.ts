import { expect, test } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { cleanupUsers, clerkApi, createUser, PASSWORD, signIn, testEmail } from "./helpers";

test.afterAll(cleanupUsers);

test("a new parent signs up, confirms they're 18+, and lands on their bookshelf", async ({ page }) => {
  const email = testEmail("signup");
  await setupClerkTestingToken({ page });
  await page.goto("/sign-up");
  await expect(page.getByText("Accounts are for adults 18 and over.")).toBeVisible();
  await page.locator("#emailAddress-field").fill(email);
  await page.locator("#password-field").fill(PASSWORD);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // Clerk test emails (+clerk_test) always use the verification code 424242.
  const code = page.locator('input[autocomplete="one-time-code"], input[name="code"]').first();
  await code.waitFor();
  await code.click();
  await page.keyboard.type("424242");

  await page.waitForURL(/\/welcome/);
  await page.getByRole("button", { name: "Start making books" }).click();
  await expect(page.getByText("Tick both boxes to continue.")).toBeVisible();
  await page.locator("#welcome-adult").check();
  await page.locator("#welcome-terms").check();
  await page.getByRole("button", { name: "Start making books" }).click();

  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "My bookshelf" })).toBeVisible();
  await expect(page.getByText("Doodle plan · 0/2 books")).toBeVisible();

  const [user] = (await clerkApi().users.getUserList({ emailAddress: [email] })).data;
  expect((user.publicMetadata as { adultConfirmedAt?: string }).adultConfirmedAt).toBeTruthy();
  await clerkApi().users.deleteUser(user.id);
});

test("accounts that haven't confirmed 18+ can't use the app or its API", async ({ page }) => {
  const user = await createUser({ adult: false });
  await signIn(page, user);
  await page.goto("/new");
  await expect(page).toHaveURL(/\/welcome\?next=%2Fnew/);
  const r = await page.request.get("/api/books");
  expect(r.status()).toBe(403);
  // The confirmation can't be skipped by sending only half of it.
  expect((await page.request.post("/api/account/welcome", { data: { adult: true } })).status()).toBe(400);
  expect((await page.request.post("/api/account/welcome", { data: { adult: true, terms: true } })).status()).toBe(200);
  expect((await page.request.get("/api/books")).status()).toBe(200);
});
