import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { cleanupUsers, createUser, db, newVisitor, PNG, signIn } from "./helpers";

// One parent's whole journey from the PRD: starter → star your child → edit on two devices → share
// with family (hearts, notes, voice) → print checks → Keepsake unlock → printed order → delete.
// Runs against DEV_FAKE_PAYMENTS=1, so checkout succeeds instantly and the printer is simulated.

test.describe.configure({ mode: "serial" });

let ctx: BrowserContext;
let author: Page;
let user: { id: string; email: string };
let bookId = "";
let shareUrl = "";

const bookJson = async () => (await (await author.request.get(`/api/books/${bookId}`)).json()) as { book: any; version: number; keepsakeUnlocked: boolean };
const waitForSave = (page: Page) => page.waitForResponse((r) => r.url().endsWith(`/api/books/${bookId}`) && r.request().method() === "PUT" && r.ok());
const pageText = (page: Page) => page.getByTestId("page-text");
const openFamily = async (page: Page) => {
  await page.locator(".rail").getByRole("button", { name: /Family/ }).click();
  await expect(page.getByRole("heading", { name: "💌 Family" })).toBeVisible();
};

test.beforeAll(async ({ browser }) => {
  user = await createUser();
  ctx = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", viewport: { width: 1280, height: 800 } });
  author = await ctx.newPage();
  await signIn(author, user);
});

test.afterAll(async () => {
  await ctx?.close();
  await cleanupUsers();
});

test("start from a story starter and star your child", async () => {
  await author.goto("/new");
  await author.getByRole("button", { name: /Your child's Big Birthday/ }).click();
  await expect(author.getByRole("heading", { name: "Who is the star of this story?" })).toBeVisible();
  await author.locator("#hero-name").fill("Maya");
  await author.getByRole("button", { name: "she / her" }).click();
  await author.locator('input[type="file"]').setInputFiles({ name: "maya.png", mimeType: "image/png", buffer: PNG });
  await expect(author.locator(".photo-thumb")).toBeVisible();
  await author.getByRole("button", { name: "Make my book" }).click();

  await author.waitForURL(/\/editor\/[\w-]+$/);
  bookId = new URL(author.url()).pathname.split("/").pop()!;
  await expect(author.getByLabel("Book title")).toHaveValue("Maya's Big Birthday");
  await expect(author.locator(".page-thumb")).toHaveCount(24); // done when: no page added by hand
  await expect(author.locator(".save-pill")).toHaveText("Saved");

  const [created] = await db()`select props from events where name = 'book_created' and book_id = ${bookId}`;
  expect(created.props.starter).toBe("birthday");
});

test("autosaves and opens on a phone with every page intact", async ({ browser }) => {
  const saved = waitForSave(author);
  await author.getByLabel("Book title").fill("Maya's Birthday Book");
  await saved;
  await expect(author.locator(".save-pill")).toHaveText("Saved");

  const phone = await newVisitor(browser);
  await signIn(phone.page, user);
  await phone.page.goto(`/editor/${bookId}`);
  await expect(phone.page.locator(".editor.mobile")).toBeVisible();
  await expect(phone.page.getByLabel("Book title")).toHaveValue("Maya's Birthday Book");
  await expect(phone.page.locator(".page-thumb")).toHaveCount(24);

  // Both devices edit: the later save wins and the other device is told to reload.
  const phoneSaved = phone.page.waitForResponse((r) => r.url().endsWith(`/api/books/${bookId}`) && r.request().method() === "PUT" && r.ok());
  await phone.page.getByLabel("Book title").fill("Maya's Big Day");
  await phoneSaved;
  await author.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(author.getByRole("alert").filter({ hasText: "changed on another device" })).toBeVisible();
  await author.getByRole("button", { name: "Load the latest version" }).click();
  await expect(author.getByLabel("Book title")).toHaveValue("Maya's Big Day");
  await phone.ctx.close();

  const [finished] = await db()`select count(*)::int as n from events where name = 'book_finished' and book_id = ${bookId}`;
  expect(finished.n).toBe(1);
});

test("changing the hero updates every page in one undoable step", async () => {
  await author.getByTitle("Star your child").click();
  await author.locator("#hero-name").fill("Leo");
  await author.getByRole("button", { name: "he / him" }).click();
  await author.getByRole("button", { name: "Update every page" }).click();

  await author.getByRole("button", { name: "Read it" }).click();
  await expect(pageText(author)).toContainText("Leo's Big Birthday");
  const next = author.getByRole("button", { name: "Next ›" });
  await next.click();
  await expect(pageText(author)).toContainText("Happy birthday, Leo!");
  await next.click();
  await next.click();
  await expect(pageText(author)).toContainText("Today was his birthday!"); // pronouns follow the hero
  await author.keyboard.press("Escape");

  await author.getByRole("button", { name: "Undo" }).click();
  await author.getByRole("button", { name: "Read it" }).click();
  await expect(pageText(author)).toContainText("Maya's Big Birthday");
  await author.keyboard.press("Escape");
  const saved = waitForSave(author);
  await author.getByRole("button", { name: "Redo" }).click();
  await saved;
  expect((await bookJson()).book.hero).toMatchObject({ name: "Leo", pronoun: "he" });
});

test("family share link: read on a phone with no account, hearts, notes and reports", async ({ browser }) => {
  await openFamily(author);
  const card = author.locator(".link-card").filter({ hasText: "Share to read" });
  await card.getByRole("button", { name: "Create link" }).click();
  shareUrl = await card.locator("input").inputValue();
  expect(shareUrl).toMatch(/\/read\/[\w-]{22}$/);

  const visitor = await newVisitor(browser);
  await visitor.page.goto(shareUrl);
  await expect(pageText(visitor.page)).toContainText("Leo's Big Birthday");
  await expect(visitor.page.getByRole("button", { name: /Read to me/ })).toBeVisible();
  await visitor.page.getByRole("button", { name: "Send a heart" }).click();
  await expect(visitor.page.getByRole("button", { name: "Send a heart" })).toContainText("1");
  await visitor.page.getByRole("button", { name: /Leave a note/ }).click();
  await visitor.page.locator("#reader-name").fill("Grandma");
  await visitor.page.locator("#reader-note").fill("We love it!");
  await visitor.page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(visitor.page.getByText("Your note was sent to the author.")).toBeVisible();

  await visitor.page.getByRole("button", { name: "Report" }).click();
  await visitor.page.getByLabel("Spam").check();
  await visitor.page.getByRole("button", { name: "Send report" }).click();
  await expect(visitor.page.getByRole("heading", { name: "Thank you" })).toBeVisible();
  await visitor.ctx.close();

  const [report] = await db()`select reason, reporter from reports where book_id = ${bookId}`;
  expect(report).toMatchObject({ reason: "Spam", reporter: "viewer" });
  const [opened] = await db()`select count(*)::int as n from events where name = 'share_opened' and book_id = ${bookId}`;
  expect(opened.n).toBe(1);

  // The author sees the note in the editor and can remove it.
  await author.reload();
  await openFamily(author);
  const note = author.locator(".notes li").filter({ hasText: "We love it!" });
  await expect(note).toContainText("Grandma");
  await note.getByRole("button", { name: "Remove" }).click();
  await note.getByRole("button", { name: "Remove" }).click();
  await expect(author.locator(".notes li").filter({ hasText: "We love it!" })).toHaveCount(0);
});

test("a grandparent records narration from a phone through an invite link", async ({ browser }) => {
  const card = author.locator(".link-card").filter({ hasText: "Invite someone to record" });
  await card.getByRole("button", { name: "Create link" }).click();
  const recordUrl = await card.locator("input").inputValue();

  const grandpa = await newVisitor(browser);
  await grandpa.ctx.grantPermissions(["microphone"]);
  await grandpa.page.goto(recordUrl);
  await expect(grandpa.page.getByRole("heading", { name: /Read “Maya's Big Day” aloud/ })).toBeVisible();
  await grandpa.page.locator("#recorder-name").fill("Grandpa Joe");
  await grandpa.page.getByRole("button", { name: /Record this page/ }).click();
  await expect(grandpa.page.getByText(/Recording…/)).toBeVisible();
  await grandpa.page.waitForTimeout(1500);
  await grandpa.page.getByRole("button", { name: /Stop/ }).click();
  await grandpa.page.getByRole("button", { name: "Save recording" }).click();
  await expect(grandpa.page.getByText("1 of 24 pages recorded")).toBeVisible();
  await grandpa.ctx.close();

  // It plays on the share link.
  const reader = await newVisitor(browser);
  await reader.page.goto(shareUrl);
  await expect(reader.page.getByRole("button", { name: "▶ Hear Grandpa Joe" })).toBeVisible();
  await reader.ctx.close();
});

test("turning a share link off stops it working immediately", async ({ browser }) => {
  const card = author.locator(".link-card").filter({ hasText: "Share to read" });
  await card.getByRole("button", { name: "Turn off" }).click();
  await card.getByRole("button", { name: "Turn off now" }).click();
  await expect(card.getByRole("button", { name: "Create link" })).toBeVisible();
  const visitor = await newVisitor(browser);
  await visitor.page.goto(shareUrl);
  await expect(visitor.page.getByText("This link has been turned off or doesn't exist.")).toBeVisible();
  await visitor.ctx.close();
});

test("print guardrails: text over the trim line can't be ordered until moved or accepted", async () => {
  // Push a line of story text off the edge of page 3.
  await author.goto("/dashboard");
  const { book, version } = await bookJson();
  const text = book.pages[3].elements.find((e: { type: string }) => e.type === "text");
  text.x = -40;
  expect((await author.request.put(`/api/books/${bookId}`, { data: { book, baseVersion: version } })).ok()).toBe(true);

  await author.goto(`/editor/${bookId}`);
  const chip = author.locator(".check-chip");
  await expect(chip).toContainText("to check");
  await chip.click();
  await expect(author.locator(".issue.warn").filter({ hasText: "outside the safe area" })).toBeVisible();
  await expect(author.locator(".issue").filter({ hasText: "dpi" })).toBeVisible(); // the 1×1 px dedication photo

  await author.getByRole("button", { name: "Order a printed copy" }).click();
  await fillAddress(author);
  await author.getByRole("button", { name: "See total" }).click();
  await expect(author.locator(".quote")).toContainText("$34.99");
  await expect(author.getByRole("button", { name: /^Pay / })).toBeDisabled();
  await expect(author.getByText("Finish the print check on the previous screen before paying.")).toBeVisible();

  await author.getByRole("button", { name: "Back", exact: true }).click();
  for (const box of await author.locator(".issue.warn .accept input").all()) await box.check();
  await expect(author.locator(".issue.warn .accept input:not(:checked)")).toHaveCount(0);
});

test("Keepsake unlock: pay $6 and the same book exports print-ready with no watermark", async () => {
  test.setTimeout(180_000);
  await expect(author.getByText("Free plan downloads are screen quality with a small watermark.")).toBeVisible();
  await author.getByRole("button", { name: "Unlock this book: $6" }).click();
  await author.waitForURL(new RegExp(`/editor/${bookId}`));
  await expect(author.getByText("Unlocked! This book now exports print-ready with no watermark.")).toBeVisible();
  expect((await bookJson()).keepsakeUnlocked).toBe(true);

  await author.getByRole("button", { name: "Print & publish" }).click();
  for (const box of await author.locator(".issue.warn .accept input").all()) await box.check();
  const started = Date.now();
  const download = author.waitForEvent("download", { timeout: 150_000 });
  await author.getByRole("button", { name: /Print-ready interior PDF/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/-interior\.pdf$/);
  const bytes = (await import("node:fs")).statSync(await file.path()).size;
  expect(bytes).toBeGreaterThan(100_000);
  const summary = `24-page 300 dpi PDF in ${((Date.now() - started) / 1000).toFixed(1)} s, ${(bytes / 1e6).toFixed(1)} MB`;
  test.info().annotations.push({ type: "export", description: summary });
  console.log(`Keepsake export: ${summary}`);
});

test("order a printed hardcover and follow it to delivery", async () => {
  test.setTimeout(240_000);
  await author.getByRole("button", { name: "Order a printed copy" }).click();
  await fillAddress(author);
  await author.getByRole("button", { name: "See total" }).click();
  const pay = author.getByRole("button", { name: /^Pay \$/ });
  await expect(pay).toBeEnabled();
  await pay.click();
  await author.waitForURL(/\/orders\?placed=ord_/, { timeout: 200_000 });

  const order = author.locator(".order.fresh");
  await expect(order).toContainText("1 × Hardcover");
  await expect(order.locator(".status-pill")).toHaveText("Paid");
  await expect(order).toContainText("Printing is not connected yet"); // no Lulu keys locally
  const orderId = new URL(author.url()).searchParams.get("placed")!;
  const [row] = await db()`select interior_key, cover_key, page_count from orders where id = ${orderId}`;
  expect(row.page_count).toBe(24);
  expect((await db()`select count(*)::int as n from files where key in ${db()([row.interior_key, row.cover_key])}`)[0].n).toBe(2);

  await order.getByRole("button", { name: "in production" }).click();
  await expect(order.locator(".status-pill")).toHaveText("Printing");
  await order.getByRole("button", { name: "shipped" }).click();
  await expect(order.locator(".status-pill")).toHaveText("Shipped");
  await expect(order.getByRole("link", { name: "Track package" })).toBeVisible();
  // Print files are deleted once the book has shipped.
  expect((await db()`select count(*)::int as n from files where key in ${db()([row.interior_key, row.cover_key])}`)[0].n).toBe(0);
  const [paid] = await db()`select count(*)::int as n from events where name = 'order_paid' and book_id = ${bookId}`;
  expect(paid.n).toBe(1);
});

test("deleting the book removes its photo, recordings and links but keeps the order record", async () => {
  const { book } = await bookJson();
  const photoKey = String(book.hero.photo).replace("/api/media/", "");
  const [rec] = await db()`select file_key from recordings where book_id = ${bookId}`;
  expect(rec).toBeTruthy();

  await author.goto("/dashboard");
  const card = author.locator(".book-card").filter({ hasText: "Maya's Big Day" });
  await card.getByRole("button", { name: /^Delete/ }).click();
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(author.locator(".book-card").filter({ hasText: "Maya's Big Day" })).toHaveCount(0);

  expect((await author.request.get(`/api/books/${bookId}`)).status()).toBe(404);
  expect((await db()`select count(*)::int as n from files where key in ${db()([photoKey, rec.file_key])}`)[0].n).toBe(0);
  expect((await db()`select count(*)::int as n from share_links where book_id = ${bookId}`)[0].n).toBe(0);
  const orders = await db()`select book_id from orders where owner_id = ${user.id}`;
  expect(orders).toHaveLength(1);
  expect(orders[0].book_id).toBeNull();
});

async function fillAddress(page: Page) {
  await page.getByLabel("Full name").fill("Leo Park");
  await page.getByLabel("Street address").fill("123 Story Lane");
  await page.getByLabel("City").fill("Seattle");
  await page.getByLabel("State").fill("WA");
  await page.getByLabel("ZIP code").fill("98101");
  await page.getByLabel("Phone for delivery").fill("206 555 0100");
}
