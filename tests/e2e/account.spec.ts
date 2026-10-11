import { expect, test } from "@playwright/test";
import { cleanupUsers, clerkApi, createUser, db, PNG, signIn } from "./helpers";

test.afterAll(cleanupUsers);

test("deleting the account removes every book, file and link, and signs out", async ({ page }) => {
  const user = await createUser();
  await signIn(page, user);
  const upload = await page.request.post("/api/uploads", { multipart: { file: { name: "ava.png", mimeType: "image/png", buffer: PNG } } });
  expect(upload.ok()).toBe(true);
  const { url: photo } = await upload.json();
  const created = await page.request.post("/api/books", { data: { starterId: "bedtime", hero: { name: "Ava", pronoun: "she", photo } } });
  const { id: bookId } = await created.json();
  expect((await page.request.post(`/api/books/${bookId}/share`, { data: { kind: "read" } })).ok()).toBe(true);
  expect((await db()`select count(*)::int as n from files where owner_id = ${user.id}`)[0].n).toBe(1);

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();
  const del = page.getByRole("button", { name: "Delete my account" });
  await expect(del).toBeDisabled();
  await page.locator("#delete-confirm").fill("DELETE");
  await del.click();

  await page.waitForURL(/\/\?deleted=1/);
  await expect(page.getByText("Your account and all of your books have been deleted.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

  expect((await db()`select count(*)::int as n from books where owner_id = ${user.id}`)[0].n).toBe(0);
  expect((await db()`select count(*)::int as n from files where owner_id = ${user.id}`)[0].n).toBe(0);
  expect((await db()`select count(*)::int as n from share_links where book_id = ${bookId}`)[0].n).toBe(0);
  expect((await db()`select count(*)::int as n from events where user_id = ${user.id}`)[0].n).toBe(0);
  await expect(clerkApi().users.getUser(user.id)).rejects.toThrow();
});

test("the delete endpoint insists on the typed confirmation", async ({ page }) => {
  const user = await createUser();
  await signIn(page, user);
  const r = await page.request.delete("/api/account", { data: { confirm: "yes" } });
  expect(r.status()).toBe(400);
  expect(await clerkApi().users.getUser(user.id)).toBeTruthy();
});
