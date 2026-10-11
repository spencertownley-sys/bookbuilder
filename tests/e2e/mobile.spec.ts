import { expect, test, type Page } from "@playwright/test";
import { cleanupUsers, createUser, phone, signIn } from "./helpers";

// Mobile pass: grandparents finish books and open share links on phones.
test.use(phone);
test.afterAll(cleanupUsers);

const noSideScroll = async (page: Page) => {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  expect(sw, `page is ${sw}px wide in a ${w}px window`).toBeLessThanOrEqual(w);
};

for (const path of ["/", "/pricing", "/terms", "/privacy", "/content-policy", "/sign-up"]) {
  test(`${path} fits a phone screen`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("load");
    if (path === "/sign-up") await page.locator("#emailAddress-field").waitFor();
    await noSideScroll(page);
    await page.screenshot({ path: test.info().outputPath("page.png"), fullPage: true });
  });
}

test("the whole app works at phone size: start flow, editor sheets, print dialog, account", async ({ page }) => {
  const user = await createUser();
  await signIn(page, user);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "My bookshelf" })).toBeVisible();
  await noSideScroll(page);

  await page.goto("/new");
  await page.getByRole("button", { name: /Grandparents|Love That Travels/ }).click();
  await page.locator("#hero-name").fill("Noor");
  await noSideScroll(page);
  await page.getByRole("button", { name: "Make my book" }).click();
  await page.waitForURL(/\/editor\//);

  await expect(page.locator(".editor.mobile")).toBeVisible();
  await page.locator(".rail").getByRole("button", { name: /Scenes/ }).click();
  await expect(page.locator(".panel")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("editor-sheet.png") });
  await page.locator(".sheet-grab").click();
  await expect(page.locator(".panel")).toHaveCount(0);

  await page.getByRole("button", { name: "Print", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Print & publish" })).toBeVisible();
  const box = await page.locator(".modal").boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: test.info().outputPath("print-dialog.png") });
  await page.getByRole("button", { name: "Close" }).click();

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible();
  await noSideScroll(page);
});
